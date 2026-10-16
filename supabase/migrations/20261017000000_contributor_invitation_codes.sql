create table public.contributor_invitation_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  label text not null check (char_length(label) between 1 and 100),
  is_active boolean not null default true,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index contributor_invitation_codes_active_created_at_idx
  on public.contributor_invitation_codes (is_active, created_at desc);

alter table public.contributor_invitation_codes enable row level security;
revoke all on public.contributor_invitation_codes from anon, authenticated;
grant all on public.contributor_invitation_codes to service_role;
