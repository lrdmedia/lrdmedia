import supabaseAdmin from '../lib/supabase.js';
import { authenticate, requireAgency } from '../lib/auth.js';

export default async function handler(req, res) {
  const user = await authenticate(req, res);
  if (!user) return;
  if (!requireAgency(user, res)) return;

  if (req.method === 'GET') {
    const { stage } = req.query;
    let q = supabaseAdmin.from('leads').select('*');
    if (stage) q = q.eq('stage', stage);
    const { data, error } = await q
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { handle, name, business_name, stage, source, dm_snippet, notes } = req.body || {};
    if (!handle && !name) {
      return res.status(400).json({ error: 'handle or name is required' });
    }
    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert({
        handle: handle || null,
        name: name || null,
        business_name: business_name || null,
        stage: stage || 'lead',
        source: source || null,
        dm_snippet: dm_snippet || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
