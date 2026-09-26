  -- =====================================================================
  -- Realtime for the admin dashboard
  --
  -- These admin views subscribe to postgres_changes:
  --
  --   term settings table   currentTermsData.js   terms, academic_years
  --   notification bell     adminAlerts.js        student_marks, terms,
  --                                               academic_years, classes
  --   students table        studentList.js        students, classes
  --   staff table           createTeacher.js      teachers, profiles
  --
  -- A subscription only delivers rows when BOTH of these are true:
  --
  --   1. the table is in the supabase_realtime publication
  --   2. the subscriber can SELECT the row under RLS
  --
  -- Without step 1 the channel still reports SUBSCRIBED, it just never
  -- fires - which looks exactly like "realtime is broken". Run this in
  -- the Supabase SQL editor once.
  -- =====================================================================


  -- ---------------------------------------------------------------------
  -- Publication
  --
  -- Wrapped because "add table" errors if the table is already a member,
  -- and this file should stay safe to re-run.
  -- ---------------------------------------------------------------------
  do $$
  declare
    t text;
  begin
    foreach t in array array[
      'terms',
      'academic_years',
      'student_marks',
      'classes',
      'students',
      'teachers',
      'profiles'
    ]
    loop
      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime' 
          and schemaname = 'public'
          and tablename = t
      ) then
        execute format(
          'alter publication supabase_realtime add table public.%I', t
        );
      end if;
    end loop;
  end;
  $$;


  -- ---------------------------------------------------------------------
  -- Replica identity
  --
  -- On DELETE, the payload's old record carries only the primary key
  -- unless replica identity is full. Both subscribers just re-query on
  -- any event, so the key is enough and the extra WAL volume of "full"
  -- is not worth it. Uncomment per table only if some future handler
  -- needs the deleted row's columns.
  --
  -- alter table public.terms replica identity full;
  --
  -- WARNING: a published table with NO primary key and no replica
  -- identity cannot be updated or deleted at all - postgres rejects the
  -- write with "cannot update table X because it does not have a replica
  -- identity and publishes updates". If saving broke right after this
  -- file was run, that is the first thing to check:
  --
  --   select c.relname, c.relreplident      -- d = default (pkey), n = nothing
  --     from pg_class c
  --     join pg_namespace n on n.oid = c.relnamespace
  --    where n.nspname = 'public'
  --      and c.relname in ('terms','academic_years','student_marks',
  --                        'classes','students','teachers','profiles');
  --
  -- relreplident 'n' on any row is the culprit. Give that table a primary
  -- key, or set "replica identity full" on it.
  -- ---------------------------------------------------------------------


  -- ---------------------------------------------------------------------
  -- Check what is live
  -- ---------------------------------------------------------------------
  -- select schemaname, tablename
  --   from pg_publication_tables
  --  where pubname = 'supabase_realtime'
  --  order by tablename;
