  -- =====================================================================
  -- Staff signatures
  --
  -- The head teacher and the class teachers each upload a scan of their
  -- signature once, from their own portal, and the terminal reports print
  -- it above the signature line instead of a row of dots. The head
  -- teacher's signs every card; a class teacher's signs the cards of the
  -- class assigned to them in class_teachers.
  --
  -- The image itself lives in a public storage bucket (the report is
  -- printed from an <img>, and the print window has no session), while the
  -- link to it is kept on the owner's own teachers row - teachers.id is
  -- the auth user id, so "my signature" is just id = auth.uid().
  --
  -- Run this in the Supabase SQL editor.
  -- =====================================================================

  alter table public.teachers
    add column if not exists signature_url text;


  -- ---------------------------------------------------------------------
  -- Bucket
  --
  -- Public read, like student-pictures and teacher-pictures: the printed
  -- report card must render the image without a token.
  -- ---------------------------------------------------------------------
  insert into storage.buckets (id, name, public)
  values ('staff-signatures', 'staff-signatures', true)
  on conflict (id) do update set public = true;


  -- ---------------------------------------------------------------------
  -- Storage policies
  --
  -- Uploads are written as "signatures/<auth uid>-<timestamp>.<ext>", so
  -- the first path segment after the folder carries the owner's id and a
  -- signed-in user can only touch their own files.
  -- ---------------------------------------------------------------------
  drop policy if exists "staff_signatures_public_read" on storage.objects;
  drop policy if exists "staff_signatures_own_insert" on storage.objects;
  drop policy if exists "staff_signatures_own_update" on storage.objects;
  drop policy if exists "staff_signatures_own_delete" on storage.objects;

  create policy "staff_signatures_public_read"
    on storage.objects
    for select
    to public
    using (bucket_id = 'staff-signatures');

  create policy "staff_signatures_own_insert"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'staff-signatures'
      and name like 'signatures/' || auth.uid()::text || '-%'
    );

  create policy "staff_signatures_own_update"
    on storage.objects
    for update
    to authenticated
    using (
      bucket_id = 'staff-signatures'
      and name like 'signatures/' || auth.uid()::text || '-%'
    );

  create policy "staff_signatures_own_delete"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'staff-signatures'
      and name like 'signatures/' || auth.uid()::text || '-%'
    );
