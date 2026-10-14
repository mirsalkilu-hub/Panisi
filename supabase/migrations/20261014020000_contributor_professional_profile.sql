alter table public.profiles
  add column area_of_expertise text not null default ''
    check (char_length(area_of_expertise) <= 500),
  add column widyaiswara_experience text not null default ''
    check (char_length(widyaiswara_experience) <= 2000);
