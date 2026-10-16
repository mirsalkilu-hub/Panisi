update storage.buckets
set file_size_limit = 2097152
where id = 'contribution-documents';

update storage.buckets
set file_size_limit = 512000
where id = 'submission-thumbnails';

create or replace function public.enforce_submission_category_media_type()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  media_category_changed boolean;
begin
  if tg_op = 'INSERT' then
    media_category_changed := true;
  else
    media_category_changed := new.category_slug is distinct from old.category_slug
      or new.content_type is distinct from old.content_type;
  end if;

  if media_category_changed then
    if (new.category_slug = 'video') <> (new.content_type = 'video') then
      raise exception 'Only the video category can use an embedded video; other categories require a PDF';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_submission_category_media_type
  before insert or update of category_slug, content_type
  on public.submissions
  for each row
  execute function public.enforce_submission_category_media_type();
