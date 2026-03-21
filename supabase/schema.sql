-- ═══════════════════════════════════════════════════════
-- BETEL SPORT DASHBOARD — SUPABASE SCHEMA
-- Execute no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── PROFILES (extends auth.users) ──────────────────────
create table public.profiles (
  id           uuid references auth.users(id) on delete cascade primary key,
  name         text,
  role         text default 'user',
  telegram_chat_id  text,
  telegram_token    text,
  telegram_enabled  boolean default true,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── ANALYSES ───────────────────────────────────────────
create table public.analyses (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  title           text not null,
  source_type     text not null, -- pdf | xlsx | csv | xml | url | db | image | audio | video | nextcloud
  source_name     text,
  source_url      text,          -- Nextcloud path or external URL
  insights        jsonb,         -- array of 10 insight objects
  charts_config   jsonb,         -- array of 10 chart configs (4 visible + 6 expandable)
  kpis            jsonb,         -- key metrics extracted
  raw_text        text,          -- extracted text stored for re-analysis
  is_public       boolean default false,
  public_token    text unique default encode(gen_random_bytes(16), 'hex'),
  telegram_sent   boolean default false,
  telegram_enabled boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.analyses enable row level security;

create policy "Users can CRUD own analyses"
  on public.analyses for all
  using (auth.uid() = user_id);

create policy "Public analyses are viewable by token"
  on public.analyses for select
  using (is_public = true);

-- ── SHARE HISTORY ──────────────────────────────────────
create table public.share_history (
  id            uuid default uuid_generate_v4() primary key,
  analysis_id   uuid references public.analyses(id) on delete cascade not null,
  user_id       uuid references auth.users(id) on delete cascade not null,
  channel       text not null, -- telegram | pdf | public_link
  payload       jsonb,
  delivered     boolean default false,
  error_msg     text,
  created_at    timestamptz default now()
);

alter table public.share_history enable row level security;

create policy "Users can view own share history"
  on public.share_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own share history"
  on public.share_history for insert
  with check (auth.uid() = user_id);

-- ── INDEXES ────────────────────────────────────────────
create index analyses_user_id_idx on public.analyses(user_id);
create index analyses_public_token_idx on public.analyses(public_token) where is_public = true;
create index share_history_analysis_idx on public.share_history(analysis_id);

-- ── UPDATED_AT TRIGGER ─────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_analyses_updated_at
  before update on public.analyses
  for each row execute function public.set_updated_at();

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── ADD STATUS TO PROFILES (run if not exists) ─────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text default 'active';
