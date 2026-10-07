  -- =====================================================================
  -- Student pictures
  --
  -- The admin portal crops and compresses every student photo in the
  -- browser and uploads it as a small JPEG to "students/<timestamp>.jpg".
  -- The terminal report prints it from an <img>, and the print window has
  -- no session, so the bucket stays public for reading. Only admins add
  -- and edit students, so only admins may write to it.
  --
  -- Depends on public.is_admin() from profiles_rls.sql.
  -- Run this in the Supabase SQL editor.
  -- =====================================================================


  -- ---------------------------------------------------------------------
  -- Bucket
  --
  -- image/jpeg must be allowed or the upload fails with
  -- "mime type image/jpeg is not supported".
  -- ---------------------------------------------------------------------
  insert into storage.buckets (id, name, public, allowed_mime_types)
  values (
    'student-pictures',
    'student-pictures',
    true,
    array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  )
  on conflict (id) do update
    set public = true,
        allowed_mime_types = excluded.allowed_mime_types;


  -- ---------------------------------------------------------------------
  -- Storage policies
  -- ---------------------------------------------------------------------
  drop policy if exists "student_pictures_public_read" on storage.objects;
  drop policy if exists "student_pictures_admin_insert" on storage.objects;
  drop policy if exists "student_pictures_admin_update" on storage.objects;
  drop policy if exists "student_pictures_admin_delete" on storage.objects;

  create policy "student_pictures_public_read"
    on storage.objects
    for select
    to public
    using (bucket_id = 'student-pictures');

  create policy "student_pictures_admin_insert"
    on storage.objects
    for insert
    to authenticated
    with check (bucket_id = 'student-pictures' and public.is_admin());

  create policy "student_pictures_admin_update"
    on storage.objects
    for update
    to authenticated
    using (bucket_id = 'student-pictures' and public.is_admin());

  create policy "student_pictures_admin_delete"
    on storage.objects
    for delete
    to authenticated
    using (bucket_id = 'student-pictures' and public.is_admin());
