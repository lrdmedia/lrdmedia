-- Optional seed data for the work dashboard.
-- Run AFTER supabase/migrations/002_dashboard.sql has been applied.
-- Clears existing seed rows first so it's idempotent.

truncate table public.tasks   restart identity cascade;
truncate table public.leads   restart identity cascade;
truncate table public.scripts restart identity cascade;

-- ---- TASKS ------------------------------------------------------------------
insert into public.tasks (title, due_date, priority) values
  ('Film script one — locked and ready',                   current_date,                    'high'),
  ('Edit proof reel — Storme before/after',                current_date,                    'high'),
  ('DM 3 new prospects with value-first message',          current_date,                    'med'),
  ('Review Dan''s new lift-review workflow',               current_date + 1,                'med'),
  ('Call Storme — check in on new members this week',      current_date + 2,                'low'),
  ('Write next education post — "why organic alone fails"',current_date + 3,                'med'),
  ('Update VSL section 5 with fresh Storme numbers',       current_date + 5,                'low'),
  ('Monthly report for Storme CrossFit',                   current_date + 7,                'high'),
  ('Check Meta ads CPL — cold audience',                   current_date - 1,                'high'),
  ('Rebook physio',                                        current_date - 2,                'low');

-- ---- LEADS ------------------------------------------------------------------
insert into public.leads (handle, name, business_name, stage, source, dm_snippet, notes) values
  ('@ironworks_gym',       'Sam Harding',   'Ironworks Gym',      'lead',        'manychat', 'Typed SYSTEM, small box gym near Stafford',      null),
  ('@evolveptstudio',      'Meg Carr',      'Evolve PT Studio',   'qualified',   'dm',       'Has 40 members, ad budget £500/mo, wants leads', 'Pilates + small group PT — good fit'),
  ('@crossfitfortitude',   null,            'CrossFit Fortitude', 'qualified',   'outreach', null,                                              'Messaged cold from IG, responded within an hour'),
  ('@j_stanleyfitness',    'Jay Stanley',   null,                 'vsl_sent',    'manychat', 'Online coach, weightlifting niche',              'Sent VSL Tuesday, no reply yet'),
  ('@lift_withkaty',       'Katy Wren',     'Lift With Katy',     'call_booked', 'dm',       'Coaches women in strength training',             'Call booked Thu 2pm'),
  ('@themuscleprojectuk',  'Rob Price',     'The Muscle Project', 'call_done',   'referral', null,                                              'Good call, sending proposal Friday'),
  ('@pb_athletic',         'Paul Brown',    'PB Athletic',        'proposal',    'outreach', null,                                              'Proposal out, 3mo minimum, decision by Monday'),
  ('@stormecrossfit',      'Tom Storme',    'Storme CrossFit',    'signed',      'referral', null,                                              'Longest-running client. Case study.'),
  ('@dan_oly',             'Dan Thomas',    null,                 'signed',      'referral', null,                                              'Oly coaching — lift review system.'),
  ('@grit_studiosuk',      null,            'Grit Studios',       'lost',        'dm',       null,                                              'Not ready to invest — parked.');

-- Stamp historical timestamps for signed leads so flow feels real
update public.leads set
  qualified_at   = now() - interval '45 days',
  vsl_sent_at    = now() - interval '42 days',
  call_booked_at = now() - interval '40 days',
  call_done_at   = now() - interval '38 days',
  signed_at      = now() - interval '35 days'
where handle in ('@stormecrossfit', '@dan_oly');

-- ---- SCRIPTS ----------------------------------------------------------------
insert into public.scripts (title, pillar, status, content_type, hook, body, cta, scheduled_post_date) values
  ('Script One — Right people, not more followers',
   'education', 'approved', 'reel',
   'If you''re a personal trainer or online coach…',
   'If you''re a personal trainer or online coach… you''ve probably realised that just posting on social media isn''t working like it used to. And that''s not a coincidence. [full script lives here]',
   'DM me the word SYSTEM', current_date + 1),

  ('Storme CrossFit — £8k in the red to packed classes',
   'proof',     'scheduled', 'reel',
   'Two years ago this gym was losing £8,000 every month.',
   'Case study breakdown — before/after, what we changed, what it looks like today.',
   'DM me SYSTEM if you own a gym', current_date + 3),

  ('Dan — 1 million reach, zero clients, then the lift-review offer',
   'proof',     'editing',  'reel',
   'He was reaching a million people a month on Instagram…',
   'The trap of vanity metrics. The shift to a value-driven offer. The 10-15 new clients a month.',
   'DM me SYSTEM', current_date + 5),

  ('Why the fitness industry is harder than most',
   'education', 'filmed',   'reel',
   'Every feed is flooded. Everyone looks the same.',
   'Unpack WHY fitness marketing is uniquely brutal right now.',
   'DM SYSTEM', null),

  ('BTS — Shoot day at CrossFit Fortitude',
   'bts',       'to_film',  'story',
   null,
   'Quick day-in-the-life sequence from a shoot — gear, prep, class footage.',
   null, null),

  ('Why word-of-mouth alone stops scaling',
   'education', 'script',   'reel',
   'Word of mouth is lovely until it stops.',
   null, 'DM SYSTEM', null),

  ('Idea — calling out "fill out this form" gatekeeping',
   'education', 'idea',     'reel',
   'Ever filled in a 12-question form just to find out a price?',
   null, null, null),

  ('Posted — Ultramarathon lesson for content consistency',
   'bts',       'posted',   'reel',
   null,
   'Lesson from running 100 miles — showed up anyway.',
   null, current_date - 6);

update public.scripts
set posted_at = now() - interval '6 days'
where status = 'posted';

-- ---- REVENUE ----------------------------------------------------------------
update public.dashboard_settings
set revenue_target_monthly = 10000,
    revenue_manual_override = 3500,
    current_month_label = to_char(current_date, 'Mon YYYY')
where id = 1;
