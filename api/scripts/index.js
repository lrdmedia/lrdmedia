import supabaseAdmin from '../lib/supabase.js';
import { authenticate, requireAgency } from '../lib/auth.js';

export default async function handler(req, res) {
  const user = await authenticate(req, res);
  if (!user) return;
  if (!requireAgency(user, res)) return;

  if (req.method === 'GET') {
    const { status, pillar } = req.query;
    let q = supabaseAdmin.from('scripts').select('*');
    if (status) q = q.eq('status', status);
    if (pillar) q = q.eq('pillar', pillar);

    const { data, error } = await q
      .order('sort_order', { ascending: true })
      .order('scheduled_post_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const {
      title, body, pillar, status, content_type,
      scheduled_post_date, hook, cta, notes,
    } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title is required' });

    const { data, error } = await supabaseAdmin
      .from('scripts')
      .insert({
        title,
        body: body || null,
        pillar: pillar || null,
        status: status || 'idea',
        content_type: content_type || null,
        scheduled_post_date: scheduled_post_date || null,
        hook: hook || null,
        cta: cta || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
