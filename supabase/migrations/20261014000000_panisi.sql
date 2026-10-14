create extension if not exists pgcrypto;

create type public.panisi_role as enum ('admin', 'verifikator', 'kontributor');
create type public.submission_status as enum ('pending', 'approved', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default 'Kontributor',
  role public.panisi_role not null default 'kontributor',
  bio text not null default '' check (char_length(bio) <= 1000),
  created_at timestamptz not null default now()
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null check (char_length(description) between 1 and 2000),
  youtube_url text not null,
  document_path text not null,
  status public.submission_status not null default 'pending',
  feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index submissions_profile_id_created_at_idx
  on public.submissions (profile_id, created_at desc);
create index submissions_status_created_at_idx
  on public.submissions (status, created_at desc);

create or replace function public.current_user_has_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role::text = any(required_roles)
  );
$$;

create or replace function public.create_panisi_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), 'Kontributor')
  );
  return new;
end;
$$;

create trigger on_auth_user_created_panisi
  after insert on auth.users
  for each row execute procedure public.create_panisi_profile();

create or replace function public.prevent_self_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
    and (auth.uid() is not null)
    and not public.current_user_has_role(array['admin']) then
    raise exception 'Only an administrator can change account roles';
  end if;
  return new;
end;
$$;

create trigger prevent_panisi_role_change
  before update on public.profiles
  for each row execute procedure public.prevent_self_role_change();

create or replace function public.touch_submission_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_panisi_submission_updated_at
  before update on public.submissions
  for each row execute procedure public.touch_submission_updated_at();

alter table public.profiles enable row level security;
alter table public.submissions enable row level security;

create policy "Users can read permitted profiles"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or public.current_user_has_role(array['admin', 'verifikator'])
  );

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) or public.current_user_has_role(array['admin']))
  with check (id = (select auth.uid()) or public.current_user_has_role(array['admin']));

create policy "Contributors can submit their own work"
  on public.submissions for insert to authenticated
  with check (
    profile_id = (select auth.uid())
    and public.current_user_has_role(array['kontributor'])
  );

create policy "Users can read permitted submissions"
  on public.submissions for select to authenticated
  using (
    profile_id = (select auth.uid())
    or public.current_user_has_role(array['admin', 'verifikator'])
  );

create policy "Reviewers can update submissions"
  on public.submissions for update to authenticated
  using (public.current_user_has_role(array['admin', 'verifikator']))
  with check (public.current_user_has_role(array['admin', 'verifikator']));

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.submissions to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contribution-documents', 'contribution-documents', false, 20971520, array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Contributors can upload their own PDFs"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'contribution-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.current_user_has_role(array['kontributor'])
  );

create policy "Users can read permitted contribution PDFs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'contribution-documents'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or public.current_user_has_role(array['admin', 'verifikator'])
    )
  );

create policy "Contributors can delete their own PDFs"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'contribution-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.current_user_has_role(array['kontributor'])
  );
