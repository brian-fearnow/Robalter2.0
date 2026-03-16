import type { IncomingMessage, ServerResponse } from 'node:http';
import { URL } from 'node:url';

const GHIN_API = 'https://api2.ghin.com/api/v1';

interface GhinHole {
  Number: number;
  Par: number;
  Allocation: number;
}

interface GhinRating {
  RatingType: string;
  CourseRating: number;
  SlopeRating: number;
}

interface GhinTeeSet {
  TeeSetRatingId: number;
  TeeSetRatingName: string;
  Gender: string;
  HolesNumber: number;
  TotalPar: number;
  StrokeAllocation: boolean;
  Ratings: GhinRating[];
  Holes: GhinHole[];
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const params = new URL(`http://localhost${req.url ?? ''}`).searchParams;
  const token = params.get('token') ?? '';
  const courseId = params.get('courseId') ?? '';

  if (!token || !courseId) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'token and courseId are required' }));
    return;
  }

  try {
    const detailRes = await fetch(`${GHIN_API}/courses/${courseId}.json`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
    });

    if (detailRes.status === 401) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'token_expired' }));
      return;
    }

    if (!detailRes.ok) {
      res.statusCode = detailRes.status;
      res.end(JSON.stringify({ error: 'Course not found' }));
      return;
    }

    const data = await detailRes.json() as {
      CourseName: string;
      CourseId: number;
      TeeSets?: GhinTeeSet[];
    };

    // Keep only 18-hole tee sets with stroke allocation data
    const teeSets = (data.TeeSets ?? []).filter(
      ts => ts.HolesNumber === 18 && ts.StrokeAllocation && ts.Holes?.length === 18
    );

    // Build our Course shape
    const tees = teeSets
      .filter(ts => ts.Gender === 'Male') // prefer men's tees; include all if none found
      .concat(teeSets.filter(ts => ts.Gender !== 'Male'))
      // deduplicate by tee name
      .filter((ts, idx, arr) => arr.findIndex(t => t.TeeSetRatingName === ts.TeeSetRatingName) === idx)
      .map(ts => {
        const totalRating = ts.Ratings.find(r => r.RatingType === 'Total') ?? ts.Ratings[0];
        return {
          name: ts.TeeSetRatingName.replace(/ Tees?$/i, ''), // "Black Tees" → "Black"
          rating: totalRating?.CourseRating ?? 72.0,
          slope: totalRating?.SlopeRating ?? 113,
        };
      });

    // Use the first tee set's holes (all 18-hole tee sets share the same par/allocation)
    const firstTeeSet = teeSets[0];
    const holes = (firstTeeSet?.Holes ?? [])
      .sort((a, b) => a.Number - b.Number)
      .map(h => ({
        number: h.Number,
        par: h.Par,
        handicap: h.Allocation,
      }));

    res.statusCode = 200;
    res.end(JSON.stringify({
      course: {
        name: data.CourseName,
        tees,
        holes,
      },
    }));
  } catch {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Failed to connect to GHIN' }));
  }
}
