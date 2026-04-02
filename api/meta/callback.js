import supabaseAdmin from '../lib/supabase.js';

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).json({ error: 'Missing code or state parameter' });
  }

  // state contains the client_id
  const clientId = state;

  try {
    // Exchange the short-lived code for a short-lived token
    const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', META_APP_ID);
    tokenUrl.searchParams.set('client_secret', META_APP_SECRET);
    tokenUrl.searchParams.set('redirect_uri', `${APP_URL}/api/meta/callback`);
    tokenUrl.searchParams.set('code', code);

    const tokenResponse = await fetch(tokenUrl.toString());
    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return res.status(400).json({ error: tokenData.error.message });
    }

    const shortLivedToken = tokenData.access_token;

    // Exchange for a long-lived token
    const longLivedUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
    longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longLivedUrl.searchParams.set('client_id', META_APP_ID);
    longLivedUrl.searchParams.set('client_secret', META_APP_SECRET);
    longLivedUrl.searchParams.set('fb_exchange_token', shortLivedToken);

    const longLivedResponse = await fetch(longLivedUrl.toString());
    const longLivedData = await longLivedResponse.json();

    if (longLivedData.error) {
      return res.status(400).json({ error: longLivedData.error.message });
    }

    const longLivedToken = longLivedData.access_token;
    const expiresIn = longLivedData.expires_in; // ~60 days

    // Store the token on the client record
    const { error: updateError } = await supabaseAdmin
      .from('clients')
      .update({
        meta_access_token: longLivedToken,
        meta_token_expires_at: new Date(
          Date.now() + expiresIn * 1000
        ).toISOString(),
      })
      .eq('id', clientId);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    // Redirect back to the client dashboard
    return res.redirect(302, `${APP_URL}/clients/${clientId}?meta=connected`);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'OAuth callback failed' });
  }
}
