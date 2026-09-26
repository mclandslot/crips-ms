-- =====================================================================
-- Keep profiles.full_name in step with the teachers record.
--
-- Editing a teacher in Manage Teachers writes to public.teachers only, so
-- profiles.full_name kept the name the account was created with. With the
-- profiles RLS in place the browser cannot fix that itself, and a trigger
-- is better than another edge function here: it also covers the row that
-- create-staff-account writes, and it cannot be forgotten by a future
-- caller that updates teachers some other way.
--
-- SECURITY DEFINER because a trigger otherwise runs with the privileges of
-- whoever ran the UPDATE, and authenticated may only write
-- must_change_password on profiles.
--
-- Run this in the Supabase SQL editor, after profiles_rls.sql.
-- =====================================================================

create or replace function public.sync_profile_full_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  computed_name text;
begin
  computed_name := btrim(
    coalesce(new.surname, '') || ' ' || coalesce(new.first_name, '')
  );

  -- a teacher row with no name at all should not blank an existing profile
  if computed_name = '' then
    return new;
  end if;

  update public.profiles
     set full_name = computed_name
   where id = new.id
     and full_name is distinct from computed_name;

  return new;
end;
$$;

revoke all on function public.sync_profile_full_name() from public, anon, authenticated;


drop trigger if exists teachers_sync_profile_name on public.teachers;

-- INSERT is included so a teachers row created before its profile still
-- lands the name once the profile exists; the UPDATE branch is the one
-- that matters day to day. Naming the columns keeps the trigger off every
-- unrelated edit (status, phone, qualification and so on).
create trigger teachers_sync_profile_name
after insert or update of surname, first_name on public.teachers
for each row
execute function public.sync_profile_full_name();


-- ---------------------------------------------------------------------
-- One-off backfill for names that already drifted apart.
-- ---------------------------------------------------------------------
update public.profiles p
   set full_name = btrim(
     coalesce(t.surname, '') || ' ' || coalesce(t.first_name, '')
   )
  from public.teachers t
 where t.id = p.id
   and btrim(coalesce(t.surname, '') || ' ' || coalesce(t.first_name, '')) <> ''
   and p.full_name is distinct from btrim(
     coalesce(t.surname, '') || ' ' || coalesce(t.first_name, '')
   );
