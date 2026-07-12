// Serverless endpoint for an external automation (e.g. an iPhone Shortcut
// reading Apple Health) to push steps/VO2max into the same Supabase row
// fitness.html syncs through — WHOOP has neither metric in its API, so
// this is the only honest path to "automatic" for these two fields.
//
// POST /api/fitness-sync
// Headers: Authorization: Bearer <FITNESS_SYNC_SECRET>
// Body: { "date": "YYYY-MM-DD", "steps": 8500, "vo2max": 47.2 }
// (vo2max is optional — not every device estimates it)

const APP_STATE_KEY = 'fitness';
const STEPS_KEY = 'fitness_steps_today_v1';
const VO2MAX_KEY = 'fitness_vo2max_v1';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const secret = process.env.FITNESS_SYNC_SECRET;
  if (!secret) return res.status(500).json({ error: 'server not configured' });
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token !== secret) return res.status(401).json({ error: 'unauthorized' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'server not configured' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const date = body && body.date;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date (YYYY-MM-DD) required' });
  const steps = body.steps != null ? Number(body.steps) : null;
  const vo2max = body.vo2max != null ? Number(body.vo2max) : null;
  if (steps == null && vo2max == null) return res.status(400).json({ error: 'steps or vo2max required' });

  try {
    const getRes = await fetch(
      SUPABASE_URL + '/rest/v1/app_state?key=eq.' + APP_STATE_KEY + '&select=data',
      { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } }
    );
    const rows = await getRes.json();
    const current = (rows && rows[0] && rows[0].data) || {};

    const merged = Object.assign({}, current);
    if (steps != null) merged[STEPS_KEY] = { date, steps };
    if (vo2max != null) merged[VO2MAX_KEY] = { date, value: vo2max };

    const putRes = await fetch(SUPABASE_URL + '/rest/v1/app_state?on_conflict=key', {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ key: APP_STATE_KEY, data: merged, updated_at: new Date().toISOString() }),
    });
    if (!putRes.ok) return res.status(500).json({ error: 'upsert failed: ' + (await putRes.text()) });

    return res.status(200).json({ ok: true, date, steps, vo2max });
  } catch (e) {
    return res.status(500).json({ error: 'unexpected: ' + (e.message || String(e)) });
  }
}
