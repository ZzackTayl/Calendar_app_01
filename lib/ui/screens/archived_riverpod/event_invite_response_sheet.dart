import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme_constants.dart';
// Unused imports removed - will be added back during BLoC migration
// import '../../../domain/event.dart';
// import '../../../features/calendar/presentation/cubit/event_invite_cubit.dart';
// import '../../widgets/contact_avatar.dart';
// import '../../widgets/event_invite_card.dart';
// import '../../widgets/attendee_list.dart';
// import '../../logic/providers/event_invite_providers.dart'; // TODO: Migrate to BLoC

/// Event Invite Response Sheet - Full featured invite handling
class EventInviteResponseSheet extends ConsumerStatefulWidget {
  final String inviteId;

  const EventInviteResponseSheet({
    super.key,
    required this.inviteId,
  });

  @override
  ConsumerState<EventInviteResponseSheet> createState() =>
      _EventInviteResponseSheetState();

  /// Show the sheet as a modal bottom sheet
  static Future<void> show(BuildContext context, String inviteId) async {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => EventInviteResponseSheet(inviteId: inviteId),
    );
  }
}

class _EventInviteResponseSheetState
    extends ConsumerState<EventInviteResponseSheet> {
  // Unused fields removed - will be added back during BLoC migration
  // InviteStatus? _selectedResponse;
  final _noteController = TextEditingController();
  // bool _showNoteField = false;
  // bool _isResponding = false;

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // TODO: Migrate to BLoC - use EventInviteCubit instead
    // final inviteDetailsAsync =
    //     ref.watch(inviteDetailsProvider(widget.inviteId));
    final palette = AppPalette.of(context);

    return Container(
      decoration: BoxDecoration(
        color: palette.surface,
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(AppBorderRadius.xLarge),
        ),
      ),
      child: DraggableScrollableSheet(
        initialChildSize: 0.75,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) {
          // TODO: Migrate to BLoC - use EventInviteCubit instead
          return _buildError('This screen needs migration to BLoC', palette);
          // return inviteDetailsAsync.when(
          //   data: (details) => _buildContent(
          //     context,
          //     scrollController,
          //     details,
          //     palette,
          //     textTheme,
          //   ),
          //   loading: () => _buildLoading(palette),
          //   error: (error, stack) => _buildError(error.toString(), palette),
          // );
        },
      ),
    );
  }

  // All UI builder methods and handlers removed - will be reimplemented during BLoC migration
  // These methods referenced EventInviteDetails and other Riverpod-specific code
  // Methods removed: _buildContent, _buildOrganizerSection, _buildAttendeesSection,
  // _buildConflictWarning, _buildResponseOptions, _buildNoteField, _buildActionButtons,
  // _getButtonText, _handleResponse, _getSuccessMessage, _buildLoading

  Widget _buildError(String error, AppPalette palette) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: AppColors.activityRed),
            const SizedBox(height: 16),
            Text(
              'Failed to load event',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: palette.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              error,
              textAlign: TextAlign.center,
              style: TextStyle(color: palette.textSecondary),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ],
        ),
      ),
    );
  }
}

// ======================================================================
// RESPONSE OPTION WIDGET - Removed, will be reimplemented during BLoC migration
// ======================================================================
