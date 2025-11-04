import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'package:myorbit_calendar/core/di/service_locator.dart';
import 'package:myorbit_calendar/core/enums/app_state_status.dart';
import 'package:myorbit_calendar/core/theme_constants.dart';
import 'package:myorbit_calendar/domain/event.dart';
import 'package:myorbit_calendar/features/calendar/presentation/cubit/event_invite_cubit.dart';
import 'package:myorbit_calendar/ui/widgets/attendee_list.dart';
import 'package:myorbit_calendar/ui/widgets/contact_avatar.dart';
import 'package:myorbit_calendar/ui/widgets/event_invite_card.dart';

/// Event Invite Response Sheet - Migrated to BLoC
class EventInviteResponseSheetBloc extends StatefulWidget {
  final String inviteId;

  const EventInviteResponseSheetBloc({
    super.key,
    required this.inviteId,
  });

  @override
  State<EventInviteResponseSheetBloc> createState() =>
      _EventInviteResponseSheetBlocState();

  /// Show the sheet as a modal bottom sheet
  static Future<void> show(BuildContext context, String inviteId) async {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => BlocProvider<EventInviteCubit>(
        create: (_) => sl<EventInviteCubit>()..loadInviteDetails(inviteId),
        child: EventInviteResponseSheetBloc(inviteId: inviteId),
      ),
    );
  }
}

