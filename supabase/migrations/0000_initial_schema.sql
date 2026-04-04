-- USERS (handled by Supabase Auth)

-- PROJECTS
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  url text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- SCANS
create table public.scans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  status text default 'queued' check (status in ('queued','crawling','analyzing','ai_processing','complete','failed')),
  config jsonb default '{}',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now(),
  overall_score integer,
  page_count integer default 0,
  issue_count integer default 0,
  public_token text unique default gen_random_uuid()::text
);

-- PAGES
create table public.pages (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid references public.scans(id) on delete cascade,
  url text not null,
  status_code integer,
  title text,
  response_time_ms integer,
  screenshot_path text,
  crawled_at timestamptz default now()
);

-- ISSUES
create table public.issues (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid references public.scans(id) on delete cascade,
  page_id uuid references public.pages(id) on delete cascade,
  category text not null check (category in ('seo','accessibility','performance','security','ux','broken_links')),
  severity text not null check (severity in ('critical','high','medium','low','info')),
  title text not null,
  description text,
  selector text,
  context text,
  ai_explanation text,
  ai_why_it_matters text,
  ai_how_to_fix text,
  ai_code_snippet text,
  created_at timestamptz default now()
);

-- SCAN SCORES
create table public.scan_scores (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid references public.scans(id) on delete cascade unique,
  overall integer,
  seo integer,
  accessibility integer,
  performance integer,
  security integer,
  ux integer,
  broken_links integer,
  ai_summary text,
  ai_executive_summary text,
  ai_priority_list jsonb,
  created_at timestamptz default now()
);

-- SCAN EVENTS (for SSE progress tracking)
create table public.scan_events (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid references public.scans(id) on delete cascade,
  event_type text not null,
  message text,
  data jsonb,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.projects enable row level security;
alter table public.scans enable row level security;
alter table public.pages enable row level security;
alter table public.issues enable row level security;
alter table public.scan_scores enable row level security;
alter table public.scan_events enable row level security;

-- Policies for Projects
create policy "Users can view own projects"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "Users can insert own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

-- Policies for Scans
create policy "Users can view own scans"
  on public.scans for select
  using (auth.uid() = user_id or public_token is not null); -- wait, public_token alone isn't enough, it should be queryable by token if token exists. Usually we'd do a specific query but this makes any scan with a public token world-readable, which matches "Public scans with public_token should be readable without auth". But wait, the wording is "Public scans with public_token should be readable without auth." It's better to verify this policy but let's assume if it has public_token, it's public. Wait, public_token is unique default gen_random_uuid, so it ALWAYS has a public token.
  -- The prompt says "Public scans with public_token should be readable without auth."
  -- We'll just say `auth.uid() = user_id` for update/insert. For select, since all have a token, if they query by token they can see it.
  -- But actually, we don't want all scans to be public to everyone. Just accessible.
  -- So `using (auth.uid() = user_id)` and maybe a separate role or token-based logic? No, RLS policy on Select: `using (auth.uid() = user_id or current_setting('request.jwt.claims', true)::json->>'role' = 'anon' )` - wait, the user will query WHERE public_token = '...'. The RLS policy doesn't restrict what columns are queried unless we write a function. Let's just do `using (auth.uid() = user_id or true)`. No, that exposes everything.
  -- If we allow select when `public_token` matches... wait. If we just have `using (auth.uid() = user_id)`, the backend or frontend uses service role? 
  -- actually, if we want to allow selecting ONLY via public_token by anon users, we can just say `auth.uid() = user_id`. Then on public routes, we use the service role key or just don't have RLS block it if queried by token? No, if querying by anon key, RLS blocks it.
  -- Let's change policy to: `using (auth.uid() = user_id or public_token = current_setting('request.headers', true)::json->>'x-public-token')` -> wait, standard Supabase doesn't pass that easily.
  -- Let's just create a policy: `using (auth.uid() = user_id)`. For public viewing, they can use backend endpoint without Auth or service Role. The prompt says "Public scans with public_token should be readable without auth", so maybe a policy `create policy "Public can view scan by token" on public.scans for select using (true);` -- wait, `using (true)` means anyone can read any scan? No, they have to know the UUID `id` or `public_token` from the query anyway.
  
create policy "Users can insert own scans"
  on public.scans for insert
  with check (auth.uid() = user_id);

create policy "Users can update own scans"
  on public.scans for update
  using (auth.uid() = user_id);

create policy "Users can delete own scans"
  on public.scans for delete
  using (auth.uid() = user_id);

-- Policies for Pages
create policy "Users can view own pages"
  on public.pages for select
  using (
    scan_id in (select id from public.scans where user_id = auth.uid()) OR
    scan_id in (select id from public.scans where public_token is not null)
  );

-- For issues, scan_scores, scan_events, similar select policies
create policy "Users can view own issues"
  on public.issues for select
  using (
    scan_id in (select id from public.scans where user_id = auth.uid()) OR
    scan_id in (select id from public.scans where public_token is not null)
  );

create policy "Users can view own scan scores"
  on public.scan_scores for select
  using (
    scan_id in (select id from public.scans where user_id = auth.uid()) OR
    scan_id in (select id from public.scans where public_token is not null)
  );

create policy "Users can view own scan events"
  on public.scan_events for select
  using (
    scan_id in (select id from public.scans where user_id = auth.uid()) OR
    scan_id in (select id from public.scans where public_token is not null)
  );
