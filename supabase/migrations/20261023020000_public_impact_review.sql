alter table public.submission_impact_records
  alter column contributor_id drop not null,
  add column moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected')),
  add column reviewer_id uuid references public.profiles (id) on delete set null,
  add column reviewed_at timestamptz,
  add column reviewer_note text check (char_length(reviewer_note) <= 2000),
  add column publicly_visible boolean not null default false;

update public.submission_impact_records
set moderation_status = 'approved',
    publicly_visible = (details is null);

alter table public.submission_impact_records
  drop constraint submission_impact_records_detail_check,
  add constraint submission_impact_records_detail_check check (
    (
      action_type = 'reuse'
      and application_completed = false
      and (
        (
          moderation_status = 'approved'
          and details is null
        )
        or char_length(btrim(coalesce(details, ''))) between 1 and 2000
      )
    )
    or (
      char_length(btrim(coalesce(details, ''))) between 1 and 2000
      and (
        action_type = 'application'
        or (action_type = 'feedback' and application_completed = false)
      )
    )
  );

drop policy "Contributors can read their own impact records"
  on public.submission_impact_records;
drop policy "Contributors can record impact on approved work"
  on public.submission_impact_records;
drop policy "Contributors can update their own impact records"
  on public.submission_impact_records;

create policy "Public can submit impact for approved work"
  on public.submission_impact_records for insert to anon, authenticated
  with check (
    contributor_id is null
    and moderation_status = 'pending'
    and reviewer_id is null
    and reviewed_at is null
    and reviewer_note is null
    and publicly_visible = false
    and public.is_approved_submission(submission_id)
  );

create policy "Reviewers can read impact submissions"
  on public.submission_impact_records for select to authenticated
  using (public.current_user_has_role(array['admin', 'verifikator']));

create or replace function public.enforce_submission_impact_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.moderation_status <> 'pending'
      or new.reviewer_id is not null
      or new.reviewed_at is not null
      or new.reviewer_note is not null
      or new.publicly_visible then
      raise exception 'Public impact submissions must await verification';
    end if;
    new.created_at = now();
    return new;
  end if;

  if auth.uid() is null then
    return new;
  end if;

  if not public.current_user_has_role(array['admin', 'verifikator'])
    or not (
      old.moderation_status = 'pending'
      or (old.moderation_status = 'approved' and old.publicly_visible = false)
    )
    or new.moderation_status not in ('approved', 'rejected')
    or new.submission_id is distinct from old.submission_id
    or new.contributor_id is distinct from old.contributor_id
    or new.action_type is distinct from old.action_type
    or new.details is distinct from old.details
    or new.application_completed is distinct from old.application_completed
    or new.created_at is distinct from old.created_at then
    raise exception 'Only reviewers can decide pending impact submissions';
  end if;

  if new.moderation_status = 'rejected'
    and coalesce(btrim(new.reviewer_note), '') = '' then
    raise exception 'A rejection reason is required';
  end if;

  new.reviewer_id = auth.uid();
  new.reviewed_at = now();
  new.publicly_visible = new.moderation_status = 'approved';
  return new;
end;
$$;

create trigger enforce_submission_impact_review
  before insert or update on public.submission_impact_records
  for each row execute procedure public.enforce_submission_impact_review();

create policy "Reviewers can decide pending impact submissions"
  on public.submission_impact_records for update to authenticated
  using (
    (
      moderation_status = 'pending'
      or (moderation_status = 'approved' and publicly_visible = false)
    )
    and public.current_user_has_role(array['admin', 'verifikator'])
  )
  with check (
    moderation_status in ('approved', 'rejected')
    and reviewer_id = (select auth.uid())
    and reviewed_at is not null
    and publicly_visible = (moderation_status = 'approved')
    and public.current_user_has_role(array['admin', 'verifikator'])
  );

revoke all on public.submission_impact_records from anon, authenticated;
grant insert on public.submission_impact_records to anon;
grant select, insert, update on public.submission_impact_records to authenticated;

revoke all on function public.is_approved_submission(uuid) from public;
grant execute on function public.is_approved_submission(uuid) to anon, authenticated;

create or replace view public.submission_impact_totals
with (security_invoker = false)
as
  select
    submission_id,
    count(*) filter (where action_type = 'reuse')::integer as reuse_count,
    count(*) filter (where action_type = 'application')::integer as application_count,
    count(*) filter (where action_type = 'application' and application_completed)::integer as completed_count
  from public.submission_impact_records
  where moderation_status = 'approved'
  group by submission_id;

create or replace view public.public_submission_impact_records
with (security_invoker = false)
as
  select
    id,
    submission_id,
    action_type,
    details,
    application_completed,
    created_at
  from public.submission_impact_records
  where moderation_status = 'approved'
    and publicly_visible = true
    and details is not null;

grant select on public.submission_impact_totals to anon, authenticated;
grant select on public.public_submission_impact_records to anon, authenticated;

notify pgrst, 'reload schema';
