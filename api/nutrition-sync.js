// Serverless endpoint for an external automation (e.g. an iPhone Shortcut
// reading Apple Health) to push a day's nutrition totals into the same
// Supabase row nutrition.html syncs through. Auth is a shared secret header
// instead of the row_session cookie, since this is called without a browser.
//
// POST /api/nutrition-sync
// Headers: Authorization: Bearer <NUTRITION_SYNC_SECRET>
// Body: { "date": "YYYY-MM-DD", "kcal": 2200, "protein": 150, "carbs": 220, "fat": 70 }

const APP_STATE_KEY = 'nutrition';
const NUT_KEY = 'nutrition_v1';
const APPLE_HEALTH_ENTRY_ID = 'apple-health-sync';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const secret = process.env.NUTRITION_SYNC_SECRET;
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

  const kcal = Number(body.kcal) || 0;
  const protein = Number(body.protein) || 0;
  const carbs = Number(body.carbs) || 0;
  const fat = Number(body.fat) || 0;

  try {
    const getRes = await fetch(
      SUPABASE_URL + '/rest/v1/app_state?key=eq.' + APP_STATE_KEY + '&select=data',
      { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } }
    );
    const rows = await getRes.json();
    const current = (rows && rows[0] && rows[0].data) || {};
    const nutrition = current[NUT_KEY] && typeof current[NUT_KEY] === 'object'
      ? current[NUT_KEY]
      : { goal: { kcal: 2200, protein: 150, carbs: 220, fat: 70 }, logs: {} };
    if (!nutrition.logs) nutrition.logs = {};
    if (!nutrition.logs[date]) nutrition.logs[date] = [];

    // Replace any prior Apple Health entry for this date so re-syncs don't double-count.
    nutrition.logs[date] = nutrition.logs[date].filter((e) => e.id !== APPLE_HEALTH_ENTRY_ID);
    nutrition.logs[date].push({
      id: APPLE_HEALTH_ENTRY_ID, name: 'Apple Health', meal: 'Sync',
      kcal, protein, carbs, fat,
      time: new Date().toISOString().slice(11, 16), source: 'apple-health',
    });

    const merged = Object.assign({}, current, { [NUT_KEY]: nutrition });
    const putRes = await fetch(SUPABASE_URL + '/rest/v1/app_state?on_conflict=key', {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ key: APP_STATE_KEY, data: merged, updated_at: new Date().toISOString() }),
    });
    if (!putRes.ok) return res.status(500).json({ error: 'upsert failed: ' + (await putRes.text()) });

    return res.status(200).json({ ok: true, date, kcal, protein, carbs, fat });
  } catch (e) {
    return res.status(500).json({ error: 'unexpected: ' + (e.message || String(e)) });
  }
}
