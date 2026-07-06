// Vercel serverless function — exchanges a WHOOP OAuth authorization code
// (or a refresh token) for access/refresh tokens.
//
// WHOOP_CLIENT_SECRET must be set as a Vercel Environment Variable
// (Project Settings -> Environment Variables), never committed to the repo.
// WHOOP_CLIENT_ID and WHOOP_REDIRECT_URI can also be set there, or passed
// in from the client (client ID + redirect URI aren't secret).
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = req.body || {};
  const clientId = process.env.WHOOP_CLIENT_ID || body.client_id;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.status(500).json({ error: 'Server missing WHOOP_CLIENT_ID / WHOOP_CLIENT_SECRET env vars' });
    return;
  }

  const params = new URLSearchParams();
  params.set('client_id', clientId);
  params.set('client_secret', clientSecret);

  if (body.refresh_token) {
    params.set('grant_type', 'refresh_token');
    params.set('refresh_token', body.refresh_token);
  } else if (body.code) {
    params.set('grant_type', 'authorization_code');
    params.set('code', body.code);
    params.set('redirect_uri', body.redirect_uri || process.env.WHOOP_REDIRECT_URI || '');
  } else {
    res.status(400).json({ error: 'Missing code or refresh_token' });
    return;
  }

  try {
    const whoopRes = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await whoopRes.json();
    res.status(whoopRes.status).json(data);
  } catch (e) {
    res.status(500).json({ error: 'Token exchange failed', detail: String(e) });
  }
};
