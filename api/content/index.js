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

    // Clients can only view their own content
    if (user.role !== 'agency' && user.client_id !== client_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { data, error } = await supabaseAdmin
      .from('content')
      .select('*')
      .eq('client_id', client_id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    if (!requireAgency(user, res)) return;

    const {
      client_id,
      title,
      type,
      caption,
      media_url,
      scheduled_date,
      status,
    } = req.body;

    if (!client_id || !title) {
      return res.status(400).json({ error: 'client_id and title are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('content')
      .insert({
        client_id,
        title,
        type: type || null,
        caption: caption || null,
        media_url: media_url || null,
        scheduled_date: scheduled_date || null,
        status: status || 'draft',
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
