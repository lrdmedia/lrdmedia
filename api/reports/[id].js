import supabaseAdmin from '../lib/supabase.js';
import { authenticate, requireAgency } from '../lib/auth.js';

export default async function handler(req, res) {
  const user = await authenticate(req, res);
  if (!user) return;

  const { id } = req.query;

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('monthly_reports')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Clients can only view their own published reports
    if (user.role !== 'agency') {
      if (user.client_id !== data.client_id || !data.published) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    return res.status(200).json(data);
  }

  if (req.method === 'PUT') {
    if (!requireAgency(user, res)) return;

    const {
      report_date,
      ad_spend,
      enquiries,
      results_summary,
      notes,
      published,
    } = req.body;

    const updates = {};
    if (report_date !== undefined) updates.report_date = report_date;
    if (ad_spend !== undefined) updates.ad_spend = ad_spend;
    if (enquiries !== undefined) updates.enquiries = enquiries;
    if (results_summary !== undefined) updates.results_summary = results_summary;
    if (notes !== undefined) updates.notes = notes;
    if (published !== undefined) {
      updates.published = published;
      // Set published_at when publishing
      if (published === true) {
        updates.published_at = new Date().toISOString();
      }
    }

    const { data, error } = await supabaseAdmin
      .from('monthly_reports')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
