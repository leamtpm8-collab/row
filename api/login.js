import crypto from 'crypto';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const PBKDF2_ITERATIONS = 210000;

// Simple in-memory lockout: module scope survives across warm invocations
// of the same serverless instance (not guaranteed across cold starts or
// multiple concurrent instances, but a real deterrent for a private,
// single-user app fronting this as the only unauthenticated endpoint).
const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map();

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  return req.socket && req.socket.remoteAddress || 'unknown';
}

function isLocked(ip) {
  const rec = attempts.get(ip);
  if (!rec) return false;
  if (Date.now() > rec.resetAt) { attempts.delete(ip); return false; }
  return rec.count >= MAX_ATTEMPTS;
}

function recordFailure(ip) {
  const rec = attempts.get(ip);
  if (!rec || Date.now() > rec.resetAt) {
    attempts.set(ip, { count: 1, resetAt: Date.now() + LOCKOUT_WINDOW_MS });
  } else {
    rec.count += 1;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const ip = clientIp(req);
  if (isLocked(ip)) {
    return res.status(429).json({ error: 'too many attempts, try again later' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const password = body && body.password;
  const remember = !!(body && body.remember);
  if (typeof password !== 'string' || !password) {
    recordFailure(ip);
    return res.status(401).json({ error: 'invalid credentials' });
  }

  const storedHash = process.env.AUTH_PASSWORD_HASH;
  const secret = process.env.AUTH_SECRET;
  if (!storedHash || !secret) {
    return res.status(500).json({ error: 'server not configured' });
  }

  if (!verifyPassword(password, storedHash)) {
    recordFailure(ip);
    return res.status(401).json({ error: 'invalid credentials' });
  }

  attempts.delete(ip);
  const exp = Date.now() + ONE_YEAR_MS;
  const token = sign(JSON.stringify({ exp }), secret);

  const cookieParts = [`row_session=${token}`, 'Path=/', 'HttpOnly', 'Secure', 'SameSite=Lax'];
  if (remember) cookieParts.push(`Max-Age=${Math.floor(ONE_YEAR_MS / 1000)}`);
  res.setHeader('Set-Cookie', cookieParts.join('; '));
  return res.status(200).json({ ok: true });
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
