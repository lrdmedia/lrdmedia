import supabaseAdmin from '../lib/supabase.js';
import { authenticate, requireAgency } from '../lib/auth.js';

export default async function handler(req, res) {
  const user = await authenticate(req, res);
  if (!user) return;

  const { id } = req.query;

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('content')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Clients can only view their own content
    if (user.role !== 'agency' && user.client_id !== data.client_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.status(200).json(data);
  }

  if (req.method === 'PUT') {
    // First fetch the existing content to check ownership
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('content')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Clients can only view/edit their own content
    if (user.role !== 'agency' && user.client_id !== existing.client_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    let updates = {};

    if (user.role === 'agency') {
      // Agency can update all fields
      const {
        title,
        type,
        caption,
        media_url,
        scheduled_date,
        status,
        feedback,
      } = req.body;

      if (title !== undefined) updates.title = title;
      if (type !== undefined) updates.type = type;
      if (caption !== undefined) updates.caption = caption;
      if (media_url !== undefined) updates.media_url = media_url;
      if (scheduled_date !== undefined) updates.scheduled_date = scheduled_date;
      if (status !== undefined) updates.status = status;
      if (feedback !== undefined) updates.feedback = feedback;
    } else {
      // Client can only update feedback and set specific statuses
      const { feedback, status } = req.body;

      if (feedback !== undefined) updates.feedback = feedback;
      if (status !== undefined) {
        const allowedStatuses = ['revision_requested', 'approved'];
        if (!allowedStatuses.includes(status)) {
          return res.status(400).json({
            error: `Clients can only set status to: ${allowedStatuses.join(', ')}`,
          });
        }
        updates.status = status;
      }
    }

    const { data, error } = await supabaseAdmin
      .from('content')
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
