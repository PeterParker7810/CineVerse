-- Private CineVerse profiles and saved appearance/discovery preferences.
-- Additive migration: existing wishlist and auth data are untouched.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  username text check (username is null or username ~ '^[a-z0-9_]{3,24}$'),
  nickname text not null default '' check (char_length(nickname) <= 40),
  bio text not null default '' check (char_length(bio) <= 220),
  favorite_title text not null default '' check (char_length(favorite_title) <= 100),
  favorite_genres text[] not null default '{}',
  preferred_languages text[] not null default '{}',
  preferred_countries text[] not null default '{}',
  favorite_people text[] not null default '{}',
  avatar_path text,
  avatar_preset text not null default 'orbit',
  avatar_position smallint not null default 50 check (avatar_position between 0 and 100),
  banner_path text,
  banner_preset text not null default 'crimson',
  banner_position smallint not null default 50 check (banner_position between 0 and 100),
  preferences jsonb not null default '{}'::jsonb check (jsonb_typeof(preferences) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_username_unique
  on public.profiles (lower(username))
  where username is not null and username <> '';

alter table public.profiles enable row level security;
grant select, insert, update on public.profiles to authenticated;

drop policy if exists "Profile owners can read their profile" on public.profiles;
create policy "Profile owners can read their profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Profile owners can create their profile" on public.profiles;
create policy "Profile owners can create their profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Profile owners can update their profile" on public.profiles;
create policy "Profile owners can update their profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cineverse-profile-media', 'cineverse-profile-media', false, 15728640, array['image/webp'])
on conflict (id) do nothing;

drop policy if exists "Profile owners can read their media" on storage.objects;
create policy "Profile owners can read their media" on storage.objects
  for select to authenticated
  using (bucket_id = 'cineverse-profile-media' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Profile owners can upload their media" on storage.objects;
create policy "Profile owners can upload their media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'cineverse-profile-media' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Profile owners can replace their media" on storage.objects;
create policy "Profile owners can replace their media" on storage.objects
  for update to authenticated
  using (bucket_id = 'cineverse-profile-media' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'cineverse-profile-media' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Profile owners can delete their media" on storage.objects;
create policy "Profile owners can delete their media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'cineverse-profile-media' and (storage.foldername(name))[1] = (select auth.uid()::text));

