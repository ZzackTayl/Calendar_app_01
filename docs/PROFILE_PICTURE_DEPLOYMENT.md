# Profile Picture Feature - Deployment Guide

## Prerequisites

- Access to Supabase dashboard
- Flutter environment configured
- Database migrations applied
- Image picker and image cropper packages installed

## Step 1: Create Supabase Storage Bucket

### Via Supabase Dashboard

1. Go to **Storage** in your Supabase project
2. Click **Create a new bucket**
3. Configure:
   - **Bucket name:** `profile-pictures`
   - **Public bucket:** ✅ Check (allows public read access)
   - **File size limit:** 5 MB (10 MB to be safe)

### RLS (Row Level Security) Policies

After creating the bucket, set up RLS policies:

#### 1. Allow Public Read

```sql
CREATE POLICY "Anyone can read profile pictures"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'profile-pictures');
```

#### 2. Allow Authenticated Users to Upload

```sql
CREATE POLICY "Users can upload their own profile pictures"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-pictures' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

#### 3. Allow Update Own Pictures

```sql
CREATE POLICY "Users can update their own profile pictures"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'profile-pictures' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

#### 4. Allow Delete Own Pictures

```sql
CREATE POLICY "Users can delete their own profile pictures"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'profile-pictures' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

## Step 2: Apply Database Migration

### Using SQL File

Run the migration from `supabase/schema/013_profile_pictures.sql`:

```bash
# Option 1: Via Supabase SQL Editor
# Copy contents of supabase/schema/013_profile_pictures.sql
# Paste in SQL Editor and execute

# Option 2: Via psql
psql -h db.PROJECT_ID.supabase.co \
  -U postgres \
  -d postgres \
  -f supabase/schema/013_profile_pictures.sql
```

### Verify Migration

Check that the columns were added:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN (
  'profile_picture_source',
  'custom_avatar_url',
  'avatar_storage_path'
);
```

## Step 3: Update Flutter Project

### Install Dependencies

```bash
cd /Users/zackstewart/Documents/GitHub/calendar_app

flutter pub get
```

### Run Build Runner

```bash
# Generate necessary provider files
flutter pub run build_runner build --delete-conflicting-outputs
```

### Verify Installation

```bash
# Check image_picker plugin
flutter pub global run image_picker

# Check image_cropper plugin
flutter pub global run image_cropper
```

## Step 4: Configure Platform-Specific Settings

### iOS (ios/Runner/Info.plist)

Add camera and photo library permissions:

```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access to crop your profile picture</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>We need access to your photos to select a profile picture</string>
<key>NSPhotoLibraryAddOnlyUsageDescription</key>
<string>We need access to save your cropped profile picture</string>
```

### Android (android/app/src/main/AndroidManifest.xml)

Already configured by image_picker plugin, but verify:

```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.CAMERA" />
```

### Web (Not yet supported)

image_picker and image_cropper have limited web support. Consider:
- Fallback UI for web
- Server-side image processing
- Alternative cropping library for web

## Step 5: Run Tests

```bash
# Run profile picture service tests
flutter test test/services/profile_picture_service_test.dart -v

# Run complete test suite
flutter test --coverage
```

**Expected Results:**
- ✅ 19 tests pass
- ✅ All format validation tests pass
- ✅ All stress tests pass
- ✅ 0 test failures

## Step 6: Deploy to Production

### Before Deployment

- [ ] All tests passing
- [ ] Supabase Storage bucket created
- [ ] RLS policies applied
- [ ] Database migration applied
- [ ] Firebase/Crashlytics configured for error reporting
- [ ] Analytics enabled to track uploads

### Deployment Steps

1. **Stage Release**
   ```bash
   flutter build apk --release
   flutter build ios --release
   flutter build web --release
   ```

2. **Deploy to Test Users**
   - Use Firebase App Distribution
   - Monitor crash reports
   - Verify storage operations

3. **Release to Production**
   - Google Play Store
   - App Store
   - Web platform

### Monitoring

Set up monitoring for:

```dart
// Image upload success rate
analytics.logEvent(
  name: 'profile_picture_upload',
  parameters: {
    'success': true,
    'file_size_mb': 2.5,
    'file_format': 'png',
  },
);

// Image upload errors
analytics.logEvent(
  name: 'profile_picture_upload_error',
  parameters: {
    'error_code': 'validation_failed',
    'error_message': 'File too large',
  },
);
```

