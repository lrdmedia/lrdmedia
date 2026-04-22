import supabaseAdmin from '../lib/supabase.js';
import { authenticate, requireAgency } from '../lib/auth.js';

export default async function handler(req, res) {
  const user = await authenticate(req, res);
  if (!user) return;
  if (!requireAgency(user, res)) return;

  if (req.method === 'GET') {
    const { done, due_before, client_id, lead_id, script_id } = req.query;

    let q = supabaseAdmin.from('tasks').select('*');

    if (done === 'true')  q = q.eq('done', true);
    if (done === 'false') q = q.eq('done', false);
    if (due_before)       q = q.lte('due_date', due_before);
    if (client_id)        q = q.eq('client_id', client_id);
    if (lead_id)          q = q.eq('lead_id', lead_id);
    if (script_id)        q = q.eq('script_id', script_id);

    const { data, error } = await q
      .order('done', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { title, due_date, priority, client_id, lead_id, script_id, notes } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title is required' });

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .insert({
        title,
        due_date: due_date || null,
        priority: priority || null,
        client_id: client_id || null,
        lead_id: lead_id || null,
        script_id: script_id || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
