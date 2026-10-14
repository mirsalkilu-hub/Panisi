alter table public.submissions
  add column content_type text not null default 'video'
    check (content_type in ('video', 'ebook'));

alter table public.submissions
  alter column youtube_url drop not null,
  alter column document_path drop not null;

alter table public.submissions
  add constraint submissions_content_type_fields_check
  check (
    (content_type = 'video' and youtube_url is not null)
    or
    (content_type = 'ebook' and youtube_url is null and document_path is not null)
  );

create or replace function public.enforce_submission_role_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if public.current_user_has_role(array['admin']) then
    if old.status <> 'approved'
      or new.status is distinct from old.status
      or new.profile_id is distinct from old.profile_id
      or new.content_type is distinct from old.content_type
      or new.document_path is distinct from old.document_path
      or new.feedback is distinct from old.feedback then
      raise exception 'Administrators can only edit approved post content and publishing state';
    end if;
    if new.is_published and new.status <> 'approved' then
      raise exception 'Only verified posts can be published';
    end if;
    new.published_at = case
      when new.is_published then coalesce(old.published_at, now())
      else null
    end;
  elsif public.current_user_has_role(array['verifikator']) then
    if old.status <> 'pending'
      or new.status not in ('approved', 'rejected')
      or new.profile_id is distinct from old.profile_id
      or new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.content_type is distinct from old.content_type
      or new.youtube_url is distinct from old.youtube_url
      or new.document_path is distinct from old.document_path
      or new.is_published is distinct from old.is_published
      or new.published_at is distinct from old.published_at then
      raise exception 'Verifiers can only review pending submissions';
    end if;
    if new.status = 'rejected' and coalesce(btrim(new.feedback), '') = '' then
      raise exception 'A rejection reason is required';
    end if;
  else
    raise exception 'Only administrators and verifiers can update submissions';
  end if;
  return new;
end;
$$;

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
    s.profile_id,
    s.content_type,
    s.document_path
  from public.submissions s
  join public.profiles p on p.id = s.profile_id
  where s.status = 'approved'
    and s.is_published = true;

grant select on public.published_submissions to anon, authenticated;

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
    s.profile_id,
    s.content_type,
    s.document_path
  from public.submissions s
  join public.profiles p on p.id = s.profile_id
  where s.status = 'approved';

grant select on public.verified_submissions to anon, authenticated;
