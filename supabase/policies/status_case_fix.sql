  -- =====================================================================
  -- Settle students.status on one spelling
  --
  -- The Add/Edit Student dropdown offers Present, Stop and Complete, but
  -- promoting a pupil out of the top class wrote "completed" instead.
  -- Postgres = and <> are case sensitive, so those pupils matched
  -- NEITHER filter:
  --
  --   Total Complete   .eq("status","Complete")   missed them  -> read 0
  --   Total Students   .neq("status","Complete")  kept them    -> inflated
  --   Total Male/Female                           kept them    -> inflated
  --
  -- The application code now reads with ilike, so the dashboards are
  -- already correct without this file. This is the tidy-up: it puts the
  -- old rows on the dropdown's spelling so the data itself is consistent.
  --
  -- Run it in the Supabase SQL editor. Safe to re-run.
  -- =====================================================================


  -- ---------------------------------------------------------------------
  -- 1. Look before you write
  --
  -- Every spelling currently in the table, and how many rows each has.
  -- Anything other than Present / Stop / Complete is worth understanding
  -- before the update below rewrites it.
  -- ---------------------------------------------------------------------
  -- select status, count(*)
  --   from public.students
  --  group by status
  --  order by count(*) desc;


  -- ---------------------------------------------------------------------
  -- 2. Normalise
  --
  -- Only touches rows whose spelling differs from the dropdown's, so
  -- re-running it changes nothing.
  -- ---------------------------------------------------------------------
  update public.students
     set status = 'Complete'
   where status ilike 'complete%'
     and status <> 'Complete';

  update public.students
     set status = 'Present'
   where status ilike 'present'
     and status <> 'Present';

  update public.students
     set status = 'Stop'
   where status ilike 'stop'
     and status <> 'Stop';


  -- ---------------------------------------------------------------------
  -- 3. Verify - expect only Present, Stop, Complete (and NULL)
  -- ---------------------------------------------------------------------
  -- select status, count(*)
  --   from public.students
  --  group by status
  --  order by count(*) desc;


  -- ---------------------------------------------------------------------
  -- Note on pupils with no status
  --
  -- "status <> 'Complete'" is NULL for a NULL status, so a pupil with no
  -- status set has always been left out of Total Students, Total Male and
  -- Total Female. That behaviour is unchanged here. If the query above
  -- shows a NULL row, decide what those pupils are and set it:
  --
  --   update public.students set status = 'Present' where status is null;
  -- ---------------------------------------------------------------------
