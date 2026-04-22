#!/usr/bin/env node
// Add a task from the terminal.
//   node scripts/claude/add-task.js "Call Dan tomorrow" --due=2026-04-23 --priority=high
import { supabase } from './_client.js';

const args = process.argv.slice(2);
const title = args.filter(a => !a.startsWith('--')).join(' ').trim();
if (!title) {
  console.error('Usage: add-task.js "<title>" [--due=YYYY-MM-DD] [--priority=low|med|high]');
  process.exit(1);
}

const flags = Object.fromEntries(
  args.filter(a => a.startsWith('--')).map(a => a.replace(/^--/, '').split('='))
);

const { data, error } = await supabase
  .from('tasks')
  .insert({
    title,
    due_date: flags.due || null,
    priority: flags.priority || null,
  })
  .select()
  .single();

if (error) { console.error(error.message); process.exit(1); }
console.log(`✓ Added task: ${data.title}${data.due_date ? `  (due ${data.due_date})` : ''}`);
