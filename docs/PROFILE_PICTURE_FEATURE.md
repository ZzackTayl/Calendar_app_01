# Profile Picture Feature Documentation

## Overview

The Profile Picture feature allows users to upload, manage, and view profile pictures within the My Orbit calendar application. Users can upload custom images (PNG, JPEG, GIF) or have their Google/Apple profile picture automatically used upon onboarding.

## Features

- ✅ Upload custom profile pictures (PNG, JPEG, small GIFs)
- ✅ Automatic image cropping (square format)
- ✅ Replace existing profile pictures
- ✅ Remove custom pictures and revert to provider images
- ✅ Real-time sync with Supabase Storage
- ✅ View connections' profile pictures
- ✅ Automatic Google/Apple calendar image extraction with user permission
- ✅ Comprehensive error handling and validation
- ✅ Thumbnail URL generation for optimization

## Architecture

### Database Schema

The profile picture feature extends the existing `profiles` table with:

```sql
ALTER TABLE public.profiles
ADD COLUMN profile_picture_source TEXT DEFAULT 'provider'
  CHECK (profile_picture_source IN ('provider', 'custom')),
ADD COLUMN custom_avatar_url TEXT,
ADD COLUMN avatar_storage_path TEXT;
```

### Storage Structure

Profile pictures are stored in the `profile-pictures` Supabase Storage bucket:
```
profile-pictures/
├── {user-id}/
│   ├── profile_{user-id}_{timestamp}.png
│   ├── profile_{user-id}_{timestamp}.jpg
│   └── profile_{user-id}_{timestamp}.gif
└── ...
```

### Services

#### ProfilePictureService (`lib/logic/services/profile_picture_service.dart`)

Core service for profile picture operations:

```dart
// Pick and crop image
File? imageFile = await ProfilePictureService.pickAndCropImage();

// Validate image
Result<void> validation = 
    await ProfilePictureService.validateImageFile(imageFile);

// Upload to storage
Result<String> uploadResult = 
    await ProfilePictureService.uploadProfilePicture(imageFile);

// Delete from storage
Result<void> deleteResult = 
    await ProfilePictureService.deleteProfilePicture(storagePath);

// Check if file is GIF
bool isGif = ProfilePictureService.isGifFile(filePath);

// Get file size
double sizeMB = await ProfilePictureService.getFileSizeInMB(file);

// Create thumbnail URL
String? thumbnailUrl = 
    ProfilePictureService.createThumbnailUrl(imageUrl);
```

**Key features:**
- Automatic image compression (85% quality)
- File size validation (5MB for images, 2MB for GIFs)
- Format validation (PNG, JPEG, GIF)
- Automatic cleanup of old profile pictures
- Error handling with Result pattern

#### ProfileApi (`lib/logic/services/profile_api.dart`)

API service for profile operations:

```dart
// Update profile avatar in database
Result<void> updateResult = 
    await ProfileApi.updateProfileAvatarUrl(userId, avatarUrl);

// Fetch connection's profile picture
Result<String?> pictureResult = 
    await ProfileApi.getProfilePictureUrl(userId);
```

### Providers

#### profilePictureUploadProvider (`lib/logic/providers/profile_picture_provider.dart`)

Riverpod provider for managing upload state:

```dart
final state = ref.watch(profilePictureUploadProvider);

// Upload profile picture
final result = await ref
    .read(profilePictureUploadProvider.notifier)
    .uploadProfilePicture();

// Clear error
ref.read(profilePictureUploadProvider.notifier).clearError();

// Reset state
ref.read(profilePictureUploadProvider.notifier).reset();
```

**Related providers:**
- `connectionProfilePictureProvider` - Fetch connection's picture
- `userProfilePictureThumbnailProvider` - Get user's thumbnail URL
- `profilePictureValidationProvider` - Validate files
- `isGifFileProvider` - Check if file is GIF

### UI Components

#### ProfilePicturePicker (`lib/ui/widgets/profile_picture_picker.dart`)

Interactive widget for picking and managing profile pictures:

