  -- =====================================================================
  -- RLS for public.profiles
  --
  -- After the staff operations moved into edge functions, the browser needs
  -- very little on this table:
  --
  --   read  own row      - every page guard (role, is_active,
  --                        must_change_password)
  --   read  other rows   - admins only, for the Blocked badge in the
  --                        Manage Teachers table
  --   write own row      - must_change_password only, cleared by
  --                        change-password.html after a forced reset
  --
  -- Everything else (create, delete, block/unblock, password reset) runs in
  -- an edge function with the service role, which bypasses RLS entirely.
  --
  -- Run this in the Supabase SQL editor.
  -- =====================================================================

  alter table public.profiles enable row level security;


  -- ---------------------------------------------------------------------
  -- Admin test.
  --
  -- A policy on profiles cannot select from profiles - that recurses. A
  -- SECURITY DEFINER function runs as the table owner, which is not subject
  -- to RLS, so the lookup inside it is safe.
  -- ---------------------------------------------------------------------
  create or replace function public.is_admin()
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
  as $$
    select exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and is_active
        and role in ('admin', 'system_admin')
    );
  $$;

  revoke all on function public.is_admin() from public, anon;
  grant execute on function public.is_admin() to authenticated;


  -- ---------------------------------------------------------------------
  -- Table privileges.
  --
  -- Supabase grants anon and authenticated full DML on new public tables by
  -- default, so the revoke matters as much as the policies: RLS filters
  -- rows, privileges decide which commands and columns are possible at all.
  -- Restricting UPDATE to a single column is what stops a blocked user from
  -- setting their own is_active back to true.
  -- ---------------------------------------------------------------------
  revoke all on public.profiles from anon;
  revoke all on public.profiles from authenticated;

  grant select on public.profiles to authenticated;
  grant update (must_change_password) on public.profiles to authenticated;

  grant all on public.profiles to service_role;


  -- ---------------------------------------------------------------------
  -- Policies
  -- ---------------------------------------------------------------------
  drop policy if exists "profiles_self_select" on public.profiles;
  drop policy if exists "profiles_admin_select" on public.profiles;
  drop policy if exists "profiles_self_update" on public.profiles;

  -- every signed-in user reads their own row: this is what the page guards do
  create policy "profiles_self_select"
    on public.profiles
    for select
    to authenticated
    using (auth.uid() = id);

  -- admins read everyone: the Manage Teachers table needs is_active per staff
  create policy "profiles_admin_select"
    on public.profiles
    for select
    to authenticated
    using (public.is_admin());

  -- own row only, and the column grant above limits it to
  -- must_change_password
  create policy "profiles_self_update"
    on public.profiles
    for update
    to authenticated
    using (auth.uid() = id)
    with check (auth.uid() = id);

  -- No INSERT or DELETE policy is defined, so neither is possible for
  -- anon or authenticated. Rows are created by create-staff-account and
  -- removed by delete-staff-by-id / cleanup-orphaned-staff, all of which
  -- use the service role.
