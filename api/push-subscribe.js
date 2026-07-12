// Called from inside the logged-in app (behind the normal cookie middleware)
// after the browser creates a PushSubscription. Stores it in the shared
// Supabase app_state row so api/push-send.js can find it later.

const APP_STATE_KEY = 'push';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'server not configured' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const sub = body && body.subscription;
  if (!sub || !sub.endpoint) return res.status(400).json({ error: 'subscription required' });

  try {
    const getRes = await fetch(
      SUPABASE_URL + '/rest/v1/app_state?key=eq.' + APP_STATE_KEY + '&select=data',
      { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } }
    );
    const rows = await getRes.json();
    const current = (rows && rows[0] && rows[0].data) || {};
    const subs = Array.isArray(current.subscriptions) ? current.subscriptions : [];
    const next = subs.filter((s) => s.endpoint !== sub.endpoint);
    next.push(sub);

    const merged = Object.assign({}, current, { subscriptions: next });
    const putRes = await fetch(SUPABASE_URL + '/rest/v1/app_state?on_conflict=key', {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ key: APP_STATE_KEY, data: merged, updated_at: new Date().toISOString() }),
    });
    if (!putRes.ok) return res.status(500).json({ error: 'upsert failed: ' + (await putRes.text()) });

    return res.status(200).json({ ok: true, count: next.length });
  } catch (e) {
    return res.status(500).json({ error: 'unexpected: ' + (e.message || String(e)) });
  }
}
