// Single serverless function that routes all work-dashboard operations.
// Consolidated from the original 8 files to stay under Vercel Hobby's
// 12-function limit.
//
// Routes:
//   GET    /api/work/briefing
//   GET    /api/work/settings
//   PATCH  /api/work/settings
//   GET    /api/work/tasks
//   POST   /api/work/tasks
//   GET    /api/work/tasks/:id
//   PATCH  /api/work/tasks/:id
//   DELETE /api/work/tasks/:id
//   (same shape for /leads and /scripts)
import supabaseAdmin from '../lib/supabase.js';
import { authenticate, requireAgency } from '../lib/auth.js';

// --- Allowed PATCH fields per resource -----------------------------------
const TASK_FIELDS   = ['title', 'done', 'due_date', 'priority', 'client_id', 'lead_id', 'script_id', 'notes', 'sort_order'];
const LEAD_FIELDS   = ['handle', 'name', 'business_name', 'stage', 'source', 'dm_snippet', 'notes', 'lost_reason', 'client_id', 'sort_order'];
const SCRIPT_FIELDS = ['title', 'body', 'pillar', 'status', 'content_type', 'scheduled_post_date', 'hook', 'cta', 'notes', 'sort_order'];
const SETTING_FIELDS = ['revenue_target_monthly', 'revenue_manual_override', 'current_month_label'];

// Stage → timestamp field for lead stage transitions
const LEAD_STAMPS = {
  qualified:   'qualified_at',
  vsl_sent:    'vsl_sent_at',
  call_booked: 'call_booked_at',
  call_done:   'call_done_at',
  signed:      'signed_at',
};

