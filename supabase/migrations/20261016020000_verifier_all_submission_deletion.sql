drop policy if exists "Admins and verifiers can delete contributor submissions" on public.submissions;

create policy "Admins and verifiers can delete contributor submissions"
  on public.submissions for delete to authenticated
  using (public.current_user_has_role(array['admin', 'verifikator']));

grant delete on public.submissions to authenticated;