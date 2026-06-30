-- ============================================================
-- Adwen — Migration 004: Storage Bucket
-- Private bucket for course uploads
-- Path convention: {user_id}/{course_id}/{filename}
-- ============================================================

-- Create private bucket for course uploads
insert into storage.buckets (id, name, public)
values ('course-uploads', 'course-uploads', false);

-- Storage RLS: owner can upload to their own folder
create policy "Users can upload to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'course-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage RLS: owner can view their own files
create policy "Users can view own uploads"
  on storage.objects for select
  using (
    bucket_id = 'course-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage RLS: owner can delete their own files
create policy "Users can delete own uploads"
  on storage.objects for delete
  using (
    bucket_id = 'course-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage RLS: owner can update their own files
create policy "Users can update own uploads"
  on storage.objects for update
  using (
    bucket_id = 'course-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
