// Consolidated content endpoint (preserves existing URLs).
//   GET  /api/content?client_id=...      list
//   POST /api/content                     create (agency)
//   GET  /api/content/:id                 single (agency or owning client)
//   PUT  /api/content/:id                 update (agency full, client feedback/status subset)
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
    const { data, error } = await supabaseAdmin
      .from('content')
      .select('*')
      .eq('client_id', client_id)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    if (!requireAgency(user, res)) return;
    const { client_id, title, type, caption, media_url, scheduled_date, status } = req.body || {};
    if (!client_id || !title) {
      return res.status(400).json({ error: 'client_id and title are required' });
    }
    const { data, error } = await supabaseAdmin
      .from('content')
      .insert({
        client_id,
        title,
        type:           type           || null,
        caption:        caption        || null,
        media_url:      media_url      || null,
        scheduled_date: scheduled_date || null,
        status:         status         || 'draft',
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
    const { data, error } = await supabaseAdmin
      .from('content').select('*').eq('id', id).single();
    if (error) return res.status(404).json({ error: 'Content not found' });
    if (user.role !== 'agency' && user.client_id !== data.client_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'PUT') {
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('content').select('*').eq('id', id).single();
    if (fetchError || !existing) return res.status(404).json({ error: 'Content not found' });
    if (user.role !== 'agency' && user.client_id !== existing.client_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updates = {};
    if (user.role === 'agency') {
      const { title, type, caption, media_url, scheduled_date, status, feedback } = req.body || {};
      if (title          !== undefined) updates.title          = title;
      if (type           !== undefined) updates.type           = type;
      if (caption        !== undefined) updates.caption        = caption;
      if (media_url      !== undefined) updates.media_url      = media_url;
      if (scheduled_date !== undefined) updates.scheduled_date = scheduled_date;
      if (status         !== undefined) updates.status         = status;
      if (feedback       !== undefined) updates.feedback       = feedback;
    } else {
      const { feedback, status } = req.body || {};
      if (feedback !== undefined) updates.feedback = feedback;
      if (status !== undefined) {
        const allowed = ['revision_requested', 'approved'];
        if (!allowed.includes(status)) {
          return res.status(400).json({ error: `Clients can only set status to: ${allowed.join(', ')}` });
        }
        updates.status = status;
      }
    }

    const { data, error } = await supabaseAdmin
      .from('content').update(updates).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
