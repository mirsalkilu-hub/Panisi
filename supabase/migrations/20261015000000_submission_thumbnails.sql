alter table public.submissions
  add column thumbnail_path text;

alter table public.submissions
  add constraint submissions_thumbnail_path_owner_check
  check (thumbnail_path is null or thumbnail_path like (profile_id::text || '/%'));

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
      or new.category_slug is distinct from old.category_slug
      or new.youtube_url is distinct from old.youtube_url
      or new.document_path is distinct from old.document_path
      or new.thumbnail_path is distinct from old.thumbnail_path
      or new.is_published is distinct from old.is_published
      or new.published_at is distinct from old.published_at then
      raise exception 'Verifiers can only review pending submissions';
    end if;
    if new.status = 'rejected' and coalesce(btrim(new.feedback), '') = '' then
      raise exception 'A rejection reason is required';
    end if;
  elsif public.current_user_has_role(array['kontributor']) then
    if old.profile_id is distinct from auth.uid()
      or old.status <> 'pending'
      or new.profile_id is distinct from old.profile_id
      or new.status is distinct from old.status
      or new.content_type is distinct from old.content_type
      or new.feedback is distinct from old.feedback
      or new.is_published is distinct from old.is_published
      or new.published_at is distinct from old.published_at
      or new.created_at is distinct from old.created_at then
      raise exception 'Contributors can only edit their own pending submissions';
    end if;
    if new.content_type = 'video' and new.document_path is distinct from old.document_path then
      raise exception 'Contributors cannot change a video document';
    end if;
    if new.content_type = 'ebook'
      and (
        new.youtube_url is not null
        or new.document_path is null
        or new.document_path not like (auth.uid()::text || '/%')
      ) then
      raise exception 'Contributors can only use their own e-book documents';
    end if;
    if new.thumbnail_path is not null
      and new.thumbnail_path not like (auth.uid()::text || '/%') then
      raise exception 'Contributors can only use their own thumbnails';
    end if;
  else
    raise exception 'Only administrators, verifiers, and contributors can update submissions';
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
    s.document_path,
    s.category_slug,
    s.thumbnail_path
  from public.submissions s
  join public.profiles p on p.id = s.profile_id
  where s.status = 'approved'
    and s.is_published = true;

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
    s.document_path,
    s.category_slug,
    s.thumbnail_path
  from public.submissions s
  join public.profiles p on p.id = s.profile_id
  where s.status = 'approved';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('submission-thumbnails', 'submission-thumbnails', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Contributors can upload their own submission thumbnails"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'submission-thumbnails'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.current_user_has_role(array['kontributor'])
  );

create policy "Users can read permitted submission thumbnails"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'submission-thumbnails'
    and (storage.foldername(name))[1] = (select auth.uid())::text
      or (
        bucket_id = 'submission-thumbnails'
        and public.current_user_has_role(array['admin', 'verifikator'])
      )
  );

create policy "Contributors can delete their own submission thumbnails"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'submission-thumbnails'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.current_user_has_role(array['kontributor'])
  );

create policy "Admins can delete submission thumbnails"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'submission-thumbnails'
    and public.current_user_has_role(array['admin'])
  );
