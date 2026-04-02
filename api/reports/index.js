import supabaseAdmin from '../lib/supabase.js';
import { authenticate, requireAgency } from '../lib/auth.js';

export default async function handler(req, res) {
  const user = await authenticate(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const { client_id } = req.query;

    if (!client_id) {
      return res.status(400).json({ error: 'client_id query parameter is required' });
    }

    // Clients can only view their own reports
    if (user.role !== 'agency' && user.client_id !== client_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    let query = supabaseAdmin
      .from('monthly_reports')
      .select('*')
      .eq('client_id', client_id)
      .order('report_date', { ascending: false });

    // Clients can only see published reports
    if (user.role !== 'agency') {
      query = query.eq('published', true);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    if (!requireAgency(user, res)) return;

    const {
      client_id,
      report_date,
      ad_spend,
      enquiries,
      results_summary,
      notes,
      published,
    } = req.body;

    if (!client_id || !report_date) {
      return res.status(400).json({ error: 'client_id and report_date are required' });
    }

    const insertData = {
      client_id,
      report_date,
      ad_spend: ad_spend ?? null,
      enquiries: enquiries ?? null,
      results_summary: results_summary || null,
      notes: notes || null,
      published: published || false,
    };

    // If creating as published, set published_at
    if (insertData.published) {
      insertData.published_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from('monthly_reports')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
