import supabaseAdmin from '../lib/supabase.js';
import { authenticate, requireAgency } from '../lib/auth.js';

// Single roll-up endpoint powering /work/today.
// Returns everything needed for the "what's happening today" view so the
// page renders in one request (and Claude's briefing CLI can call the same thing).
export default async function handler(req, res) {
  const user = await authenticate(req, res);
  if (!user) return;
  if (!requireAgency(user, res)) return;

  const todayIso = new Date().toISOString().slice(0, 10);
  const in7Days  = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [
    openTasks,
    overdueTasks,
    todayTasks,
    pipelineCounts,
    upcomingScripts,
    signedClients,
    settings,
  ] = await Promise.all([
    supabaseAdmin.from('tasks').select('*').eq('done', false)
      .order('due_date', { ascending: true, nullsFirst: false }).limit(20),
    supabaseAdmin.from('tasks').select('*').eq('done', false).lt('due_date', todayIso),
    supabaseAdmin.from('tasks').select('*').eq('done', false).eq('due_date', todayIso),
    supabaseAdmin.from('leads').select('stage'),
    supabaseAdmin.from('scripts').select('*')
      .in('status', ['to_film', 'filmed', 'editing', 'scheduled'])
      .lte('scheduled_post_date', in7Days)
      .order('scheduled_post_date', { ascending: true, nullsFirst: false }),
    supabaseAdmin.from('clients').select('id, business_name, status, service_start_date'),
    supabaseAdmin.from('dashboard_settings').select('*').eq('id', 1).single(),
  ]);

  const pipeline = (pipelineCounts.data || []).reduce((acc, row) => {
    acc[row.stage] = (acc[row.stage] || 0) + 1;
    return acc;
  }, {});

  return res.status(200).json({
    today_iso: todayIso,
    tasks: {
      open: openTasks.data || [],
      overdue: overdueTasks.data || [],
      today: todayTasks.data || [],
    },
    pipeline_counts: pipeline,
    upcoming_content: upcomingScripts.data || [],
    clients: signedClients.data || [],
    settings: settings.data || null,
  });
}