## Step 7: Setup User Communication

### In-App Notifications

Display after successful upload:

```dart
ScaffoldMessenger.of(context).showSnackBar(
  const SnackBar(
    content: Text('Profile picture updated successfully!'),
    duration: Duration(seconds: 2),
  ),
);
```

### Help Documentation

Link to in-app help:
- Profile picture FAQ
- Troubleshooting guide
- Format requirements

## Troubleshooting Deployment

### Storage Bucket Issues

**Problem:** "Bucket not found" error

```
Solution:
1. Verify bucket name is exactly 'profile-pictures'
2. Check bucket is not marked as private
3. Ensure RLS policies are correctly applied
4. Check Supabase project region
```

**Problem:** "Access denied" when uploading

```
Solution:
1. Verify RLS policies are applied correctly
2. Check user is authenticated
3. Ensure storage folder structure is correct: {user-id}/...
4. Verify auth UID matches folder name
```

### Database Issues

**Problem:** "Column not found" error

```
Solution:
1. Verify migration 013_profile_pictures.sql was applied
2. Check column names are lowercase
3. Ensure profiles table exists
4. Verify user is using correct database
```

**Problem:** Avatar URL not updating

```
Solution:
1. Check UpdateProfileAvatarUrl is called after upload
2. Verify user ID is correct
3. Check database connection
4. Verify RLS policies on profiles table
```

### Flutter Issues

**Problem:** image_picker plugin not found

```
Solution:
flutter clean
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
```

**Problem:** Permission denied on iOS/Android

```
Solution:
1. Check Info.plist has camera/photo permissions
2. Ensure user granted permissions
3. Test on physical device (simulator may have issues)
4. Check App Privacy settings
```

## Rollback Plan

If issues occur in production:

### 1. Disable Feature (Quick)

```dart
// In profile_picture_provider.dart
Future<Result<String>> uploadProfilePicture() async {
  return const Failure('Feature temporarily disabled for maintenance');
}
```

### 2. Revert Database (if needed)

```sql
-- Remove profile picture columns
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS profile_picture_source;
DROP COLUMN IF EXISTS custom_avatar_url;
DROP COLUMN IF EXISTS avatar_storage_path;
```

### 3. Delete Storage Bucket (if needed)

```bash
# Via Supabase dashboard
# Storage → profile-pictures → More options → Delete bucket
```

### 4. Publish Hotfix

```bash
# After fixing issues
flutter build apk --release
flutter build ios --release
# Deploy to app stores
```

## Success Criteria

Production deployment is successful when:

- ✅ Users can upload profile pictures
- ✅ Images appear in their profile
- ✅ Connections can see their pictures
- ✅ No crash reports related to uploads
- ✅ Upload success rate > 99%
- ✅ Average upload time < 5 seconds
- ✅ Storage usage is reasonable (<100GB for 1000 users)

## Monitoring Dashboard

Track these metrics:

1. **Upload Success Rate**
   ```
   (Successful uploads / Total upload attempts) × 100
   Target: > 99%
   ```

2. **Average Upload Time**
   ```
   Total upload time / Number of uploads
   Target: < 5 seconds
   ```

3. **Storage Usage**
   ```
   Total size of all profile pictures
   Limit: Monitor approaching Supabase storage limit
   ```

4. **Error Rate**
   ```
   (Failed uploads / Total uploads) × 100
   Target: < 1%
   ```

## Post-Deployment Checklist

- [ ] All tests passing
- [ ] Feature works on iOS
- [ ] Feature works on Android
- [ ] Feature works on Web (if applicable)
- [ ] Crash reports reviewed and clear
- [ ] Storage usage within limits
- [ ] User feedback positive
- [ ] Documentation updated
- [ ] Team trained on feature
- [ ] Support team aware of new feature

## Contact & Support

For deployment issues:
1. Check logs in Supabase dashboard
2. Review Flutter console errors
3. Check Firebase Crashlytics
4. Consult troubleshooting section above
5. Contact engineering team

## Next Steps

After successful deployment:

1. **Monitor** - Watch metrics for first week
2. **Gather feedback** - From beta users
3. **Iterate** - Fix issues and improve UX
4. **Plan enhancements** - Video, filters, etc.
5. **Scale** - Optimize for growth