export default async function handler(req, res) {
  const user = await authenticate(req, res);
  if (!user) return;
  if (!requireAgency(user, res)) return;

  const slug = req.query.slug || [];
  const [resource, id] = slug;

  try {
    switch (resource) {
      case 'briefing': return getBriefing(req, res);
      case 'settings': return handleSettings(req, res);
      case 'tasks':    return handleTasks(req, res, id);
      case 'leads':    return handleLeads(req, res, id);
      case 'scripts':  return handleScripts(req, res, id);
      default: return res.status(404).json({ error: 'Unknown resource' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// ---- BRIEFING -----------------------------------------------------------
async function getBriefing(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const today = new Date().toISOString().slice(0, 10);
  const in7   = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);

  const [openTasks, overdueTasks, todayTasks, pipelineCounts, upcomingScripts, signedClients, settings] = await Promise.all([
    supabaseAdmin.from('tasks').select('*').eq('done', false)
      .order('due_date', { ascending: true, nullsFirst: false }).limit(20),
    supabaseAdmin.from('tasks').select('*').eq('done', false).lt('due_date', today),
    supabaseAdmin.from('tasks').select('*').eq('done', false).eq('due_date', today),
    supabaseAdmin.from('leads').select('stage'),
    supabaseAdmin.from('scripts').select('*')
      .in('status', ['to_film', 'filmed', 'editing', 'scheduled'])
      .lte('scheduled_post_date', in7)
      .order('scheduled_post_date', { ascending: true, nullsFirst: false }),
    supabaseAdmin.from('clients').select('id, business_name, status, service_start_date'),
    supabaseAdmin.from('dashboard_settings').select('*').eq('id', 1).single(),
  ]);

  const pipeline = (pipelineCounts.data || []).reduce((acc, row) => {
    acc[row.stage] = (acc[row.stage] || 0) + 1;
    return acc;
  }, {});

  return res.status(200).json({
    today_iso: today,
    tasks: {
      open:    openTasks.data || [],
      overdue: overdueTasks.data || [],
      today:   todayTasks.data || [],
    },
    pipeline_counts: pipeline,
    upcoming_content: upcomingScripts.data || [],
    clients: signedClients.data || [],
    settings: settings.data || null,
  });
}

// ---- SETTINGS -----------------------------------------------------------
async function handleSettings(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('dashboard_settings').select('*').eq('id', 1).single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }
  if (req.method === 'PATCH') {
    const patch = pick(req.body, SETTING_FIELDS);
    const { data, error } = await supabaseAdmin
      .from('dashboard_settings').update(patch).eq('id', 1).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

// ---- TASKS --------------------------------------------------------------
async function handleTasks(req, res, id) {
  if (!id) {
    if (req.method === 'GET') {
      const { done, due_before, client_id, lead_id, script_id } = req.query;
      let q = supabaseAdmin.from('tasks').select('*');
      if (done === 'true')  q = q.eq('done', true);
      if (done === 'false') q = q.eq('done', false);
      if (due_before)       q = q.lte('due_date', due_before);
      if (client_id)        q = q.eq('client_id', client_id);
      if (lead_id)          q = q.eq('lead_id', lead_id);
      if (script_id)        q = q.eq('script_id', script_id);
      const { data, error } = await q
        .order('done', { ascending: true })
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const body = req.body || {};
      if (!body.title) return res.status(400).json({ error: 'title is required' });
      const { data, error } = await supabaseAdmin.from('tasks').insert({
        title: body.title,
        due_date: body.due_date || null,
        priority: body.priority || null,
        client_id: body.client_id || null,
        lead_id:   body.lead_id   || null,
        script_id: body.script_id || null,
        notes:     body.notes     || null,
      }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json(data);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // /api/work/tasks/:id
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin.from('tasks').select('*').eq('id', id).single();
    if (error) return res.status(404).json({ error: error.message });
    return res.status(200).json(data);
  }
  if (req.method === 'PATCH') {
    const patch = pick(req.body, TASK_FIELDS);
    if ('done' in patch) patch.done_at = patch.done ? new Date().toISOString() : null;
    const { data, error } = await supabaseAdmin.from('tasks').update(patch).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }
  if (req.method === 'DELETE') {
    const { error } = await supabaseAdmin.from('tasks').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

// ---- LEADS --------------------------------------------------------------
async function handleLeads(req, res, id) {
  if (!id) {
    if (req.method === 'GET') {
      const { stage } = req.query;
      let q = supabaseAdmin.from('leads').select('*');
      if (stage) q = q.eq('stage', stage);
      const { data, error } = await q
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const body = req.body || {};
      if (!body.handle && !body.name) {
        return res.status(400).json({ error: 'handle or name is required' });
      }
      const { data, error } = await supabaseAdmin.from('leads').insert({
        handle:        body.handle        || null,
        name:          body.name          || null,
        business_name: body.business_name || null,
        stage:         body.stage         || 'lead',
        source:        body.source        || null,
        dm_snippet:    body.dm_snippet    || null,
        notes:         body.notes         || null,
      }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json(data);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin.from('leads').select('*').eq('id', id).single();
    if (error) return res.status(404).json({ error: error.message });
    return res.status(200).json(data);
  }
  if (req.method === 'PATCH') {
    const patch = pick(req.body, LEAD_FIELDS);
    if ('stage' in patch) {
      const stamp = LEAD_STAMPS[patch.stage];
      if (stamp) patch[stamp] = new Date().toISOString();
    }
    const { data, error } = await supabaseAdmin.from('leads').update(patch).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }
  if (req.method === 'DELETE') {
    const { error } = await supabaseAdmin.from('leads').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

// ---- SCRIPTS ------------------------------------------------------------
async function handleScripts(req, res, id) {
  if (!id) {
    if (req.method === 'GET') {
      const { status, pillar } = req.query;
      let q = supabaseAdmin.from('scripts').select('*');
      if (status) q = q.eq('status', status);
      if (pillar) q = q.eq('pillar', pillar);
      const { data, error } = await q
        .order('sort_order', { ascending: true })
        .order('scheduled_post_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const body = req.body || {};
      if (!body.title) return res.status(400).json({ error: 'title is required' });
      const { data, error } = await supabaseAdmin.from('scripts').insert({
        title:               body.title,
        body:                body.body                || null,
        pillar:              body.pillar              || null,
        status:              body.status              || 'idea',
        content_type:        body.content_type        || null,
        scheduled_post_date: body.scheduled_post_date || null,
        hook:                body.hook                || null,
        cta:                 body.cta                 || null,
        notes:               body.notes               || null,
      }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json(data);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin.from('scripts').select('*').eq('id', id).single();
    if (error) return res.status(404).json({ error: error.message });
    return res.status(200).json(data);
  }
  if (req.method === 'PATCH') {
    const patch = pick(req.body, SCRIPT_FIELDS);
    if (patch.status === 'posted' && !('posted_at' in patch)) {
      patch.posted_at = new Date().toISOString();
    }
    const { data, error } = await supabaseAdmin.from('scripts').update(patch).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }
  if (req.method === 'DELETE') {
    const { error } = await supabaseAdmin.from('scripts').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

function pick(obj = {}, allowed) {
  const out = {};
  for (const k of allowed) if (k in obj) out[k] = obj[k];
  return out;
}