class _EventInviteResponseSheetBlocState
    extends State<EventInviteResponseSheetBloc> {
  InviteStatus? _selectedResponse;
  final _noteController = TextEditingController();
  bool _showNoteField = false;

  @override
  void initState() {
    super.initState();
    // Check for conflicts when details are loaded
    context.read<EventInviteCubit>().checkConflicts(widget.inviteId);
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }


  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final textTheme = Theme.of(context).textTheme;

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
          return BlocConsumer<EventInviteCubit, EventInviteState>(
            listener: (context, state) {
              // Handle response success/failure
              if (state.status == AppStateStatus.success &&
                  state.message.isNotEmpty &&
                  state.message.contains('Response sent')) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(_getSuccessMessage()),
                    backgroundColor: AppColors.activityGreen,
                    behavior: SnackBarBehavior.floating,
                    duration: const Duration(seconds: 3),
                  ),
                );
              } else if (state.status == AppStateStatus.failure) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Failed to respond: ${state.message}'),
                    backgroundColor: AppColors.activityRed,
                    behavior: SnackBarBehavior.floating,
                    action: SnackBarAction(
                      label: 'Retry',
                      textColor: Colors.white,
                      onPressed: () => _handleResponse(context),
                    ),
                  ),
                );
              }
            },
            builder: (context, state) {
              if (state.status == AppStateStatus.loading &&
                  state.currentInviteDetails == null) {
                return _buildLoading(palette);
              }

              if (state.status == AppStateStatus.failure &&
                  state.currentInviteDetails == null) {
                return _buildError(state.message, palette);
              }

              final details = state.currentInviteDetails;
              if (details == null) {
                return _buildError('Invite not found', palette);
              }

              return _buildContent(
                context,
                scrollController,
                details,
                state,
                palette,
                textTheme,
              );
            },
          );
        },
      ),
    );
  }

  Widget _buildContent(
    BuildContext context,
    ScrollController scrollController,
    EventInviteDetails details,
    EventInviteState state,
    AppPalette palette,
    TextTheme textTheme,
  ) {
    final isResponding = state.status == AppStateStatus.loading;

    return Column(
      children: [
        // Handle bar
        Container(
          margin: const EdgeInsets.only(top: 12),
          width: 40,
          height: 4,
          decoration: BoxDecoration(
            color: palette.divider,
            borderRadius: BorderRadius.circular(2),
          ),
        ),

        // Header
        Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              const Icon(
                Icons.event_available,
                color: AppColors.primary,
                size: 28,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Event Invitation',
                  style: textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: palette.textPrimary,
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context),
                color: palette.chevronColor,
                tooltip: 'Close invitation details',
              ),
            ],
          ),
        ),

        Divider(color: palette.divider, height: 1),

        // Scrollable content
        Expanded(
          child: SingleChildScrollView(
            controller: scrollController,
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Event Card
                EventInviteCard(details: details),

                const SizedBox(height: 24),

                // Organizer
                _buildOrganizerSection(details, palette, textTheme),

                const SizedBox(height: 24),

                // Attendees (if any)
                if (details.attendees.isNotEmpty) ...[
                  _buildAttendeesSection(details, palette, textTheme),
                  const SizedBox(height: 24),
                ],

                // Conflict Warning
                if (state.conflicts.isNotEmpty)
                  _buildConflictWarning(state.conflicts, palette, textTheme),

                const SizedBox(height: 24),

                // Response Options
                _buildResponseOptions(palette, textTheme),

                // Optional Note Field
                if (_showNoteField) ...[
                  const SizedBox(height: 16),
                  _buildNoteField(palette, textTheme),
                ],

                const SizedBox(height: 24),

                // Action Buttons
                _buildActionButtons(context, palette, isResponding),
              ],
            ),
          ),
        ),
      ],
    );
  }


  Widget _buildOrganizerSection(
    EventInviteDetails details,
    AppPalette palette,
    TextTheme textTheme,
  ) {
    return Row(
      children: [
        ContactAvatar(
          name: details.organizer.name,
          radius: 24,
          avatarUrl: details.organizer.avatarUrl,
          photoBase64: details.organizer.localPhotoBase64,
          colorHexOverride: details.organizer.colorHex,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Organized by',
                style: textTheme.bodySmall?.copyWith(
                  color: palette.textSecondary,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                details.organizer.name,
                style: textTheme.bodyLarge?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: palette.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildAttendeesSection(
    EventInviteDetails details,
    AppPalette palette,
    TextTheme textTheme,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Attendees (${details.attendees.length})',
          style: textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
            color: palette.textPrimary,
          ),
        ),
        const SizedBox(height: 12),
        AttendeeList(attendees: details.attendees, maxVisible: 5),
      ],
    );
  }

  Widget _buildConflictWarning(
    List<CalendarEvent> conflicts,
    AppPalette palette,
    TextTheme textTheme,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.activityRedLight,
        borderRadius: BorderRadius.circular(AppBorderRadius.medium),
        border: Border.all(color: AppColors.activityRed.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.warning_amber, color: AppColors.activityRed, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Schedule Conflict',
                  style: textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppColors.activityRed,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'You have ${conflicts.length} other event${conflicts.length > 1 ? 's' : ''} at this time',
                  style: textTheme.bodySmall?.copyWith(
                    color: AppColors.activityRed,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildResponseOptions(AppPalette palette, TextTheme textTheme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Your Response',
          style: textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
            color: palette.textPrimary,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _ResponseOption(
                label: 'Accept',
                icon: Icons.check_circle,
                color: AppColors.activityGreen,
                isSelected: _selectedResponse == InviteStatus.accepted,
                onTap: () {
                  setState(() {
                    _selectedResponse = InviteStatus.accepted;
                  });
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _ResponseOption(
                label: 'Maybe',
                icon: Icons.help_outline,
                color: AppColors.eventOrange,
                isSelected: _selectedResponse == InviteStatus.pending,
                onTap: () {
                  setState(() {
                    _selectedResponse = InviteStatus.pending;
                  });
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _ResponseOption(
                label: 'Decline',
                icon: Icons.cancel,
                color: AppColors.activityRed,
                isSelected: _selectedResponse == InviteStatus.declined,
                onTap: () {
                  setState(() {
                    _selectedResponse = InviteStatus.declined;
                  });
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        TextButton.icon(
          onPressed: () {
            setState(() {
              _showNoteField = !_showNoteField;
            });
          },
          icon: Icon(_showNoteField ? Icons.remove : Icons.add, size: 18),
          label: Text(_showNoteField ? 'Remove note' : 'Add a note'),
          style: TextButton.styleFrom(
            foregroundColor: AppColors.primary,
            padding: EdgeInsets.zero,
          ),
        ),
      ],
    );
  }


  Widget _buildNoteField(AppPalette palette, TextTheme textTheme) {
    return TextField(
      controller: _noteController,
      maxLines: 3,
      maxLength: 200,
      decoration: InputDecoration(
        hintText: 'Add a note (optional)',
        hintStyle: TextStyle(color: palette.textTertiary),
        filled: true,
        fillColor: palette.surfaceVariant,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppBorderRadius.medium),
          borderSide: BorderSide(color: palette.divider),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppBorderRadius.medium),
          borderSide: BorderSide(color: palette.divider),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppBorderRadius.medium),
          borderSide: const BorderSide(color: AppColors.primary, width: 2),
        ),
      ),
      style: textTheme.bodyMedium?.copyWith(color: palette.textPrimary),
    );
  }

  Widget _buildActionButtons(
    BuildContext context,
    AppPalette palette,
    bool isResponding,
  ) {
    final hasResponse = _selectedResponse != null;

    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton(
            onPressed: hasResponse && !isResponding
                ? () => _handleResponse(context)
                : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              disabledBackgroundColor: AppColors.disabledColor,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppBorderRadius.medium),
              ),
            ),
            child: isResponding
                ? const SizedBox(
                    height: 24,
                    width: 24,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : Text(
                    _getButtonText(),
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
          ),
        ),
        const SizedBox(height: 12),
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(
            'Decide Later',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: palette.textSecondary,
            ),
          ),
        ),
      ],
    );
  }

  String _getButtonText() {
    if (_selectedResponse == null) return 'Select a Response';
    switch (_selectedResponse!) {
      case InviteStatus.accepted:
        return 'Accept Invitation';
      case InviteStatus.declined:
        return 'Decline Invitation';
      case InviteStatus.pending:
        return 'Respond Maybe';
    }
  }

  Future<void> _handleResponse(BuildContext context) async {
    if (_selectedResponse == null) return;

    await context.read<EventInviteCubit>().respondToInvite(
          widget.inviteId,
          _selectedResponse!,
          note: _noteController.text.isNotEmpty ? _noteController.text : null,
        );
  }

  String _getSuccessMessage() {
    switch (_selectedResponse!) {
      case InviteStatus.accepted:
        return 'Invite accepted! Event added to your calendar';
      case InviteStatus.declined:
        return 'Invite declined';
      case InviteStatus.pending:
        return 'Response sent: Maybe';
    }
  }

  Widget _buildLoading(AppPalette palette) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircularProgressIndicator(),
          const SizedBox(height: 16),
          Text(
            'Loading event details...',
            style: TextStyle(color: palette.textSecondary),
          ),
        ],
      ),
    );
  }

  Widget _buildError(String error, AppPalette palette) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline,
                size: 64, color: AppColors.activityRed),
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
// RESPONSE OPTION WIDGET
// ======================================================================

class _ResponseOption extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final bool isSelected;
  final VoidCallback onTap;

  const _ResponseOption({
    required this.label,
    required this.icon,
    required this.color,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color:
              isSelected ? color.withValues(alpha: 0.15) : Colors.transparent,
          border: Border.all(
            color: isSelected ? color : AppColors.dividerColor,
            width: isSelected ? 2 : 1,
          ),
          borderRadius: BorderRadius.circular(AppBorderRadius.medium),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: isSelected ? color : AppColors.textSecondary,
              size: 32,
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                color: isSelected ? color : AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
