create or replace function public.require_submission_thumbnail()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.thumbnail_path is null then
    if tg_op = 'INSERT' then
      raise exception 'A submission thumbnail is required';
    elsif auth.uid() is not null
      and public.current_user_has_role(array['kontributor']) then
      raise exception 'A submission thumbnail is required';
    end if;
  end if;
  return new;
end;
$$;

create trigger require_submission_thumbnail
  before insert or update on public.submissions
  for each row
  execute function public.require_submission_thumbnail();
