// Hit by Vercel Cron (see vercel.json) — 6 entries a day (2 per reminder
// slot, covering both the CET and CEST UTC offset for Europe/Zurich).
// Vercel authenticates cron requests automatically via
// `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set, and may
// invoke a Hobby-plan cron entry anywhere within its target hour — so this
// endpoint re-derives the *actual* current Zurich wall-clock time itself
// and only sends when it truly matches a slot, once per day per slot.
import webpush from 'web-push';

const SUPABASE_URL = 'https://pwklhcijhzlsggwrpcfn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JOCItyLAFHHpUM5ogSX2vw_miQ9_ig9';
const APP_STATE_KEY = 'push';

const SLOTS = {
  morning: { hour: 7, title: 'Morgenroutine', body: 'Zeit zum Beten 🙏\nTrink dein Wasser 💧\nJeden Tag ein Punkt besser.' },
  focus:   { hour: 15, title: 'Fokus', body: 'Locked in 🔒' },
  evening: { hour: 21, title: 'Abendroutine', body: 'Zeit zum Beten 🙏' },
};

function zurichNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zurich',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) };
}

export default async function handler(req, res) {
  // Vercel Cron invokes this path with a GET request (confirmed via Vercel docs).
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });

  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || '';
  if (!secret || auth !== 'Bearer ' + secret) return res.status(401).json({ error: 'unauthorized' });

  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  if (!vapidPublic || !vapidPrivate || !vapidSubject) return res.status(500).json({ error: 'server not configured' });
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const { date: today, hour } = zurichNow();
  const dueSlot = Object.keys(SLOTS).find((k) => SLOTS[k].hour === hour);
  if (!dueSlot) return res.status(200).json({ ok: true, skipped: 'no slot for hour ' + hour });

  try {
    const getRes = await fetch(
      SUPABASE_URL + '/rest/v1/app_state?key=eq.' + APP_STATE_KEY + '&select=data',
      { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } }
    );
    const rows = await getRes.json();
    const current = (rows && rows[0] && rows[0].data) || {};
    const subs = Array.isArray(current.subscriptions) ? current.subscriptions : [];
    const lastSent = current.lastSent || {};

    if (lastSent[dueSlot] === today) {
      return res.status(200).json({ ok: true, skipped: 'already sent today for ' + dueSlot });
    }
    if (!subs.length) {
      return res.status(200).json({ ok: true, skipped: 'no subscriptions' });
    }

    const payload = JSON.stringify({ title: SLOTS[dueSlot].title, body: SLOTS[dueSlot].body, tag: dueSlot });
    const results = await Promise.allSettled(subs.map((s) => webpush.sendNotification(s, payload)));

    const dead = new Set();
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        const code = r.reason && r.reason.statusCode;
        if (code === 404 || code === 410) dead.add(subs[i].endpoint);
      }
    });
    const survivors = subs.filter((s) => !dead.has(s.endpoint));

    const merged = Object.assign({}, current, {
      subscriptions: survivors,
      lastSent: Object.assign({}, lastSent, { [dueSlot]: today }),
    });
    await fetch(SUPABASE_URL + '/rest/v1/app_state?on_conflict=key', {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ key: APP_STATE_KEY, data: merged, updated_at: new Date().toISOString() }),
    });

    return res.status(200).json({
      ok: true, slot: dueSlot, sent: results.length - dead.size, pruned: dead.size,
    });
  } catch (e) {
    return res.status(500).json({ error: 'unexpected: ' + (e.message || String(e)) });
  }
}
