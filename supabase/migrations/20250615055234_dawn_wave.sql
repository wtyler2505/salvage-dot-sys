/*
  # Storage Setup for Salvage Parts AI Tracker

  1. Storage Buckets
    - `salvage-parts` - For part images, project photos, build session images
    - Public read access for authenticated users
    - Upload restrictions for security

  2. Storage Policies
    - Users can upload to their own folders
    - Public read access for all authenticated users
    - File type and size restrictions
*/

-- Create storage bucket for salvage parts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'salvage-parts',
  'salvage-parts',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for salvage-parts bucket
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'salvage-parts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Authenticated users can view files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'salvage-parts');

CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'salvage-parts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'salvage-parts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);