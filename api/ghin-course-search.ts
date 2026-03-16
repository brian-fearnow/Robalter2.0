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

  const params = new URL(`http://localhost${req.url ?? ''}`).searchParams;
  const token = params.get('token') ?? '';
  const name = params.get('name') ?? '';
  const state = params.get('state') ?? '';

  if (!token || !name) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'token and name are required' }));
    return;
  }

  try {
    const qs = new URLSearchParams({ name, per_page: '15' });
    if (state) qs.set('state', `US-${state}`);

    const searchRes = await fetch(`${GHIN_API}/courses/search.json?${qs.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
    });

    if (searchRes.status === 401) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'token_expired' }));
      return;
    }

    const data = await searchRes.json() as {
      courses?: Array<{
        CourseID: number;
        CourseName: string;
        FacilityName: string;
        City: string;
        State: string;
        CourseStatus: string;
      }>;
    };

    const courses = (data.courses ?? [])
      .filter(c => c.CourseStatus === 'Active')
      .map(c => ({
        id: c.CourseID,
        name: c.CourseName,
        facility: c.FacilityName,
        city: c.City,
        state: c.State.replace('US-', ''),
      }));

    res.statusCode = 200;
    res.end(JSON.stringify({ courses }));
  } catch {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Failed to connect to GHIN' }));
  }
}
