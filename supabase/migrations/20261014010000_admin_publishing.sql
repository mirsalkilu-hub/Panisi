alter table public.submissions
  add column is_published boolean not null default false,
  add column published_at timestamptz;

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

create trigger enforce_panisi_submission_role_changes
  before update on public.submissions
  for each row execute procedure public.enforce_submission_role_changes();

drop policy "Reviewers can update submissions" on public.submissions;
create policy "Verifiers can review pending submissions"
  on public.submissions for update to authenticated
  using (
    status = 'pending'
    and public.current_user_has_role(array['verifikator'])
  )
  with check (
    status in ('approved', 'rejected')
    and public.current_user_has_role(array['verifikator'])
  );

create policy "Admins can edit verified submissions"
  on public.submissions for update to authenticated
  using (
    status = 'approved'
    and public.current_user_has_role(array['admin'])
  )
  with check (
    status = 'approved'
    and public.current_user_has_role(array['admin'])
  );

create policy "Admins can delete verified submissions"
  on public.submissions for delete to authenticated
  using (
    status = 'approved'
    and public.current_user_has_role(array['admin'])
  );

grant delete on public.submissions to authenticated;

create policy "Admins can delete contribution PDFs"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'contribution-documents'
    and public.current_user_has_role(array['admin'])
  );

create or replace view public.published_submissions
with (security_invoker = false)
as
  select
    s.id,
    s.title,
    s.description,
    s.youtube_url,
    s.created_at,
    p.full_name
  from public.submissions s
  join public.profiles p on p.id = s.profile_id
  where s.status = 'approved'
    and s.is_published = true;

grant select on public.published_submissions to anon, authenticated;
