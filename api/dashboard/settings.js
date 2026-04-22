import supabaseAdmin from '../lib/supabase.js';
import { authenticate, requireAgency } from '../lib/auth.js';

const ALLOWED = ['revenue_target_monthly', 'revenue_manual_override', 'current_month_label'];

export default async function handler(req, res) {
  const user = await authenticate(req, res);
  if (!user) return;
  if (!requireAgency(user, res)) return;

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('dashboard_settings').select('*').eq('id', 1).single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'PATCH') {
    const patch = {};
    for (const k of ALLOWED) if (k in (req.body || {})) patch[k] = req.body[k];

    const { data, error } = await supabaseAdmin
      .from('dashboard_settings')
      .update(patch)
      .eq('id', 1)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
