import { authenticate, requireAgency } from '../lib/auth.js';

const META_APP_ID = process.env.META_APP_ID;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await authenticate(req, res);
  if (!user) return;

  if (!requireAgency(user, res)) return;

  const { client_id } = req.query;

  if (!client_id) {
    return res.status(400).json({ error: 'client_id query parameter is required' });
  }

  const redirectUri = `${APP_URL}/api/meta/callback`;
  const scopes = [
    'instagram_basic',
    'instagram_manage_insights',
    'pages_show_list',
    'pages_read_engagement',
    'ads_read',
  ].join(',');

  const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
  authUrl.searchParams.set('client_id', META_APP_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', client_id); // Pass client_id as state

  return res.status(200).json({ url: authUrl.toString() });
}
