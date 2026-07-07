// Gates every page/API route behind a signed `row_session` cookie.
// Unauthenticated requests are redirected to /login.html before any
// static file or function on the site is served.
import { next } from '@vercel/functions';

export const config = {
  matcher: ['/((?!login\\.html|api/login|api/logout|api/nutrition-sync|api/push-send|api/fitness-sync|tools/|icons/|manifest\\.json).*)'],
};

const EXEMPT_PATHS = new Set(['/login.html', '/api/login', '/api/logout', '/api/nutrition-sync', '/api/push-send', '/api/fitness-sync', '/manifest.json']);

export default async function middleware(request) {
  const { pathname } = new URL(request.url);

  if (EXEMPT_PATHS.has(pathname) || pathname.startsWith('/tools/') || pathname.startsWith('/icons/')) {
    return next();
  }

  const secret = process.env.AUTH_SECRET;
  const token = getCookie(request, 'row_session');

  if (secret && token && (await verifySession(token, secret))) {
    return next();
  }

  return Response.redirect(new URL('/login.html', request.url), 302);
}

function getCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

async function verifySession(token, secretHex) {
  try {
    const dot = token.indexOf('.');
    if (dot === -1) return false;
    const payloadB64 = token.slice(0, dot);
    const sigB64 = token.slice(dot + 1);

    const key = await crypto.subtle.importKey(
      'raw',
      hexToBytes(secretHex),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const ok = await crypto.subtle.verify(
      'HMAC',
      key,
      base64urlToBytes(sigB64),
      new TextEncoder().encode(payloadB64)
    );
    if (!ok) return false;

    const payload = JSON.parse(base64urlToString(payloadB64));
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

function base64urlToBytes(b64url) {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function base64urlToString(b64url) {
  return new TextDecoder().decode(base64urlToBytes(b64url));
}
