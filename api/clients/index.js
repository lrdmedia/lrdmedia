import supabaseAdmin from '../lib/supabase.js';
import { authenticate, requireAgency } from '../lib/auth.js';

export default async function handler(req, res) {
  const user = await authenticate(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    if (!requireAgency(user, res)) return;

    // Get current month boundaries
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const { data: clients, error } = await supabaseAdmin
      .from('clients')
      .select('*');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Fetch current month reports for ad_spend and enquiries
    const { data: reports, error: reportsError } = await supabaseAdmin
      .from('monthly_reports')
      .select('client_id, ad_spend, enquiries')
      .gte('report_date', startOfMonth)
      .lte('report_date', endOfMonth);

    if (reportsError) {
      return res.status(500).json({ error: reportsError.message });
    }

    // Build a lookup map from reports
    const reportsByClient = {};
    for (const r of reports || []) {
      reportsByClient[r.client_id] = {
        ad_spend: r.ad_spend,
        enquiries: r.enquiries,
      };
    }

    // Merge report data into clients
    const enriched = clients.map((c) => ({
      ...c,
      current_month_ad_spend: reportsByClient[c.id]?.ad_spend ?? null,
      current_month_enquiries: reportsByClient[c.id]?.enquiries ?? null,
    }));

    return res.status(200).json(enriched);
  }

  if (req.method === 'POST') {
    if (!requireAgency(user, res)) return;

    const {
      business_name,
      contact_name,
      contact_email,
      phone,
      industry,
      plan,
    } = req.body;

    if (!business_name || !contact_email) {
      return res.status(400).json({ error: 'business_name and contact_email are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('clients')
      .insert({
        business_name,
        contact_name,
        contact_email,
        phone: phone || null,
        industry: industry || null,
        plan: plan || null,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
