import supabaseAdmin from '../lib/supabase.js';
import { authenticate, requireAgency } from '../lib/auth.js';

export default async function handler(req, res) {
  const user = await authenticate(req, res);
  if (!user) return;

  if (!requireAgency(user, res)) return;

  const { clientId } = req.query;

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('agency_notes')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  }

  if (req.method === 'PUT') {
    const { notes } = req.body;

    if (notes === undefined) {
      return res.status(400).json({ error: 'notes field is required' });
    }

    // Upsert: update existing notes or create new entry
    const { data, error } = await supabaseAdmin
      .from('agency_notes')
      .upsert(
        {
          client_id: clientId,
          notes,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'client_id' }
      )
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
