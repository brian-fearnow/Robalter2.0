import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

const GHIN_API = 'https://api2.ghin.com/api/v1';

const GHIN_PUBLIC_KEY = `-----BEGIN RSA PUBLIC KEY-----
MIICCgKCAgEA4bj0vrhe3nejC07r9jYt9ieLM1QoqnmgkRcKOJAkCve/PWK/8+SX
uQumFYAnSvuBhicYwyARGJY8NzIHSMVQU3eOn6HpnVY6f2uWaMnH3OwEYHSV6fXt
2e/vy4eY/Lf8qhaQ0Jlnntluycvk4UtNdpf/3zM1hv3G0mt0ckVnzjqpUmSZ7SEn
Tec6lVBnLnQ9NWH2iswaCB5Szr4E6tRu+dN7U2juixaHYC9STLBUTd3VhCbBZrtT
v+w/ZOo+NZ4mGAf7RMAUNiO0dVQyGLU/MyzUAwOXQQUMp7iqTYoEP6laFojapNkP
P6sETHRWwJStr/O5tEPZGrnzqttjK3ImyHKnXXVoPtB3GthxLJ4m+hglGxw5WeaK
WhGX1AR0nVDTBppRqv5+hbfzSIDmlfFkt23nj4fZ5A75uZ/O+Ivs8xMoIoqws1jT
eDQ8xDSgqyb3D6R/DH6P7yodYF/xwhGPBbenFxyBGPPvXjNODwHMNFMcbrvsj2YS
9Rcf/OrkDCLxWnXevMU+sS3wY8cH6q7u4HIKCyOgaE+Fm++CaSuHp5OfjQnoaLJt
YV+1IB3l2XE6T8BEQL19Ov9JCeuvfvpamvV/MUOuIKexIBGqiYpc6kLWTpd25Kmj
YsplwBjsy1Vogbc3S4G8H8Ixd1ap0vxTqYNmTLLGHlL7d64xbKUU1YsCAwEAAQ==
-----END RSA PUBLIC KEY-----`;

function generateGhinToken(): string {
  const payload = JSON.stringify({ source: 'GHINcom', datetime: new Date().toISOString() });
  const publicKey = crypto.createPublicKey({ key: GHIN_PUBLIC_KEY, format: 'pem', type: 'pkcs1' });
  const encrypted = crypto.publicEncrypt(
    { key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(payload)
  );
  return encrypted.toString('base64');
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let email: string, password: string;
  try {
    const raw = await readBody(req);
    const body = JSON.parse(raw) as { email?: string; password?: string };
    email = body.email?.trim() ?? '';
    password = body.password ?? '';
  } catch {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'Invalid request body' }));
    return;
  }

  if (!email || !password) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'Email and password are required' }));
    return;
  }

  try {
    const ghinToken = generateGhinToken();
    const loginRes = await fetch(`${GHIN_API}/golfer_login.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        user: { email_or_ghin: email, password, remember_me: true },
        token: ghinToken,
      }),
    });

    const data = await loginRes.json() as {
      golfer_user?: {
        golfer_user_token?: string;
        golfers?: Array<{ first_name?: string; last_name?: string }>;
      };
      errors?: Record<string, string[]>;
      error?: string;
    };

    if (!loginRes.ok || !data.golfer_user?.golfer_user_token) {
      const msg = data.errors ? Object.values(data.errors).flat().join(', ') : (data.error ?? 'Login failed');
      res.statusCode = 401;
      res.end(JSON.stringify({ error: msg }));
      return;
    }

    const golfer = data.golfer_user.golfers?.[0];
    res.statusCode = 200;
    res.end(JSON.stringify({
      token: data.golfer_user.golfer_user_token,
      firstName: golfer?.first_name ?? '',
      lastName: golfer?.last_name ?? '',
    }));
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Failed to connect to GHIN' }));
  }
}
