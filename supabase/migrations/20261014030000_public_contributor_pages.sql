create or replace view public.published_submissions
with (security_invoker = false)
as
  select
    s.id,
    s.title,
    s.description,
    s.youtube_url,
    s.created_at,
    p.full_name,
    s.profile_id
  from public.submissions s
  join public.profiles p on p.id = s.profile_id
  where s.status = 'approved'
    and s.is_published = true;

grant select on public.published_submissions to anon, authenticated;

create or replace view public.contributor_public_profiles
with (security_invoker = false)
as
  select
    id,
    full_name,
    area_of_expertise,
    widyaiswara_experience
  from public.profiles
  where role = 'kontributor';

grant select on public.contributor_public_profiles to anon, authenticated;
