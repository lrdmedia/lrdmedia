-- =============================================================================
-- LRD Media - Fitness Marketing Agency Client Portal
-- Supabase Database Schema
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. PROFILES (extends auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text not null,
  full_name   text,
  role        text not null check (role in ('agency', 'client')),
  created_at  timestamptz not null default now()
);

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'client')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. CLIENTS
-- ---------------------------------------------------------------------------
create table public.clients (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references public.profiles(id) on delete set null,
  business_name         text not null,
  service_start_date    date,
  status                text not null default 'green' check (status in ('green', 'amber', 'red')),
  goals_90_day          text,
  ideal_buyer_persona   text,
  core_offer            text,
  key_proof_points      text,
  content_pillars       jsonb,
  meta_access_token     text,          -- store encrypted at app layer or via vault
  meta_token_expires_at timestamptz,
  instagram_account_id  text,
  meta_ad_account_id    text,
  meta_page_id          text,
  meta_connected        boolean not null default false,
  instagram_connected   boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. CONTENT ITEMS
-- ---------------------------------------------------------------------------
create table public.content_items (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  title           text not null,
  description     text,
  content_type    text not null check (content_type in ('reel', 'post', 'story', 'carousel')),
  scheduled_date  date,
  status          text not null default 'draft'
                    check (status in ('draft', 'pending_approval', 'approved', 'published', 'revision_requested')),
  media_url       text,
  thumbnail_url   text,
  feedback        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. MONTHLY REPORTS
-- ---------------------------------------------------------------------------
create table public.monthly_reports (
  id                      uuid primary key default gen_random_uuid(),
  client_id               uuid not null references public.clients(id) on delete cascade,
  month                   date not null,   -- always first of the month
  reach                   integer,
  impressions             integer,
  enquiries               integer,
  new_clients             integer,
  ad_spend                numeric,
  cost_per_lead           numeric,
  what_worked             text,
  plan_next_month         text,
  ad_performance_summary  text,
  published               boolean not null default false,
  published_at            timestamptz,
  created_at              timestamptz not null default now(),
  unique (client_id, month)
);

-- ---------------------------------------------------------------------------
-- 5. AGENCY NOTES (one per client, agency-only)
-- ---------------------------------------------------------------------------
create table public.agency_notes (
  id                      uuid primary key default gen_random_uuid(),
  client_id               uuid not null unique references public.clients(id) on delete cascade,
  ibp_profile             text,
  content_wins            text,
  ad_wins                 text,
  personality_notes       text,
  strategy_call_summaries text,
  objections              text,
  free_notes              text,
  updated_at              timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------
create index idx_profiles_role            on public.profiles (role);
create index idx_clients_user_id          on public.clients (user_id);
create index idx_clients_status           on public.clients (status);
create index idx_content_items_client_id  on public.content_items (client_id);
create index idx_content_items_status     on public.content_items (status);
create index idx_content_items_scheduled  on public.content_items (scheduled_date);
create index idx_monthly_reports_client   on public.monthly_reports (client_id);
create index idx_monthly_reports_month    on public.monthly_reports (month);
create index idx_agency_notes_client_id   on public.agency_notes (client_id);

-- ---------------------------------------------------------------------------
-- UPDATED_AT TRIGGER FUNCTION
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

create trigger trg_content_items_updated_at
  before update on public.content_items
  for each row execute function public.set_updated_at();

create trigger trg_agency_notes_updated_at
  before update on public.agency_notes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- HELPER: get the current user's role from profiles
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql
stable
security definer set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- HELPER: get the client_id linked to the current user
-- ---------------------------------------------------------------------------
create or replace function public.current_user_client_id()
returns uuid
language sql
stable
security definer set search_path = ''
as $$
  select id from public.clients where user_id = auth.uid();
$$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- ---- PROFILES ---------------------------------------------------------------
alter table public.profiles enable row level security;

-- Agency can see all profiles
create policy "agency_read_all_profiles"
  on public.profiles for select
  using (public.current_user_role() = 'agency');

-- Agency can update all profiles
create policy "agency_update_all_profiles"
  on public.profiles for update
  using (public.current_user_role() = 'agency');

-- Clients can read their own profile
create policy "client_read_own_profile"
  on public.profiles for select
  using (id = auth.uid());

-- Clients can update their own profile
create policy "client_update_own_profile"
  on public.profiles for update
  using (id = auth.uid());

-- ---- CLIENTS ----------------------------------------------------------------
alter table public.clients enable row level security;

-- Agency full access
create policy "agency_select_clients"
  on public.clients for select
  using (public.current_user_role() = 'agency');

create policy "agency_insert_clients"
  on public.clients for insert
  with check (public.current_user_role() = 'agency');

create policy "agency_update_clients"
  on public.clients for update
  using (public.current_user_role() = 'agency');

create policy "agency_delete_clients"
  on public.clients for delete
  using (public.current_user_role() = 'agency');

-- Client can read only their own record
create policy "client_read_own_client"
  on public.clients for select
  using (user_id = auth.uid());

-- ---- CONTENT ITEMS ----------------------------------------------------------
alter table public.content_items enable row level security;

-- Agency full access
create policy "agency_select_content"
  on public.content_items for select
  using (public.current_user_role() = 'agency');

create policy "agency_insert_content"
  on public.content_items for insert
  with check (public.current_user_role() = 'agency');

create policy "agency_update_content"
  on public.content_items for update
  using (public.current_user_role() = 'agency');

create policy "agency_delete_content"
  on public.content_items for delete
  using (public.current_user_role() = 'agency');

-- Client can read their own content items
create policy "client_read_own_content"
  on public.content_items for select
  using (client_id = public.current_user_client_id());

-- Client can update feedback field only (status stays untouched by column grants)
create policy "client_update_feedback"
  on public.content_items for update
  using  (client_id = public.current_user_client_id())
  with check (
    -- Ensure the client only changes feedback; all other columns stay the same
    client_id = public.current_user_client_id()
  );

-- Restrict which columns clients may write to via a grant
-- (RLS alone cannot restrict columns; we pair it with column-level grants)
revoke update on public.content_items from authenticated;
grant  update (feedback) on public.content_items to authenticated;
-- Agency role bypasses via service_role or separate grants if needed.
-- For agency users operating through the app's service_role key, column
-- restrictions do not apply. If agency users use the anon/authenticated
-- key, grant them all columns explicitly:
-- (Uncomment if agency users also go through the authenticated role)
-- grant update on public.content_items to authenticated;

-- ---- MONTHLY REPORTS --------------------------------------------------------
alter table public.monthly_reports enable row level security;

-- Agency full access
create policy "agency_select_reports"
  on public.monthly_reports for select
  using (public.current_user_role() = 'agency');

create policy "agency_insert_reports"
  on public.monthly_reports for insert
  with check (public.current_user_role() = 'agency');

create policy "agency_update_reports"
  on public.monthly_reports for update
  using (public.current_user_role() = 'agency');

create policy "agency_delete_reports"
  on public.monthly_reports for delete
  using (public.current_user_role() = 'agency');

-- Client can read only published reports for their own account
create policy "client_read_own_published_reports"
  on public.monthly_reports for select
  using (
    client_id = public.current_user_client_id()
    and published = true
  );

-- ---- AGENCY NOTES -----------------------------------------------------------
alter table public.agency_notes enable row level security;

-- Agency full access - clients have NO policies so they see nothing
create policy "agency_select_notes"
  on public.agency_notes for select
  using (public.current_user_role() = 'agency');

create policy "agency_insert_notes"
  on public.agency_notes for insert
  with check (public.current_user_role() = 'agency');

create policy "agency_update_notes"
  on public.agency_notes for update
  using (public.current_user_role() = 'agency');

create policy "agency_delete_notes"
  on public.agency_notes for delete
  using (public.current_user_role() = 'agency');
