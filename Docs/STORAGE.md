# Storage Setup & Attachments Guide

This guide shows how to set up Supabase Storage for event attachments, verify it with a programmatic test, and validate the full UI flow.

Quick summary
- Bucket: attachments (Public)
- Policies: Authenticated users can upload/delete their own files; anyone can read (public bucket). See the SQL below.
- Code config: ATTACHMENT_BUCKET constant, used in API routes
- Test script: scripts/test-upload.js

1) Create the attachments bucket (Public)
Dashboard
- Supabase Dashboard → Storage → New bucket
- Name: attachments
- Public: ON
- Create

CLI (alternative)
- supabase storage bucket create attachments --public

2) Apply storage policies
Use the SQL Editor in Supabase → SQL → New query. You can copy from STORAGE_SETUP_POLICIES.sql or paste the essentials below.

Essentials for attachments bucket
- Allows authenticated users to insert/delete their own files
- Bucket remains public for read (your code uses public URLs)

SQL to apply

CREATE POLICY "Users can view their own event attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can upload their own event attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own event attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

Note
- Because the bucket is Public, all files are readable by URL. You could later switch to Private + signed URLs; see Next steps.
- You can also add avatar policies if you create an avatars bucket (see STORAGE_SETUP_POLICIES.sql).

3) Code configuration (already wired)
- Bucket constant: lib/storage/constants.ts → ATTACHMENT_BUCKET = 'attachments'
- Used in:
  - app/api/attachments/route.ts
  - app/api/attachments/[id]/route.ts
  - app/api/account/delete/route.ts

4) Programmatic upload test
Prerequisites
- Environment variables set in your shell or .env.local
  - NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
  - NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
- Optional (local-only admin testing): SUPABASE_SERVICE_ROLE_KEY
- Optional path labeling (used for object key only): TEST_USER_ID, TEST_EVENT_ID

Steps
1. Place a small sample file at sample-files/test.pdf
2. Install dependencies (first time):
   - npm install
3. Run the test:
   - npm run test:upload

What it does
- Uploads to attachments/events/{TEST_USER_ID}/{TEST_EVENT_ID}/{timestamp-random-filename}
- Prints a Public URL and attempts a GET to verify it’s reachable

Expected result
- Public URL is printed
- Fetch status: 200
- ✅ Public URL is accessible

Troubleshooting
- If you see 403/404:
  - Confirm bucket name is attachments
  - Confirm bucket is Public
  - Confirm the policies are applied for storage.objects on the attachments bucket
- If MIME detection fails: the script requires mime-types (installed by npm install)

5) UI validation of event attachments
1. Start dev server: npm run dev
2. Go to /events/create
3. Create an event (Title, Start/End, Privacy)
4. Use the file uploader (paperclip icon) to attach a small file
5. Verify:
   - Attachment item shows with name and size
   - Preview opens for images/PDF
   - Download works
   - Reload the page: attachment persists and loads without console errors

Common limits and types (from your API)
- Free tier size limit: 3MB; premium/pro: 10MB (see app/api/attachments/route.ts)
- Allowed types: jpeg, png, gif, webp, pdf, doc, docx, xls, xlsx, txt, csv

6) Next steps (optional): Private bucket + signed URLs
If you want stricter privacy:
- Make the attachments bucket Private
- Replace getPublicUrl with createSignedUrl in the API layer
- Consider partner-access policies. See STORAGE_POLICIES_COMPLETE.sql for a starting point

7) Cleanup
- You can delete test files from the Supabase Dashboard → Storage → attachments
- Or add a small script later to prune test uploads by prefix

Reference files in this repo
- STORAGE_SETUP_POLICIES.sql – copy/paste policies
- STORAGE_POLICIES_COMPLETE.sql – ideas for partner visibility policies
- scripts/test-upload.js – programmatic upload test
- lib/storage/constants.ts – bucket name constant

