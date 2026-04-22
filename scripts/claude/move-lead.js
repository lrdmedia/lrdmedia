#!/usr/bin/env node
// Move a lead to a new stage. Matches by handle (with or without @) or name.
//   node scripts/claude/move-lead.js @evolveptstudio call_booked
//   node scripts/claude/move-lead.js "Meg Carr" signed
import { supabase } from './_client.js';

const STAGES = ['lead', 'qualified', 'vsl_sent', 'call_booked', 'call_done', 'proposal', 'signed', 'lost'];
const STAMP = { qualified: 'qualified_at', vsl_sent: 'vsl_sent_at', call_booked: 'call_booked_at', call_done: 'call_done_at', signed: 'signed_at' };

const [match, stage] = process.argv.slice(2);
if (!match || !stage) {
  console.error('Usage: move-lead.js "<handle or name>" <stage>');
  console.error(`Stages: ${STAGES.join(', ')}`);
  process.exit(1);
}
if (!STAGES.includes(stage)) { console.error(`Unknown stage "${stage}".`); process.exit(1); }

const needle = match.startsWith('@') ? match : `@${match}`;
const { data: leads, error: lookupErr } = await supabase
  .from('leads')
  .select('*')
  .or(`handle.eq.${needle},handle.eq.${match},name.ilike.${match},business_name.ilike.${match}`);

if (lookupErr) { console.error(lookupErr.message); process.exit(1); }
if (!leads?.length) { console.error(`No lead matched "${match}".`); process.exit(1); }
if (leads.length > 1) {
  console.error(`Multiple leads matched "${match}":`);
  leads.forEach(l => console.error(`  - ${l.handle || l.name} (${l.stage})`));
  process.exit(1);
}

const lead = leads[0];
const patch = { stage };
if (STAMP[stage]) patch[STAMP[stage]] = new Date().toISOString();

const { error } = await supabase.from('leads').update(patch).eq('id', lead.id);
if (error) { console.error(error.message); process.exit(1); }
console.log(`✓ Moved ${lead.handle || lead.name}: ${lead.stage} → ${stage}`);