```dart
ProfilePicturePicker(
  currentPhotoUrl: profile.photoUrl,
  displayName: profile.displayName,
  size: 120,
  onPhotoUpdated: () {
    // Handle photo update
  },
  showChangeButton: true,
)
```

**Features:**
- Display current or placeholder avatar
- Camera button overlay for easy access
- Bottom sheet with upload/delete options
- Error message display
- Loading state handling

#### ProfileSettingsSection (`lib/ui/widgets/profile_settings_section.dart`)

Complete profile settings UI section:

```dart
ProfileSettingsSection(
  onProfileUpdated: () {
    // Handle profile update
  },
)
```

**Displays:**
- Profile picture picker
- User name
- Email
- Information about profile picture visibility

## Usage Guide

### For Users

1. **Upload Profile Picture:**
   - Navigate to Settings
   - Tap on profile section
   - Click camera icon on avatar
   - Select "Upload New Picture"
   - Choose image from gallery
   - Crop to desired size (auto-crops to square)
   - Image uploads and syncs automatically

2. **Replace Profile Picture:**
   - Tap camera icon on avatar
   - Select "Upload New Picture"
   - Old picture is automatically deleted
   - New picture replaces old one

3. **Remove Profile Picture:**
   - Tap camera icon on avatar
   - Select "Remove Picture"
   - Confirm deletion
   - Reverts to Google/Apple provider image if available

4. **View Connections' Pictures:**
   - Pictures are automatically fetched and displayed in:
     - Contacts list
     - People groups
     - Event attendees
     - Sharing dialogs

### For Developers

#### Integration Steps

1. **Add Dependencies**
   ```yaml
   dependencies:
     image_picker: ^1.1.2
     image_cropper: ^11.0.0
   ```

2. **Update Database**
   ```bash
   # Apply migration
   psql -U postgres -d supabase_db -f supabase/schema/013_profile_pictures.sql
   ```

   Or use Supabase dashboard to run:
   ```sql
   -- Run the migration SQL from docs/PROFILE_PICTURE_FEATURE.md
   ```

3. **Create Storage Bucket**
   ```bash
   # Via Supabase dashboard or API
   # Bucket name: profile-pictures
   # Permissions: Public read, authenticated write
   ```

4. **Update Onboarding**
   - Ask user permission to use Google/Apple picture
   - Show optional profile picture upload step

5. **Test Integration**
   ```bash
   flutter test test/services/profile_picture_service_test.dart -v
   ```

#### Upload Workflow

```dart
// 1. Pick image
File? image = await ProfilePictureService.pickAndCropImage();

// 2. Validate
Result<void> validation = 
    await ProfilePictureService.validateImageFile(image!);

// 3. Upload
Result<String> result = 
    await ProfilePictureService.uploadProfilePicture(image);

// 4. Update profile
if (result.isSuccess) {
  await ProfileApi.updateProfileAvatarUrl(
    userId, 
    result.dataOrNull!,
  );
}
```

#### Error Handling

```dart
final result = await ref
    .read(profilePictureUploadProvider.notifier)
    .uploadProfilePicture();

if (!result.isSuccess) {
  final errorMessage = result.errorOrNull;
  // Show error to user
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(errorMessage!)),
  );
}
```

## File Size & Format Specifications

### Supported Formats
- PNG (.png) - Lossless, recommended for line art
- JPEG (.jpg, .jpeg) - Lossy, recommended for photos
- GIF (.gif) - Animated GIFs supported

### Size Limits
- **Images (PNG/JPEG):** Max 5MB
- **GIFs:** Max 2MB (for smooth animation)
- **Display:** Auto-scaled to square (1:1 aspect ratio)

### Quality Settings
- **Upload:** 85% compression quality
- **Format:** Auto-crops to square format
- **Storage:** Lossless for PNG, optimized JPEG

## Testing

### Unit Tests

Located in `test/services/profile_picture_service_test.dart`

```bash
# Run all profile picture tests
flutter test test/services/profile_picture_service_test.dart -v

# Run specific test
flutter test test/services/profile_picture_service_test.dart \
  -v --name "validateImageFile"
```

