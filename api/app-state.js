// Generic cloud-sync endpoint behind the normal cookie middleware (row_session).
// Replaces direct browser-to-Supabase access: the client never sees a
// Supabase key anymore, this route holds the service_role key server-side
// (bypasses RLS by design) so the app_state table itself can stay fully
// locked down against the anon/publishable key.
//
// GET  /api/app-state?key=<appKey>          -> { data }
// POST /api/app-state  { key, data }        -> { ok: true }

export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return res.status(500).json({ error: 'server not configured' });

  if (req.method === 'GET') {
    const key = req.query && req.query.key;
    if (!key || typeof key !== 'string') return res.status(400).json({ error: 'key required' });
    try {
      const r = await fetch(
        url + '/rest/v1/app_state?key=eq.' + encodeURIComponent(key) + '&select=data',
        { headers: { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey } }
      );
      const rows = await r.json();
      const data = (Array.isArray(rows) && rows[0] && rows[0].data) || {};
      return res.status(200).json({ data });
    } catch (e) {
      return res.status(500).json({ error: 'fetch failed: ' + (e.message || String(e)) });
    }
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const key = body && body.key;
    const data = body && body.data;
    if (!key || typeof key !== 'string') return res.status(400).json({ error: 'key required' });
    if (!data || typeof data !== 'object') return res.status(400).json({ error: 'data required' });
    try {
      const r = await fetch(url + '/rest/v1/app_state?on_conflict=key', {
        method: 'POST',
        headers: {
          apikey: serviceKey, Authorization: 'Bearer ' + serviceKey,
          'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({ key, data, updated_at: new Date().toISOString() }),
      });
      if (!r.ok) return res.status(500).json({ error: 'upsert failed: ' + (await r.text()) });
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: 'upsert failed: ' + (e.message || String(e)) });
    }
  }

  return res.status(405).json({ error: 'method not allowed' });
}
