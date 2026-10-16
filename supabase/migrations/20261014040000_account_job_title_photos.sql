alter table public.profiles
  add column job_title text not null default '',
  add column profile_photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  true,
  512000,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace view public.contributor_public_profiles
with (security_invoker = false)
as
  select
    id,
    full_name,
    area_of_expertise,
    widyaiswara_experience,
    job_title,
    profile_photo_path
  from public.profiles
  where role = 'kontributor';

grant select on public.contributor_public_profiles to anon, authenticated;
