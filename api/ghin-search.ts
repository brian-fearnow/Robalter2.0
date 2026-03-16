import type { IncomingMessage, ServerResponse } from 'node:http';
import { URL } from 'node:url';

const GHIN_API = 'https://api2.ghin.com/api/v1';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const base = `http://localhost${req.url ?? ''}`;
  const params = new URL(base).searchParams;
  const token = params.get('token') ?? '';
  const firstName = params.get('firstName') ?? '';
  const lastName = params.get('lastName') ?? '';
  const state = params.get('state') ?? '';
  const page = params.get('page') ?? '1';

  if (!token || !lastName) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'token and lastName are required' }));
    return;
  }

  try {
    const qs = new URLSearchParams({
      last_name: lastName,
      first_name: firstName,
      page,
      per_page: '20',
    });
    if (state) qs.set('state', state);

    const searchRes = await fetch(`${GHIN_API}/golfers/search.json?${qs.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (searchRes.status === 401) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'token_expired' }));
      return;
    }

    const data = await searchRes.json() as {
      golfers?: Array<{
        first_name: string;
        last_name: string;
        ghin: string;
        handicap_index: string;
        club_name: string;
        state: string;
        status: string;
        association_name?: string;
      }>;
      error?: string;
    };

    if (data.error) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: data.error }));
      return;
    }

    // Only return Active golfers with a handicap index
    const golfers = (data.golfers ?? []).filter(g => g.status === 'Active' && g.handicap_index);

    res.statusCode = 200;
    res.end(JSON.stringify({ golfers }));
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Failed to connect to GHIN' }));
  }
}
