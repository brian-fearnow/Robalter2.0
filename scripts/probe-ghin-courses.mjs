/**
 * GHIN Course API Probe Script
 * Run: node scripts/probe-ghin-courses.mjs
 *
 * Authenticates with GHIN and probes likely course/scorecard endpoints,
 * printing the raw responses so we know what data is available.
 */

import crypto from 'node:crypto';

const GHIN_API = 'https://api2.ghin.com/api/v1';
const EMAIL    = 'brian.fearnow@gmail.com';
const PASSWORD = '3327fear';

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

function generateGhinToken() {
  const payload = JSON.stringify({ source: 'GHINcom', datetime: new Date().toISOString() });
  const publicKey = crypto.createPublicKey({ key: GHIN_PUBLIC_KEY, format: 'pem', type: 'pkcs1' });
  const encrypted = crypto.publicEncrypt(
    { key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(payload)
  );
  return encrypted.toString('base64');
}

async function login() {
  console.log('\n=== Step 1: Login ===');
  const res = await fetch(`${GHIN_API}/golfer_login.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user: { email_or_ghin: EMAIL, password: PASSWORD, remember_me: true },
      token: generateGhinToken(),
    }),
  });
  const data = await res.json();
  const token = data?.golfer_user?.golfer_user_token;
  if (!token) {
    console.error('Login failed:', JSON.stringify(data, null, 2));
    process.exit(1);
  }
  console.log('✓ Authenticated. Token:', token.slice(0, 20) + '…');
  return token;
}

async function probe(label, url, token) {
  console.log(`\n=== ${label} ===`);
  console.log('URL:', url);
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
    });
    console.log('Status:', res.status);
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      // Print a trimmed preview — first item of any array, first few keys of objects
      console.log(JSON.stringify(trimPreview(json), null, 2));
    } catch {
      console.log(text.slice(0, 500));
    }
  } catch (err) {
    console.log('Error:', err.message);
  }
}

/** Trim large arrays to first 1–2 items so output is readable */
function trimPreview(obj, depth = 0) {
  if (depth > 4) return '…';
  if (Array.isArray(obj)) return obj.slice(0, 2).map(v => trimPreview(v, depth + 1));
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).slice(0, 30).map(([k, v]) => [k, trimPreview(v, depth + 1)])
    );
  }
  return obj;
}

(async () => {
  const token = await login();

  // --- Course search with correct state format (US-XX) ---
  const searchTerm = 'Meadow Club';
  const state = 'US-CA';
  await probe(
    'Course search (name + US-state)',
    `${GHIN_API}/courses/search.json?name=${encodeURIComponent(searchTerm)}&state=${state}&per_page=10`,
    token
  );
  await probe(
    'Facilities search (name + US-state)',
    `${GHIN_API}/facilities/search.json?name=${encodeURIComponent(searchTerm)}&state=${state}&per_page=5`,
    token
  );

  // --- Full detail for a known course (from previous run) ---
  // courses/{id}.json showed TeeSets with Ratings and Holes — get FULL data now
  console.log('\n=== Full Course Detail (untruncated) ===');
  const COURSE_ID = '17997';
  const res = await fetch(`${GHIN_API}/courses/${COURSE_ID}.json`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
  });
  const full = await res.json();
  const firstTeeSet = full?.TeeSets?.[0];
  if (firstTeeSet) {
    console.log('First TeeSet:', JSON.stringify(firstTeeSet, null, 2));
  } else {
    console.log(JSON.stringify(full, null, 2));
  }

  console.log('\n=== Done ===');
})();
