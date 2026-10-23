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
    if new.status is distinct from old.status
      or new.profile_id is distinct from old.profile_id
      or new.content_type is distinct from old.content_type
      or new.feedback is distinct from old.feedback then
      raise exception 'Administrators can edit work content but cannot change ownership or verification status';
    end if;
    if new.status <> 'approved' and new.is_published then
      raise exception 'Only verified posts can be published';
    end if;
    if new.is_published is distinct from old.is_published
      and (old.status <> 'approved' or new.status <> 'approved') then
      raise exception 'Only verified posts can change publishing state';
    end if;
    if new.document_path is distinct from old.document_path
      and (
        new.content_type <> 'ebook'
        or new.document_path is null
        or new.document_path not like (new.profile_id::text || '/%')
      ) then
      raise exception 'Administrators can only replace an e-book with a file in its contributor folder';
    end if;
    new.published_at = case
      when new.is_published then coalesce(old.published_at, now())
      else null
    end;
  elsif public.current_user_has_role(array['verifikator']) then
    if old.status <> 'pending'
      or new.status not in ('pending', 'approved', 'rejected')
      or new.profile_id is distinct from old.profile_id
      or new.content_type is distinct from old.content_type
      or new.document_path is distinct from old.document_path
      or new.is_published is distinct from old.is_published
      or new.published_at is distinct from old.published_at
      or new.created_at is distinct from old.created_at then
      raise exception 'Verifiers can only edit and review pending submissions';
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

drop policy if exists "Admins can edit verified submissions" on public.submissions;
create policy "Admins can edit contributor submissions"
  on public.submissions for update to authenticated
  using (public.current_user_has_role(array['admin']))
  with check (public.current_user_has_role(array['admin']));

create policy "Admins can upload contributor PDFs"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'contribution-documents'
    and public.current_user_has_role(array['admin'])
    and exists (
      select 1
      from public.submissions s
      where s.profile_id::text = (storage.foldername(name))[1]
    )
  );

create policy "Admins can upload contributor thumbnails"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'submission-thumbnails'
    and public.current_user_has_role(array['admin'])
    and exists (
      select 1
      from public.submissions s
      where s.profile_id::text = (storage.foldername(name))[1]
    )
  );
