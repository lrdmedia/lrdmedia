import supabaseAdmin from '../lib/supabase.js';
import { authenticate } from '../lib/auth.js';

export default async function handler(req, res) {
  const user = await authenticate(req, res);
  if (!user) return;

  const { id } = req.query;

  if (req.method === 'GET') {
    // Users can only read their own profile, agency can read any
    if (user.role !== 'agency' && user.id !== id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // If the user is a client, also get their client_id
    if (profile.role === 'client') {
      const { data: client } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('user_id', id)
        .single();
      profile.client_id = client?.id || null;
    }

    return res.status(200).json(profile);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