**Test Coverage:**
- ✅ File format validation (19 tests)
- ✅ File size validation
- ✅ GIF detection
- ✅ Thumbnail URL generation
- ✅ Stress testing (100+ rapid operations)
- ✅ Concurrent operations
- ✅ Performance under load

### Integration Testing

```dart
// Test the complete workflow
test('complete profile picture upload workflow', () async {
  // 1. Pick image
  // 2. Validate
  // 3. Upload
  // 4. Update profile
  // 5. Verify sync
});
```

## Performance Optimization

### Thumbnail URLs

For displaying profile pictures in lists, use thumbnail URLs:

```dart
String? thumbnailUrl = 
    ProfilePictureService.createThumbnailUrl(fullImageUrl);

// Usage in Image widget
Image.network(
  thumbnailUrl ?? fullImageUrl,
  width: 40,
  height: 40,
  fit: BoxFit.cover,
)
```

### Image Caching

Network images are automatically cached by Flutter:

```dart
Image.network(
  imageUrl,
  cacheWidth: 200,
  cacheHeight: 200,
  fit: BoxFit.cover,
)
```

### Storage Optimization

Old profile pictures are automatically deleted when new ones are uploaded:

```dart
// Automatic cleanup happens in uploadProfilePicture()
await _deleteOldProfilePicture(userId);
```

## Security & Privacy

### Access Control

- **RLS Policies:** Only authenticated users can upload
- **Public Read:** Profile pictures are publicly readable
- **User Restrictions:** Users can only upload their own pictures

### Data Protection

- Images stored in Supabase Storage (encrypted at rest)
- User IDs are folder names for organization
- No sensitive data in image metadata

### Network Security

- HTTPS only for image transfer
- Supabase handles SSL/TLS
- Image URLs are signed for Supabase Storage

## Troubleshooting

### Common Issues

**Issue: Image upload fails**
- Check file size (max 5MB for images, 2MB for GIFs)
- Verify file format (PNG, JPEG, GIF only)
- Ensure user is authenticated
- Check internet connection

**Issue: Image doesn't appear**
- Verify Supabase Storage bucket exists
- Check public read permissions on bucket
- Ensure avatar_url is correctly stored in profiles table
- Check image URL in browser

**Issue: Crop dialog doesn't appear**
- Verify image_cropper package is installed
- Check platform-specific permissions (iOS/Android)
- Ensure image file is valid

**Issue: Performance issues**
- Use thumbnail URLs for lists
- Enable image caching
- Compress images before upload (automatic)
- Consider pagination for large contact lists

## Migration Guide

### From Existing Avatar URLs

If migrating from existing avatar_url field:

```sql
UPDATE public.profiles
SET profile_picture_source = CASE
  WHEN avatar_url LIKE '%storage.supabase.co%' THEN 'custom'
  ELSE 'provider'
END
WHERE profile_picture_source IS NULL;
```

### Data Import

Preserve existing Google profile pictures:

```dart
// During onboarding migration
final existingPhotoUrl = user.userMetadata?['picture'];
if (existingPhotoUrl != null) {
  await ProfileApi.updateProfileAvatarUrl(
    userId,
    existingPhotoUrl,
  );
}
```

## Future Enhancements

- [ ] Video profile pictures (short clips)
- [ ] Animated avatars
- [ ] Profile picture filters/effects
- [ ] Multiple picture gallery
- [ ] Picture versioning/history
- [ ] AI avatar generation
- [ ] Smart image compression based on network speed
- [ ] Offline image caching

## Support

For issues or questions:
1. Check test cases for usage examples
2. Review service documentation in code comments
3. Check Supabase Storage bucket permissions
4. Verify RLS policies are correctly applied
5. Enable debug logging for troubleshooting

## References

- [image_picker package](https://pub.dev/packages/image_picker)
- [image_cropper package](https://pub.dev/packages/image_cropper)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Riverpod documentation](https://riverpod.dev)
