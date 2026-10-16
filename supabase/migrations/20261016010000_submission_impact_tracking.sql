create table public.submission_impact_records (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  contributor_id uuid not null references public.profiles (id) on delete cascade,
  action_type text not null check (action_type in ('reuse', 'application', 'feedback')),
  details text,
  application_completed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint submission_impact_records_unique_action
    unique (submission_id, contributor_id, action_type),
  constraint submission_impact_records_detail_check
    check (
      (action_type = 'reuse' and details is null and application_completed = false)
      or
      (action_type = 'application' and char_length(btrim(coalesce(details, ''))) between 1 and 2000)
      or
      (action_type = 'feedback' and char_length(btrim(coalesce(details, ''))) between 1 and 2000 and application_completed = false)
    )
);

create index submission_impact_records_submission_idx
  on public.submission_impact_records (submission_id, action_type);

alter table public.submission_impact_records enable row level security;

create or replace function public.is_approved_submission(submission_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.submissions
    where id = submission_uuid
      and status = 'approved'
  );
$$;

revoke all on function public.is_approved_submission(uuid) from public;
grant execute on function public.is_approved_submission(uuid) to authenticated;

create policy "Contributors can read their own impact records"
  on public.submission_impact_records for select to authenticated
  using (
    contributor_id = (select auth.uid())
    and public.current_user_has_role(array['kontributor'])
  );

create policy "Contributors can record impact on approved work"
  on public.submission_impact_records for insert to authenticated
  with check (
    contributor_id = (select auth.uid())
    and public.current_user_has_role(array['kontributor'])
    and public.is_approved_submission(submission_id)
  );

create policy "Contributors can update their own impact records"
  on public.submission_impact_records for update to authenticated
  using (
    contributor_id = (select auth.uid())
    and public.current_user_has_role(array['kontributor'])
    and public.is_approved_submission(submission_id)
  )
  with check (
    contributor_id = (select auth.uid())
    and public.current_user_has_role(array['kontributor'])
    and public.is_approved_submission(submission_id)
  );

grant select, insert, update on public.submission_impact_records to authenticated;

create or replace view public.submission_impact_totals
with (security_invoker = false)
as
  select
    submission_id,
    count(*) filter (where action_type = 'reuse')::integer as reuse_count,
    count(*) filter (where action_type = 'application')::integer as application_count,
    count(*) filter (where action_type = 'application' and application_completed)::integer as completed_count
  from public.submission_impact_records
  group by submission_id;

grant select on public.submission_impact_totals to anon, authenticated;
