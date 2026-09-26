  -- =====================================================================
  -- One active academic year, enforced by the database
  --
  -- Everything that resolves "the current year" assumes exactly one row
  -- has is_active = true. headTeachersData.js and adminAlerts.js both
  -- read it with .maybeSingle(), which ERRORS when two rows come back -
  -- so a second active year does not degrade the dashboards, it breaks
  -- them.
  --
  -- Application code cannot guarantee this: "deactivate the others" and
  -- "activate this one" are two separate statements from the browser, and
  -- two admins saving at once interleave them. This file moves the rule
  -- into the table itself.
  --
  -- Run it in the Supabase SQL editor. Safe to re-run.
  -- =====================================================================


  -- ---------------------------------------------------------------------
  -- 1. Clean up first
  --
  -- The index cannot be created while more than one row is already
  -- active, so collapse any existing duplicates down to the newest one.
  -- Check what this will do before running it:
  --
  --   select id, year_name, is_active, created_at
  --     from public.academic_years
  --    where is_active
  --    order by created_at desc;
  -- ---------------------------------------------------------------------
  update public.academic_years
     set is_active = false
   where is_active
     and id <> (
       select id
         from public.academic_years
        where is_active
        order by created_at desc
        limit 1
     );


  -- ---------------------------------------------------------------------
  -- 2. Keep the others in step automatically
  --
  -- A BEFORE trigger, so the other years are already false by the time
  -- the new row is written and the index below never sees two. It also
  -- means any path that activates a year - this app, the SQL editor, a
  -- future script - gets the behaviour for free.
  --
  -- No recursion: the inner update only ever sets is_active to false, and
  -- the body is guarded on NEW.is_active being true.
  -- ---------------------------------------------------------------------
  create or replace function public.deactivate_other_academic_years()
  returns trigger
  language plpgsql
  as $$
  begin
    if new.is_active then
      update public.academic_years
         set is_active = false
       where is_active
         and id <> new.id;
    end if;

    return new;
  end;
  $$;

  drop trigger if exists academic_years_single_active
    on public.academic_years;

  create trigger academic_years_single_active
    before insert or update of is_active
    on public.academic_years
    for each row
    when (new.is_active)
    execute function public.deactivate_other_academic_years();


  -- ---------------------------------------------------------------------
  -- 3. The guarantee
  --
  -- Partial: it constrains only the rows where is_active is true, so any
  -- number of inactive years is fine but a second active one is rejected.
  -- The trigger above is what keeps the rule; this is what makes it
  -- impossible to break if the trigger is ever dropped.
  -- ---------------------------------------------------------------------
  create unique index if not exists academic_years_one_active_idx
    on public.academic_years (is_active)
    where is_active;


  -- ---------------------------------------------------------------------
  -- Verify
  -- ---------------------------------------------------------------------
  -- select year_name, is_active
  --   from public.academic_years
  --  order by created_at desc;
  --
  -- Activating a different year should flip the old one to false on its
  -- own, with no second statement:
  --
  -- update public.academic_years set is_active = true
  --  where year_name = '<some other year>';
