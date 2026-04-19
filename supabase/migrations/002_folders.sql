-- Folders table
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  created_at timestamptz default now()
);

alter table public.folders enable row level security;

create policy "Users manage own folders" on public.folders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Add folder_id to tracks (no-op if already exists)
alter table public.tracks add column if not exists folder_id uuid references public.folders(id) on delete set null;

create index if not exists tracks_folder_id_idx on public.tracks(folder_id);
