import supabaseAdmin from '../lib/supabase.js';
import { authenticate, requireAgency } from '../lib/auth.js';

const ALLOWED = [
  'handle', 'name', 'business_name', 'stage', 'source', 'dm_snippet', 'notes',
  'lost_reason', 'client_id', 'sort_order',
];

// Stage → timestamp field. Stamps automatically when moving a lead forward.
const STAGE_STAMPS = {
  qualified:   'qualified_at',
  vsl_sent:    'vsl_sent_at',
  call_booked: 'call_booked_at',
  call_done:   'call_done_at',
  signed:      'signed_at',
};

export default async function handler(req, res) {
  const user = await authenticate(req, res);
  if (!user) return;
  if (!requireAgency(user, res)) return;

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id is required' });

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin.from('leads').select('*').eq('id', id).single();
    if (error) return res.status(404).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'PATCH') {
    const patch = {};
    for (const k of ALLOWED) if (k in (req.body || {})) patch[k] = req.body[k];

    if ('stage' in patch) {
      const stamp = STAGE_STAMPS[patch.stage];
      if (stamp) patch[stamp] = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from('leads')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    const { error } = await supabaseAdmin.from('leads').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
