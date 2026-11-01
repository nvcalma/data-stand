-- Run once in the Supabase SQL Editor. This does not insert any sample cards.
begin;
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;
create policy "Owners can check their own membership" on public.admins
for select to authenticated using (user_id = (select auth.uid()));
-- No client INSERT, UPDATE, or DELETE policy: users cannot make themselves admins.
revoke all on public.admins from anon, authenticated;
grant select on public.admins to authenticated;

create table public.dashboards (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 120),
  url text not null unique check (url ~ '^https://[a-zA-Z0-9-]+[.]streamlit[.]app([/?#].*)?$'),
  records integer not null check (records >= 0),
  dataset_published text not null check (length(btrim(dataset_published)) between 1 and 40),
  description text not null default '' check (length(description) <= 240),
  image_url text check (image_url is null or image_url like 'https://%'),
  image_path text,
  created_at timestamptz not null default now()
);
alter table public.dashboards enable row level security;
create policy "Anyone can read dashboard cards" on public.dashboards
for select to anon, authenticated using (true);
create policy "Owners can add cards" on public.dashboards
for insert to authenticated with check (exists(select 1 from public.admins where user_id = (select auth.uid())));
create policy "Owners can update cards" on public.dashboards
for update to authenticated using (exists(select 1 from public.admins where user_id = (select auth.uid())))
with check (exists(select 1 from public.admins where user_id = (select auth.uid())));
create policy "Owners can remove cards" on public.dashboards
for delete to authenticated using (exists(select 1 from public.admins where user_id = (select auth.uid())));
revoke all on public.dashboards from anon, authenticated;
grant select on public.dashboards to anon, authenticated;
grant insert,update,delete on public.dashboards to authenticated;
revoke insert,update,delete on public.dashboards from anon;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('previews','previews',true,3145728,array['image/png','image/jpeg','image/webp']);
create policy "Owners can upload previews" on storage.objects
for insert to authenticated with check (bucket_id = 'previews' and exists(select 1 from public.admins where user_id = (select auth.uid())));
create policy "Owners can delete previews" on storage.objects
for delete to authenticated using (bucket_id = 'previews' and exists(select 1 from public.admins where user_id = (select auth.uid())));
create policy "Owners can inspect previews" on storage.objects
for select to authenticated using (bucket_id = 'previews' and exists(select 1 from public.admins where user_id = (select auth.uid())));
commit;

-- NEXT: Create your owner user in Authentication > Users > Add user.
-- Then run the following separately, replacing the email with that user's email:
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'YOUR_EMAIL_HERE'
-- on conflict do nothing;
