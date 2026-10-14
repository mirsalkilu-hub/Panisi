create or replace view public.verified_submissions
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
  where s.status = 'approved';

grant select on public.verified_submissions to anon, authenticated;
