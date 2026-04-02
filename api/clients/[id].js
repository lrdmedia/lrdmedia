import supabaseAdmin from '../lib/supabase.js';
import { authenticate, requireAgency } from '../lib/auth.js';

export default async function handler(req, res) {
  const user = await authenticate(req, res);
  if (!user) return;

  const { id } = req.query;

  if (req.method === 'GET') {
    // Agency can view any client; clients can only view their own
    if (user.role !== 'agency' && user.client_id !== id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Client not found' });
    }

    return res.status(200).json(data);
  }

  if (req.method === 'PUT') {
    if (!requireAgency(user, res)) return;

    const {
      business_name,
      contact_name,
      contact_email,
      phone,
      industry,
      plan,
    } = req.body;

    const updates = {};
    if (business_name !== undefined) updates.business_name = business_name;
    if (contact_name !== undefined) updates.contact_name = contact_name;
    if (contact_email !== undefined) updates.contact_email = contact_email;
    if (phone !== undefined) updates.phone = phone;
    if (industry !== undefined) updates.industry = industry;
    if (plan !== undefined) updates.plan = plan;

    const { data, error } = await supabaseAdmin
      .from('clients')
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
