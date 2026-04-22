#!/usr/bin/env node
// Prints today's work briefing to the terminal. Intended to be run by
// Claude Code (or you) when you want a quick "what's on today" pulse.
//
//   node scripts/claude/briefing.js
//
import { supabase } from './_client.js';

const today = new Date().toISOString().slice(0, 10);
const in7   = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);

const [openTasks, overdueTasks, todayTasks, leads, scripts, settings] = await Promise.all([
  supabase.from('tasks').select('*').eq('done', false).order('due_date', { ascending: true, nullsFirst: false }),
  supabase.from('tasks').select('*').eq('done', false).lt('due_date', today),
  supabase.from('tasks').select('*').eq('done', false).eq('due_date', today),
  supabase.from('leads').select('stage'),
  supabase.from('scripts').select('*')
    .in('status', ['to_film', 'filmed', 'editing', 'scheduled'])
    .lte('scheduled_post_date', in7)
    .order('scheduled_post_date', { ascending: true, nullsFirst: false }),
  supabase.from('dashboard_settings').select('*').eq('id', 1).single(),
]);

const pipeline = (leads.data || []).reduce((a, l) => ((a[l.stage] = (a[l.stage] || 0) + 1), a), {});
const target   = Number(settings.data?.revenue_target_monthly || 10000);
const revenue  = Number(settings.data?.revenue_manual_override || 0);

const bar = '─'.repeat(60);
console.log(`\n${bar}\n  BRIEFING — ${new Date().toDateString()}\n${bar}`);

console.log(`\n  Revenue  £${revenue.toLocaleString()} / £${target.toLocaleString()}  (${Math.round(revenue / target * 100)}%)`);

console.log(`\n  Pipeline`);
for (const s of ['lead', 'qualified', 'vsl_sent', 'call_booked', 'call_done', 'proposal', 'signed', 'lost']) {
  console.log(`    ${s.padEnd(12)} ${pipeline[s] || 0}`);
}

if ((overdueTasks.data || []).length) {
  console.log(`\n  OVERDUE (${overdueTasks.data.length})`);
  for (const t of overdueTasks.data) console.log(`    ! ${t.title}  (${t.due_date})`);
}

console.log(`\n  TODAY (${(todayTasks.data || []).length})`);
for (const t of todayTasks.data || []) console.log(`    • ${t.title}`);
if (!todayTasks.data?.length) console.log('    (nothing)');

const upcoming = (openTasks.data || []).filter(
  t => !todayTasks.data?.find(x => x.id === t.id) && !overdueTasks.data?.find(x => x.id === t.id)
).slice(0, 6);
if (upcoming.length) {
  console.log(`\n  UPCOMING`);
  for (const t of upcoming) console.log(`    - ${t.title}${t.due_date ? `  (${t.due_date})` : ''}`);
}

if ((scripts.data || []).length) {
  console.log(`\n  CONTENT — next 7 days`);
  for (const c of scripts.data) {
    console.log(`    [${c.status.padEnd(9)}] ${c.title}${c.scheduled_post_date ? `  (${c.scheduled_post_date})` : ''}`);
  }
}

console.log(`\n${bar}\n`);
process.exit(0);
