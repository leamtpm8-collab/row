import crypto from 'crypto';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const PBKDF2_ITERATIONS = 210000;

// Lockout: 3 failed attempts (email OR password wrong) permanently locks
// the offending IP — no time window, no self-service reset. Persisted in
// Supabase (app_state, key "login_security") via the service_role key so
// it survives cold starts, unlike a plain in-memory counter. Falls back
// to an in-memory-only counter (best-effort, resets on redeploy/cold
// start) if SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY aren't configured yet,
// so login itself never hard-depends on Supabase being set up.
//
// To clear a lock (e.g. you locked yourself out): in the Supabase SQL
// editor run  delete from app_state where key = 'login_security';
const MAX_ATTEMPTS = 3;
const SECURITY_STATE_KEY = 'login_security';
const MAX_LOG_ENTRIES = 200;
const memAttempts = new Map();

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

async function loadSecurityState() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const r = await fetch(url + '/rest/v1/app_state?key=eq.' + SECURITY_STATE_KEY + '&select=data', {
      headers: { apikey: key, Authorization: 'Bearer ' + key },
    });
    const rows = await r.json();
    const data = (Array.isArray(rows) && rows[0] && rows[0].data) || {};
    return { attempts: data.attempts || {}, log: Array.isArray(data.log) ? data.log : [] };
  } catch (e) { return null; }
}
async function saveSecurityState(state) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  try {
    await fetch(url + '/rest/v1/app_state?on_conflict=key', {
      method: 'POST',
      headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ key: SECURITY_STATE_KEY, data: state, updated_at: new Date().toISOString() }),
    });
  } catch (e) {}
}
function pushLog(state, entry) {
  state.log.push(entry);
  if (state.log.length > MAX_LOG_ENTRIES) state.log = state.log.slice(-MAX_LOG_ENTRIES);
}
function isLockedMem(ip) {
  const rec = memAttempts.get(ip);
  return !!(rec && rec.locked);
}
function recordFailureMem(ip) {
  const rec = memAttempts.get(ip) || { count: 0, locked: false };
  rec.count += 1;
  if (rec.count >= MAX_ATTEMPTS) rec.locked = true;
  memAttempts.set(ip, rec);
  return rec.locked;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const ip = clientIp(req);
  const state = await loadSecurityState();
  const usingSupabase = state !== null;
  const persisted = usingSupabase ? state : { attempts: {}, log: [] };
  const rec = persisted.attempts[ip] || { count: 0, locked: false };

  const locked = usingSupabase ? !!rec.locked : isLockedMem(ip);
  if (locked) {
    console.error('[login] blocked request from locked ip=' + ip);
    return res.status(403).json({ error: 'locked' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const email = typeof (body && body.email) === 'string' ? body.email.trim().toLowerCase() : '';
  const password = body && body.password;
  const remember = !!(body && body.remember);

  const expectedEmail = (process.env.AUTH_EMAIL || '').trim().toLowerCase();
  const storedHash = process.env.AUTH_PASSWORD_HASH;
  const secret = process.env.AUTH_SECRET;
  if (!expectedEmail || !storedHash || !secret) {
    return res.status(500).json({ error: 'server not configured' });
  }

  const emailOk = email.length > 0 && email === expectedEmail;
  const passwordOk = typeof password === 'string' && password.length > 0 && verifyPassword(password, storedHash);

  if (emailOk && passwordOk) {
    if (usingSupabase) {
      delete persisted.attempts[ip];
      pushLog(persisted, { ts: Date.now(), ip, event: 'success' });
      await saveSecurityState(persisted);
    } else {
      memAttempts.delete(ip);
    }
    console.log('[login] success ip=' + ip);

    const exp = Date.now() + ONE_YEAR_MS;
    const token = sign(JSON.stringify({ exp }), secret);
    const cookieParts = [`row_session=${token}`, 'Path=/', 'HttpOnly', 'Secure', 'SameSite=Lax'];
    if (remember) cookieParts.push(`Max-Age=${Math.floor(ONE_YEAR_MS / 1000)}`);
    res.setHeader('Set-Cookie', cookieParts.join('; '));
    return res.status(200).json({ ok: true });
  }

  // Wrong email and/or wrong password both produce the exact same
  // response — never reveal which part was wrong, or whether the email
  // even matched, only that the credentials were invalid.
  let nowLocked = false;
  if (usingSupabase) {
    rec.count = (rec.count || 0) + 1;
    if (rec.count >= MAX_ATTEMPTS) { rec.locked = true; nowLocked = true; }
    persisted.attempts[ip] = rec;
    pushLog(persisted, { ts: Date.now(), ip, event: nowLocked ? 'lockout' : 'fail', emailTried: email || null });
    await saveSecurityState(persisted);
  } else {
    nowLocked = recordFailureMem(ip);
  }
  console.error('[login] failed attempt ip=' + ip + (nowLocked ? ' -> now LOCKED (permanent)' : ''));
  return res.status(401).json({ error: 'invalid credentials' });
}

function verifyPassword(password, storedHash) {
  const sep = storedHash.indexOf(':');
  if (sep === -1) return false;
  const saltHex = storedHash.slice(0, sep);
  const expectedHex = storedHash.slice(sep + 1);
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(expectedHex, 'hex');
  const derived = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, expected.length || 32, 'sha256');
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

function sign(payloadStr, secretHex) {
  const payloadB64 = Buffer.from(payloadStr, 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', Buffer.from(secretHex, 'hex')).update(payloadB64).digest();
  return payloadB64 + '.' + sig.toString('base64url');
}
