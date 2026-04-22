import supabaseAdmin from '../lib/supabase.js';
import { authenticate, requireAgency } from '../lib/auth.js';

const ALLOWED = [
  'title', 'body', 'pillar', 'status', 'content_type',
  'scheduled_post_date', 'hook', 'cta', 'notes', 'sort_order',
];

export default async function handler(req, res) {
  const user = await authenticate(req, res);
  if (!user) return;
  if (!requireAgency(user, res)) return;

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id is required' });

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin.from('scripts').select('*').eq('id', id).single();
    if (error) return res.status(404).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'PATCH') {
    const patch = {};
    for (const k of ALLOWED) if (k in (req.body || {})) patch[k] = req.body[k];

    if (patch.status === 'posted' && !('posted_at' in patch)) {
      patch.posted_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from('scripts')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    const { error } = await supabaseAdmin.from('scripts').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
