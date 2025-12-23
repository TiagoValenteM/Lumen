-- Create user_badges table to store level/badge progress
create extension if not exists "pgcrypto";

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_key text not null,
  badge_title text not null,
  badge_level int,
  icon_url text,
  metadata jsonb default '{}'::jsonb,
  awarded_at timestamptz not null default now()
);

create unique index if not exists user_badges_user_badge_key_idx
  on public.user_badges (user_id, badge_key);
