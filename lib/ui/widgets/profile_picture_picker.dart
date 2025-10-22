import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme_constants.dart';
import '../../logic/services/profile_picture_service.dart';
import '../../logic/providers/user_profile_provider.dart';
import '../widgets/user_profile_avatar.dart';

/// Widget for picking and managing user profile picture
/// Displays current avatar with ability to upload/change picture
class ProfilePicturePicker extends ConsumerStatefulWidget {
  final String? currentPhotoUrl;
  final String? displayName;
  final double size;
  final VoidCallback? onPhotoUpdated;
  final bool showChangeButton;

  const ProfilePicturePicker({
    super.key,
    this.currentPhotoUrl,
    this.displayName,
    this.size = 120,
    this.onPhotoUpdated,
    this.showChangeButton = true,
  });

  @override
  ConsumerState<ProfilePicturePicker> createState() =>
      _ProfilePicturePickerState();
}

class _ProfilePicturePickerState extends ConsumerState<ProfilePicturePicker> {
  bool _isUploading = false;
  String? _errorMessage;

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final theme = Theme.of(context);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Stack(
          alignment: Alignment.bottomRight,
          children: [
            UserProfileAvatar(
              photoUrl: widget.currentPhotoUrl,
              displayName: widget.displayName,
              size: widget.size,
            ),
            if (widget.showChangeButton)
              Container(
                decoration: BoxDecoration(
                  color: theme.colorScheme.secondary,
                  borderRadius: BorderRadius.circular(widget.size / 4),
                  boxShadow: [
                    BoxShadow(
                      color: palette.cardShadow,
                      blurRadius: 4,
                      offset: const Offset(0, 1),
                    ),
                  ],
                ),
                child: Material(
                  color: Colors.transparent,
                  child: Semantics(
                    label: _isUploading
                        ? 'Uploading new profile photo'
                        : 'Change profile photo',
                    hint: widget.displayName != null
                        ? 'Opens options to update photo for ${widget.displayName}'
                        : 'Opens options to upload or take a new photo',
                    button: true,
                    enabled: !_isUploading,
                    onTap: _isUploading ? null : _showPhotoActionDialog,
                    child: InkWell(
                      onTap: _isUploading ? null : _showPhotoActionDialog,
                      borderRadius: BorderRadius.circular(widget.size / 8),
                      child: Padding(
                        padding: const EdgeInsets.all(8),
                        child: _isUploading
                            ? SizedBox(
                                width: widget.size * 0.2,
                                height: widget.size * 0.2,
                                child: const CircularProgressIndicator(
                                  strokeWidth: 2,
                                  semanticsLabel: 'Uploading profile photo',
                                  valueColor: AlwaysStoppedAnimation(
                                    Colors.white,
                                  ),
                                ),
                              )
                            : ExcludeSemantics(
                                child: Icon(
                                  Icons.camera_alt,
                                  color: Colors.white,
                                  size: widget.size * 0.2,
                                ),
                              ),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 16),
        if (_errorMessage != null) ...[
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: theme.colorScheme.error.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: theme.colorScheme.error.withValues(alpha: 0.3),
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  Icons.error_outline,
                  color: theme.colorScheme.error,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _errorMessage!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.error,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: () => setState(() => _errorMessage = null),
                  icon: Icon(
                    Icons.close,
                    color: theme.colorScheme.error,
                    size: 16,
                  ),
                  tooltip: 'Dismiss error message',
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
        ],
      ],
    );
  }

  void _showPhotoActionDialog() {
    final palette = AppPalette.of(context);
    final theme = Theme.of(context);

    showModalBottomSheet<void>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (BuildContext context) {
        return Container(
          color: palette.background,
          child: SafeArea(
            top: false,
            child: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Text(
                        'Profile Picture',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: palette.textPrimary,
                        ),
                      ),
                    ),
                    ListTile(
                      leading: Icon(
                        Icons.upload_file,
                        color: theme.colorScheme.secondary,
                      ),
                      title: const Text('Upload New Picture'),
                      subtitle: const Text('Choose from your device'),
                      onTap: () {
                        Navigator.of(context).pop();
                        _uploadProfilePicture();
                      },
                    ),
                    if (widget.currentPhotoUrl != null) ...[
                      const Divider(),
                      ListTile(
                        leading: Icon(
                          Icons.delete,
                          color: theme.colorScheme.error,
                        ),
                        title: const Text('Remove Picture'),
                        subtitle: const Text('Delete current profile picture'),
                        textColor: theme.colorScheme.error,
                        onTap: () {
                          Navigator.of(context).pop();
                          _showDeleteConfirmation();
                        },
                      ),
                    ],
                    const SizedBox(height: 8),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  void _showDeleteConfirmation() {
    final theme = Theme.of(context);

    showDialog<void>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Remove Picture?'),
          content: const Text(
            'Are you sure you want to remove your profile picture? '
            'If you have a provider picture (Google/Apple), it will be used instead.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                _removeProfilePicture();
              },
              style: TextButton.styleFrom(
                foregroundColor: theme.colorScheme.error,
              ),
              child: const Text('Remove'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _uploadProfilePicture() async {
    try {
      setState(() {
        _isUploading = true;
        _errorMessage = null;
      });

      // Pick and crop image
      final imageFile = await ProfilePictureService.pickAndCropImage();
      if (imageFile == null) {
        setState(() => _isUploading = false);
        return;
      }

      // Validate
      final validationResult =
          await ProfilePictureService.validateImageFile(imageFile);
      if (!validationResult.isSuccess) {
        setState(() {
          _isUploading = false;
          _errorMessage = validationResult.errorOrNull ?? 'Unknown error';
        });
        return;
      }

      // Upload
      final uploadResult =
          await ProfilePictureService.uploadProfilePicture(imageFile);

      if (!uploadResult.isSuccess) {
        setState(() {
          _isUploading = false;
          _errorMessage = uploadResult.errorOrNull ?? 'Upload failed';
        });
        return;
      }

      // Update profile URL in database
      final publicUrl = uploadResult.dataOrNull;
      if (publicUrl != null) {
        final currentUser = ref.read(userProfileProvider).value;
        if (currentUser != null) {
          // Update local state and trigger refresh
          await ref
              .read(userProfileControllerProvider.notifier)
              .updatePhotoUrl(publicUrl);

          if (mounted) {
            setState(() => _isUploading = false);
            widget.onPhotoUpdated?.call();

            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Profile picture updated successfully!'),
                duration: Duration(seconds: 2),
              ),
            );
          }
        }
      }
    } catch (e) {
      setState(() {
        _isUploading = false;
        _errorMessage = 'Error: ${e.toString()}';
      });
    }
  }

  Future<void> _removeProfilePicture() async {
    try {
      setState(() => _isUploading = true);

      // Reset to provider picture by setting to null (local logic)
      // In production, you'd also delete from Supabase Storage
      final currentUser = ref.read(userProfileProvider).value;
      if (currentUser != null) {
        // Reset profile picture
        await ref
            .read(userProfileControllerProvider.notifier)
            .updatePhotoUrl('');

        if (mounted) {
          setState(() => _isUploading = false);
          widget.onPhotoUpdated?.call();

          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Profile picture removed'),
              duration: Duration(seconds: 2),
            ),
          );
        }
      }
    } catch (e) {
      setState(() {
        _isUploading = false;
        _errorMessage = 'Error: ${e.toString()}';
      });
    }
  }
}
