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
  else
    raise exception 'Only administrators, verifiers, and contributors can update submissions';
  end if;
  return new;
end;
$$;

create policy "Contributors can edit their own pending submissions"
  on public.submissions for update to authenticated
  using (
    profile_id = (select auth.uid())
    and status = 'pending'
    and public.current_user_has_role(array['kontributor'])
  )
  with check (
    profile_id = (select auth.uid())
    and status = 'pending'
    and public.current_user_has_role(array['kontributor'])
  );
