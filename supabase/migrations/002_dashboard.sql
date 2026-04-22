-- =============================================================================
-- LRD Media — Work Dashboard additions
-- Adds: leads (pipeline), scripts (content pipeline), tasks, dashboard_settings
-- All tables are agency-only. Clients have no access.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- LEADS (pipeline)
-- ---------------------------------------------------------------------------
create table public.leads (
  id             uuid primary key default gen_random_uuid(),
  handle         text,                  -- IG handle or similar
  name           text,
  business_name  text,
  stage          text not null default 'lead'
                   check (stage in ('lead', 'qualified', 'vsl_sent', 'call_booked',
                                    'call_done', 'proposal', 'signed', 'lost')),
  source         text,                  -- 'manychat', 'dm', 'outreach', 'referral', 'ad'
  dm_snippet     text,
  notes          text,
  qualified_at   timestamptz,
  vsl_sent_at    timestamptz,
  call_booked_at timestamptz,
  call_done_at   timestamptz,
  signed_at      timestamptz,
  lost_reason    text,
  client_id      uuid references public.clients(id) on delete set null,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- SCRIPTS (your own content pipeline — separate from clients' content_items)
-- ---------------------------------------------------------------------------
create table public.scripts (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  body                text,
  pillar              text check (pillar in ('proof', 'education', 'bts')),
  status              text not null default 'idea'
                        check (status in ('idea', 'script', 'to_film', 'filmed',
                                          'editing', 'approved', 'scheduled', 'posted')),
  content_type        text check (content_type in ('reel', 'post', 'story', 'carousel')),
  scheduled_post_date date,
  posted_at           timestamptz,
  hook                text,
  cta                 text,
  notes               text,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- TASKS
-- ---------------------------------------------------------------------------
create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  done        boolean not null default false,
  done_at     timestamptz,
  due_date    date,
  priority    text check (priority in ('low', 'med', 'high')),
  client_id   uuid references public.clients(id) on delete set null,
  lead_id     uuid references public.leads(id)   on delete set null,
  script_id   uuid references public.scripts(id) on delete set null,
  notes       text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- DASHBOARD_SETTINGS (singleton row — revenue target, manual monthly revenue, etc.)
-- ---------------------------------------------------------------------------
create table public.dashboard_settings (
  id                       integer primary key default 1 check (id = 1),
  revenue_target_monthly   numeric not null default 10000,
  revenue_manual_override  numeric,     -- used until Stripe is wired
  current_month_label      text,        -- e.g. 'Apr 2026'
  updated_at               timestamptz not null default now()
);

insert into public.dashboard_settings (id) values (1) on conflict do nothing;

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------
create index idx_leads_stage             on public.leads (stage);
create index idx_leads_created_at        on public.leads (created_at desc);
create index idx_scripts_status          on public.scripts (status);
create index idx_scripts_scheduled_date  on public.scripts (scheduled_post_date);
create index idx_tasks_done              on public.tasks (done);
create index idx_tasks_due_date          on public.tasks (due_date);
create index idx_tasks_client_id         on public.tasks (client_id);
create index idx_tasks_lead_id           on public.tasks (lead_id);
create index idx_tasks_script_id         on public.tasks (script_id);

-- ---------------------------------------------------------------------------
-- UPDATED_AT TRIGGERS (reuses existing set_updated_at function)
-- ---------------------------------------------------------------------------
create trigger trg_leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

create trigger trg_scripts_updated_at
  before update on public.scripts
  for each row execute function public.set_updated_at();

create trigger trg_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create trigger trg_dashboard_settings_updated_at
  before update on public.dashboard_settings
  for each row execute function public.set_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY — agency only across the board
-- =============================================================================

-- ---- LEADS ------------------------------------------------------------------
alter table public.leads enable row level security;

create policy "agency_select_leads" on public.leads for select
  using (public.current_user_role() = 'agency');
create policy "agency_insert_leads" on public.leads for insert
  with check (public.current_user_role() = 'agency');
create policy "agency_update_leads" on public.leads for update
  using (public.current_user_role() = 'agency');
create policy "agency_delete_leads" on public.leads for delete
  using (public.current_user_role() = 'agency');

-- ---- SCRIPTS ----------------------------------------------------------------
alter table public.scripts enable row level security;

create policy "agency_select_scripts" on public.scripts for select
  using (public.current_user_role() = 'agency');
create policy "agency_insert_scripts" on public.scripts for insert
  with check (public.current_user_role() = 'agency');
create policy "agency_update_scripts" on public.scripts for update
  using (public.current_user_role() = 'agency');
create policy "agency_delete_scripts" on public.scripts for delete
  using (public.current_user_role() = 'agency');

-- ---- TASKS ------------------------------------------------------------------
alter table public.tasks enable row level security;

create policy "agency_select_tasks" on public.tasks for select
  using (public.current_user_role() = 'agency');
create policy "agency_insert_tasks" on public.tasks for insert
  with check (public.current_user_role() = 'agency');
create policy "agency_update_tasks" on public.tasks for update
  using (public.current_user_role() = 'agency');
create policy "agency_delete_tasks" on public.tasks for delete
  using (public.current_user_role() = 'agency');

-- ---- DASHBOARD_SETTINGS -----------------------------------------------------
alter table public.dashboard_settings enable row level security;

create policy "agency_select_settings" on public.dashboard_settings for select
  using (public.current_user_role() = 'agency');
create policy "agency_update_settings" on public.dashboard_settings for update
  using (public.current_user_role() = 'agency');
