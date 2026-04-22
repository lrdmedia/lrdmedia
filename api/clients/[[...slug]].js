// Consolidated clients endpoint.
// Handles:
//   GET  /api/clients         (list with current-month ad spend + enquiries)
//   POST /api/clients         (create)
//   GET  /api/clients/:id     (single)
//   PUT  /api/clients/:id     (update)
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
    if (!requireAgency(user, res)) return;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const { data: clients, error } = await supabaseAdmin.from('clients').select('*');
    if (error) return res.status(500).json({ error: error.message });

    const { data: reports, error: reportsError } = await supabaseAdmin
      .from('monthly_reports')
      .select('client_id, ad_spend, enquiries')
      .gte('report_date', startOfMonth)
      .lte('report_date', endOfMonth);
    if (reportsError) return res.status(500).json({ error: reportsError.message });

    const reportsByClient = {};
    for (const r of reports || []) {
      reportsByClient[r.client_id] = { ad_spend: r.ad_spend, enquiries: r.enquiries };
    }

    const enriched = clients.map((c) => ({
      ...c,
      current_month_ad_spend:  reportsByClient[c.id]?.ad_spend  ?? null,
      current_month_enquiries: reportsByClient[c.id]?.enquiries ?? null,
    }));

    return res.status(200).json(enriched);
  }

  if (req.method === 'POST') {
    if (!requireAgency(user, res)) return;

    const { business_name, contact_name, contact_email, phone, industry, plan } = req.body || {};
    if (!business_name || !contact_email) {
      return res.status(400).json({ error: 'business_name and contact_email are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('clients')
      .insert({
        business_name,
        contact_name,
        contact_email,
        phone:    phone    || null,
        industry: industry || null,
        plan:     plan     || null,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function readOrUpdate(req, res, user, id) {
  if (req.method === 'GET') {
    if (user.role !== 'agency' && user.client_id !== id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { data, error } = await supabaseAdmin
      .from('clients').select('*').eq('id', id).single();
    if (error) return res.status(404).json({ error: 'Client not found' });
    return res.status(200).json(data);
  }

  if (req.method === 'PUT') {
    if (!requireAgency(user, res)) return;

    const { business_name, contact_name, contact_email, phone, industry, plan } = req.body || {};
    const updates = {};
    if (business_name !== undefined) updates.business_name = business_name;
    if (contact_name  !== undefined) updates.contact_name  = contact_name;
    if (contact_email !== undefined) updates.contact_email = contact_email;
    if (phone         !== undefined) updates.phone         = phone;
    if (industry      !== undefined) updates.industry      = industry;
    if (plan          !== undefined) updates.plan          = plan;

    const { data, error } = await supabaseAdmin
      .from('clients').update(updates).eq('id', id).select().single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
