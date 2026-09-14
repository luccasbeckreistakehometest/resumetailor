-- ResumeTailor — Supabase schema
-- Run this in the Supabase SQL editor after creating your project.

-- 1) Profiles: one row per auth user, holds the credit balance + plan.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  credits integer not null default 1,          -- 1 free credit on signup (one full kit)
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

-- 2) CVs: the user's saved/purchased tailored kits (the cloud dashboard).
create table if not exists public.cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Resume',
  mode text not null default 'tailor',
  match_after integer not null default 0,
  data jsonb not null,                          -- the full generated result
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cvs_user_idx on public.cvs(user_id, created_at desc);

-- 3) Payments: audit trail; the webhook grants credits and writes a row here.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  provider text not null,                       -- 'mercadopago' | 'stripe'
  external_id text,                             -- provider payment/preference id (idempotency)
  amount_cents integer,
  currency text,
  credits integer not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
create unique index if not exists payments_external_idx on public.payments(provider, external_id);

-- Auto-create a profile (with 1 free credit) when a user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security: users only see/modify their own data.
alter table public.profiles enable row level security;
alter table public.cvs enable row level security;
alter table public.payments enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "own cvs" on public.cvs;
create policy "own cvs" on public.cvs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own payments" on public.payments;
create policy "own payments" on public.payments
  for select using (auth.uid() = user_id);

-- NOTE: credits are decremented/granted only by server code using the
-- service-role key (which bypasses RLS) — never trust the client for credits.
