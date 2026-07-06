import crypto from 'crypto';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const PBKDF2_ITERATIONS = 210000;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const password = body && body.password;
  const remember = !!(body && body.remember);
  if (typeof password !== 'string' || !password) {
    return res.status(401).json({ error: 'invalid credentials' });
  }

  const storedHash = process.env.AUTH_PASSWORD_HASH;
  const secret = process.env.AUTH_SECRET;
  if (!storedHash || !secret) {
    return res.status(500).json({ error: 'server not configured' });
  }

  if (!verifyPassword(password, storedHash)) {
    return res.status(401).json({ error: 'invalid credentials' });
  }

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
