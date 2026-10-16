-- Run this migration in the Supabase SQL editor or with the Supabase CLI.
create table if not exists public.wishlist (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  media_id text not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint wishlist_user_media_unique unique (user_id, media_id, media_type)
);

alter table public.wishlist enable row level security;
grant select, insert, delete on public.wishlist to authenticated;
grant usage, select on sequence public.wishlist_id_seq to authenticated;
create policy "Users can read their own wishlist" on public.wishlist
  for select to authenticated using (auth.uid() = user_id);
create policy "Users can add to their own wishlist" on public.wishlist
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can remove from their own wishlist" on public.wishlist
  for delete to authenticated using (auth.uid() = user_id);
