// Consolidated reports endpoint (preserves existing URLs).
//   GET  /api/reports?client_id=...   list
//   POST /api/reports                 create (agency)
//   GET  /api/reports/:id             single
//   PUT  /api/reports/:id             update (agency)
import supabaseAdmin from '../lib/supabase.js';
import { authenticate, requireAgency } from '../lib/auth.js';

export default async function handler(req, res) {
  const user = await authenticate(req, res);
  if (!user) return;

  const slug = req.query.slug || [];
  const id = slug[0];

  if (!id) return listOrCreate(req, res, user);
  return readOrUpdate(req, res, user, id);
}

async function listOrCreate(req, res, user) {
  if (req.method === 'GET') {
    const { client_id } = req.query;
    if (!client_id) return res.status(400).json({ error: 'client_id query parameter is required' });
    if (user.role !== 'agency' && user.client_id !== client_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    let query = supabaseAdmin
      .from('monthly_reports')
      .select('*')
      .eq('client_id', client_id)
      .order('report_date', { ascending: false });
    if (user.role !== 'agency') query = query.eq('published', true);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    if (!requireAgency(user, res)) return;
    const { client_id, report_date, ad_spend, enquiries, results_summary, notes, published } = req.body || {};
    if (!client_id || !report_date) {
      return res.status(400).json({ error: 'client_id and report_date are required' });
    }
    const insertData = {
      client_id,
      report_date,
      ad_spend:        ad_spend        ?? null,
      enquiries:       enquiries       ?? null,
      results_summary: results_summary || null,
      notes:           notes           || null,
      published:       published       || false,
    };
    if (insertData.published) insertData.published_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('monthly_reports').insert(insertData).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function readOrUpdate(req, res, user, id) {
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('monthly_reports').select('*').eq('id', id).single();
    if (error) return res.status(404).json({ error: 'Report not found' });
    if (user.role !== 'agency') {
      if (user.client_id !== data.client_id || !data.published) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    return res.status(200).json(data);
  }

  if (req.method === 'PUT') {
    if (!requireAgency(user, res)) return;
    const { report_date, ad_spend, enquiries, results_summary, notes, published } = req.body || {};
    const updates = {};
    if (report_date     !== undefined) updates.report_date     = report_date;
    if (ad_spend        !== undefined) updates.ad_spend        = ad_spend;
    if (enquiries       !== undefined) updates.enquiries       = enquiries;
    if (results_summary !== undefined) updates.results_summary = results_summary;
    if (notes           !== undefined) updates.notes           = notes;
    if (published       !== undefined) {
      updates.published = published;
      if (published === true) updates.published_at = new Date().toISOString();
    }
    const { data, error } = await supabaseAdmin
      .from('monthly_reports').update(updates).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
