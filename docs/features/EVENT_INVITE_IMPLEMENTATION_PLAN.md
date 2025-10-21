# 🎯 Event Invite Response Feature - Implementation Plan
## Full Bells & Whistles Edition

**Status:** Ready to Build  
**Estimated Time:** 2-3 hours  
**Priority:** HIGH (Core user flow)

---

## 📋 **Table of Contents**

1. [Architecture Overview](#architecture-overview)
2. [Phase 1: Backend Integration (API Layer)](#phase-1-backend-integration-api-layer)
3. [Phase 2: State Management (Providers)](#phase-2-state-management-providers)
4. [Phase 3: UI Components](#phase-3-ui-components)
5. [Phase 4: Notifications Integration](#phase-4-notifications-integration)
6. [Phase 5: Edge Cases & Polish](#phase-5-edge-cases--polish)
7. [Testing Checklist](#testing-checklist)

---

## 🏗️ **Architecture Overview**

### **How This Fits Into MyOrbit**

```
User Taps Notification
        ↓
lib/ui/screens/notifications_screen.dart
        ↓
_handleNotificationTap() detects event invite
        ↓
Shows EventInviteResponseSheet (NEW)
        ↓
User selects Accept/Maybe/Decline
        ↓
EventInviteNotifier (NEW) handles response
        ↓
CalendarApi.respondToEventInvite() (NEW)
        ↓
Updates Supabase event_invites table
        ↓
Creates notification for event owner
        ↓
Auto-adds event to local calendar (if accepted)
        ↓
Updates UI state & closes modal
```

### **Files to Create/Modify**

| File | Action | Purpose |
|------|--------|---------|
| `lib/logic/services/api_service.dart` | **Modify** | Add invite response API methods |
| `lib/logic/providers/event_invite_providers.dart` | **Create** | State management for invites |
| `lib/ui/screens/event_invite_response_sheet.dart` | **Create** | Main invite response UI |
| `lib/ui/widgets/event_invite_card.dart` | **Create** | Reusable event display card |
| `lib/ui/widgets/attendee_list.dart` | **Create** | Show who's coming |
| `lib/ui/screens/notifications_screen.dart` | **Modify** | Handle invite tap |
| `lib/domain/notification.dart` | **Modify** | Add event invite metadata helpers |

---

## 📦 **Phase 1: Backend Integration (API Layer)**

### **File:** `lib/logic/services/api_service.dart`

Add these methods to `CalendarApi` class:

```dart
// ======================================================================
// EVENT INVITE METHODS
// ======================================================================

/// Respond to an event invitation
static Future<Result<void>> respondToEventInvite(
  String inviteId,
  EventInviteStatus response,
  {String? note}
) async {
  try {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) {
      return const Failure('User not authenticated');
    }

    // Update the invite status
    await _client
        .from('event_invites')
        .update({
          'status': response.name,
          'responded_at': DateTime.now().toIso8601String(),
        })
        .eq('id', inviteId);

    // Fetch the event and invite details to create notification
    final inviteData = await _client
        .from('event_invites')
        .select('event_id, contact_id')
        .eq('id', inviteId)
        .single();
    
    final eventData = await _client
        .from('events')
        .select('owner_id, title')
        .eq('id', inviteData['event_id'])
        .single();

    // Create notification for event owner
    final currentProfile = await _client
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .single();

    String notificationMessage;
    String notificationType;
    switch (response) {
      case EventInviteStatus.accepted:
        notificationMessage = '${currentProfile['display_name']} accepted your invite to "${eventData['title']}"';
        notificationType = 'event-accepted';
        break;
      case EventInviteStatus.declined:
        notificationMessage = '${currentProfile['display_name']} declined your invite to "${eventData['title']}"';
        notificationType = 'event-declined';
        break;
      case EventInviteStatus.pending:
        // Maybe response
        notificationMessage = '${currentProfile['display_name']} responded "Maybe" to "${eventData['title']}"';
        notificationType = 'event-maybe';
        break;
    }

    await _client.from('notifications').insert({
      'user_id': eventData['owner_id'],
      'type': 'event-update',
      'title': notificationMessage,
      'body': note ?? 'Tap to view event details',
      'data': {
        'event_id': inviteData['event_id'],
        'invite_id': inviteId,
        'response': response.name,
      },
      'created_at': DateTime.now().toIso8601String(),
    });

    developer.log(
      'Responded to invite $inviteId with $response',
      name: 'CalendarApi',
    );

    return const Success(null);
  } on SocketException catch (e) {
    developer.log('Network error responding to invite: $e', name: 'CalendarApi');
    return Failure(
      'Unable to connect. Please check your internet connection.',
      e,
    );
  } on PostgrestException catch (e) {
    developer.log('Database error responding to invite: $e', name: 'CalendarApi');
    return Failure('Failed to respond to invite.', e);
  } catch (e) {
    developer.log('Error responding to invite: $e', name: 'CalendarApi');
    return Failure('Failed to respond to invite.', e as Exception?);
  }
}

/// Get pending event invites for current user
static Future<Result<List<EventInvite>>> getPendingInvites() async {
  try {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) {
      return const Failure('User not authenticated');
    }

    // Get user's contacts to find their own contact_id
    final userContact = await _client
        .from('contacts')
        .select('id')
        .eq('external_user_id', userId)
        .maybeSingle();

    if (userContact == null) {
      return const Success([]);
    }

    final response = await _client
        .from('event_invites')
        .select()
        .eq('contact_id', userContact['id'])
        .eq('status', 'pending')
        .order('created_at', ascending: false);

    final invites = (response as List)
        .map((json) => EventInvite.fromJson(json))
        .toList();

    return Success(invites);
  } on SocketException catch (e) {
    developer.log('Network error fetching invites: $e', name: 'CalendarApi');
    return Failure(
      'Unable to connect. Please check your internet connection.',
      e,
    );
  } on PostgrestException catch (e) {
    developer.log('Database error fetching invites: $e', name: 'CalendarApi');
    return Failure('Failed to load invites.', e);
  } catch (e) {
    developer.log('Error fetching invites: $e', name: 'CalendarApi');
    return Failure('Failed to load invites.', e as Exception?);
  }
}

/// Get event details for an invite
static Future<Result<CalendarEvent>> getEventForInvite(String inviteId) async {
  try {
    final inviteData = await _client
        .from('event_invites')
        .select('event_id')
        .eq('id', inviteId)
        .single();

    final eventData = await _client
        .from('events')
        .select()
        .eq('id', inviteData['event_id'])
        .single();

    final event = CalendarEvent.fromJson(eventData);
    return Success(event);
  } on SocketException catch (e) {
    developer.log('Network error fetching event: $e', name: 'CalendarApi');
    return Failure(
      'Unable to connect. Please check your internet connection.',
      e,
    );
  } on PostgrestException catch (e) {
    developer.log('Database error fetching event: $e', name: 'CalendarApi');
    return Failure('Failed to load event.', e);
  } catch (e) {
    developer.log('Error fetching event: $e', name: 'CalendarApi');
    return Failure('Failed to load event.', e as Exception?);
  }
}
```

**Why This Design:**
- ✅ Uses existing `Result<T>` pattern (your standard)
- ✅ Follows your error handling approach
- ✅ Integrates with Supabase RLS policies
- ✅ Creates bi-directional notifications
- ✅ Handles offline gracefully

---

## 📱 **Phase 2: State Management (Providers)**

### **File:** `lib/logic/providers/event_invite_providers.dart` (**NEW**)

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../domain/event.dart';
import '../../domain/contact.dart';
import '../services/api_service.dart';
import 'event_providers.dart';
import 'contact_providers.dart';
import 'notification_providers.dart';

part 'event_invite_providers.g.dart';

// ======================================================================
// PROVIDERS
// ======================================================================

/// Pending event invites for current user
@riverpod
Future<List<EventInvite>> pendingEventInvites(Ref ref) async {
  final result = await CalendarApi.getPendingInvites();
  return result.when(
    success: (invites) => invites,
    failure: (message, exception) => throw Exception(message),
  );
}

/// Event details for a specific invite
@riverpod
Future<CalendarEvent> eventForInvite(Ref ref, String inviteId) async {
  final result = await CalendarApi.getEventForInvite(inviteId);
  return result.when(
    success: (event) => event,
    failure: (message, exception) => throw Exception(message),
  );
}

/// Invite details with full event and contact info
@riverpod
Future<EventInviteDetails> inviteDetails(Ref ref, String inviteId) async {
  // Fetch event
  final eventResult = await CalendarApi.getEventForInvite(inviteId);
  final event = eventResult.when(
    success: (e) => e,
    failure: (message, _) => throw Exception(message),
  );

  // Fetch organizer contact
  final contacts = ref.watch(contactListProvider);
  final organizerContact = contacts.when(
    data: (list) => list.firstWhere(
      (c) => c.externalUserId == event.ownerId,
      orElse: () => Contact(
        id: 'unknown',
        name: 'Unknown',
        email: '',
        phone: null,
        colorHex: '#4D8CFF',
        permission: PartnerPermission.private,
        status: ContactStatus.accepted,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        externalUserId: event.ownerId,
      ),
    ),
    loading: () => throw Exception('Loading contacts'),
    error: (_, __) => throw Exception('Failed to load contacts'),
  );

  // Fetch invited contacts (attendees)
  final attendees = contacts.when(
    data: (list) => list.where(
      (c) => event.invitedPartnerIds.contains(c.id),
    ).toList(),
    loading: () => <Contact>[],
    error: (_, __) => <Contact>[],
  );

  return EventInviteDetails(
    inviteId: inviteId,
    event: event,
    organizer: organizerContact,
    attendees: attendees,
  );
}

// ======================================================================
// STATE NOTIFIER
// ======================================================================

@riverpod
class EventInviteNotifier extends _$EventInviteNotifier {
  @override
  AsyncValue<void> build() => const AsyncValue.data(null);

  /// Respond to an event invitation
  Future<void> respondToInvite(
    String inviteId,
    EventInviteStatus response, {
    String? note,
  }) async {
    state = const AsyncValue.loading();

    final result = await CalendarApi.respondToEventInvite(
      inviteId,
      response,
      note: note,
    );

    result.when(
      success: (_) async {
        // If accepted, auto-add event to calendar
        if (response == EventInviteStatus.accepted) {
          final eventResult = await CalendarApi.getEventForInvite(inviteId);
          eventResult.when(
            success: (event) {
              // Refresh events to show newly accepted event
              ref.invalidate(eventListProvider);
            },
            failure: (_, __) {
              // Ignore error, event will sync eventually
            },
          );
        }

        // Refresh pending invites
        ref.invalidate(pendingEventInvitesProvider);
        
        // Refresh notifications
        ref.invalidate(notificationListProvider);

        state = const AsyncValue.data(null);
      },
      failure: (message, exception) {
        state = AsyncValue.error(Exception(message), StackTrace.current);
      },
    );
  }

  /// Check for calendar conflicts for an invite
  Future<List<CalendarEvent>> checkConflicts(String inviteId) async {
    final eventResult = await CalendarApi.getEventForInvite(inviteId);
    final event = eventResult.when(
      success: (e) => e,
      failure: (_, __) => null,
    );

    if (event == null) return [];

    final eventsAsync = ref.read(eventListProvider);
    final allEvents = eventsAsync.when(
      data: (events) => events,
      loading: () => <CalendarEvent>[],
      error: (_, __) => <CalendarEvent>[],
    );

    // Find overlapping events
    return allEvents.where((e) {
      if (e.id == event.id) return false; // Skip self
      
      // Check time overlap
      final hasOverlap = e.start.isBefore(event.end) && e.end.isAfter(event.start);
      return hasOverlap;
    }).toList();
  }
}

// ======================================================================
// MODELS
// ======================================================================

/// Full event invite details with related data
class EventInviteDetails {
  final String inviteId;
  final CalendarEvent event;
  final Contact organizer;
  final List<Contact> attendees;

  const EventInviteDetails({
    required this.inviteId,
    required this.event,
    required this.organizer,
    required this.attendees,
  });

  /// Duration of the event
  Duration get duration => event.end.difference(event.start);

  /// Formatted duration (e.g., "1 hour", "30 minutes")
  String get formattedDuration {
    final minutes = duration.inMinutes;
    if (minutes < 60) {
      return '$minutes min';
    } else if (minutes % 60 == 0) {
      final hours = minutes ~/ 60;
      return '$hours hour${hours > 1 ? 's' : ''}';
    } else {
      final hours = minutes ~/ 60;
      final mins = minutes % 60;
      return '${hours}h ${mins}m';
    }
  }

  /// Is this a recurring event?
  bool get isRecurring => event.recurrenceRule != null;

  /// How many other attendees?
  int get otherAttendeesCount => attendees.length;
}
```

**Why This Design:**
- ✅ Uses Riverpod code generation (your pattern)
- ✅ Provides granular state access
- ✅ Auto-invalidates related providers
- ✅ Includes conflict detection
- ✅ Separates concerns cleanly

---

## 🎨 **Phase 3: UI Components**

### **File:** `lib/ui/screens/event_invite_response_sheet.dart` (**NEW**)

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/theme_constants.dart';
import '../../domain/event.dart';
import '../widgets/contact_avatar.dart';
import '../widgets/event_invite_card.dart';
import '../widgets/attendee_list.dart';
import '../../logic/providers/event_invite_providers.dart';

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
  EventInviteStatus? _selectedResponse;
  final _noteController = TextEditingController();
  bool _showNoteField = false;
  bool _isResponding = false;

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final inviteDetailsAsync = ref.watch(inviteDetailsProvider(widget.inviteId));
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
          return inviteDetailsAsync.when(
            data: (details) => _buildContent(
              context,
              scrollController,
              details,
              palette,
              textTheme,
            ),
            loading: () => _buildLoading(palette),
            error: (error, stack) => _buildError(error.toString(), palette),
          );
        },
      ),
    );
  }

  Widget _buildContent(
    BuildContext context,
    ScrollController scrollController,
    EventInviteDetails details,
    AppPalette palette,
    TextTheme textTheme,
  ) {
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
              Icon(
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
                color: palette.textSecondary,
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
                if (details.otherAttendeesCount > 0) ...[
                  _buildAttendeesSection(details, palette, textTheme),
                  const SizedBox(height: 24),
                ],

                // Conflict Warning
                _buildConflictWarning(palette, textTheme),

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
                _buildActionButtons(context, palette),
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
          'Attendees (${details.otherAttendeesCount})',
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

  Widget _buildConflictWarning(AppPalette palette, TextTheme textTheme) {
    final conflictsAsync = ref.watch(
      eventInviteNotifierProvider.notifier,
    );

    // Check conflicts when sheet opens
    ref.listen(inviteDetailsProvider(widget.inviteId), (previous, next) {
      if (next is AsyncData) {
        ref.read(eventInviteNotifierProvider.notifier).checkConflicts(widget.inviteId);
      }
    });

    return FutureBuilder<List<CalendarEvent>>(
      future: ref.read(eventInviteNotifierProvider.notifier).checkConflicts(widget.inviteId),
      builder: (context, snapshot) {
        if (!snapshot.hasData || snapshot.data!.isEmpty) {
          return const SizedBox.shrink();
        }

        final conflicts = snapshot.data!;
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.activityRedLight,
            borderRadius: BorderRadius.circular(AppBorderRadius.medium),
            border: Border.all(color: AppColors.activityRed.withValues(alpha: 0.3)),
          ),
          child: Row(
            children: [
              Icon(Icons.warning_amber, color: AppColors.activityRed, size: 24),
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
      },
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
                isSelected: _selectedResponse == EventInviteStatus.accepted,
                onTap: () {
                  setState(() {
                    _selectedResponse = EventInviteStatus.accepted;
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
                isSelected: _selectedResponse == EventInviteStatus.pending,
                onTap: () {
                  setState(() {
                    _selectedResponse = EventInviteStatus.pending;
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
                isSelected: _selectedResponse == EventInviteStatus.declined,
                onTap: () {
                  setState(() {
                    _selectedResponse = EventInviteStatus.declined;
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

  Widget _buildActionButtons(BuildContext context, AppPalette palette) {
    final hasResponse = _selectedResponse != null;

    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton(
            onPressed: hasResponse && !_isResponding
                ? () => _handleResponse(context)
                : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              disabledBackgroundColor: AppColors.disabledColor,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppBorderRadius.medium),
              ),
            ),
            child: _isResponding
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
      case EventInviteStatus.accepted:
        return 'Accept Invitation';
      case EventInviteStatus.declined:
        return 'Decline Invitation';
      case EventInviteStatus.pending:
        return 'Respond Maybe';
    }
  }

  Future<void> _handleResponse(BuildContext context) async {
    if (_selectedResponse == null) return;

    setState(() {
      _isResponding = true;
    });

    final notifier = ref.read(eventInviteNotifierProvider.notifier);
    await notifier.respondToInvite(
      widget.inviteId,
      _selectedResponse!,
      note: _noteController.text.isNotEmpty ? _noteController.text : null,
    );

    if (!mounted) return;

    final state = ref.read(eventInviteNotifierProvider);
    state.when(
      data: (_) {
        // Success
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_getSuccessMessage()),
            backgroundColor: AppColors.activityGreen,
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 3),
          ),
        );
      },
      loading: () {},
      error: (error, stack) {
        // Error
        setState(() {
          _isResponding = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to respond: ${error.toString()}'),
            backgroundColor: AppColors.activityRed,
            behavior: SnackBarBehavior.floating,
            action: SnackBarAction(
              label: 'Retry',
              textColor: Colors.white,
              onPressed: () => _handleResponse(context),
            ),
          ),
        );
      },
    );
  }

  String _getSuccessMessage() {
    switch (_selectedResponse!) {
      case EventInviteStatus.accepted:
        return 'Invite accepted! Event added to your calendar';
      case EventInviteStatus.declined:
        return 'Invite declined';
      case EventInviteStatus.pending:
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
          color: isSelected ? color.withValues(alpha: 0.15) : Colors.transparent,
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
```

**Continue reading in next section...**

---

## 🎨 **Phase 3: UI Components (Continued)**

### **File:** `lib/ui/widgets/event_invite_card.dart` (**NEW**)

```dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/theme_constants.dart';
import '../../logic/providers/event_invite_providers.dart';

/// Reusable event card for invite display
class EventInviteCard extends StatelessWidget {
  final EventInviteDetails details;

  const EventInviteCard({
    super.key,
    required this.details,
  });

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final textTheme = Theme.of(context).textTheme;
    final dateFormat = DateFormat('EEEE, MMM d, yyyy');
    final timeFormat = DateFormat('h:mm a');

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: AppGradients.eventCard,
        borderRadius: BorderRadius.circular(AppBorderRadius.large),
        boxShadow: AppShadows.card,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Event Title
          Text(
            details.event.title,
            style: textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
              color: palette.textPrimary,
            ),
          ),
          
          const SizedBox(height: 16),

          // Date & Time
          _InfoRow(
            icon: Icons.calendar_today,
            label: dateFormat.format(details.event.start),
            color: AppColors.primary,
          ),
          const SizedBox(height: 12),
          _InfoRow(
            icon: Icons.access_time,
            label:
                '${timeFormat.format(details.event.start)} - ${timeFormat.format(details.event.end)} (${details.formattedDuration})',
            color: AppColors.eventOrange,
          ),

          // Description
          if (details.event.description != null &&
              details.event.description!.isNotEmpty) ...[
            const SizedBox(height: 16),
            Divider(color: palette.divider, height: 1),
            const SizedBox(height: 16),
            Text(
              details.event.description!,
              style: textTheme.bodyMedium?.copyWith(
                color: palette.textPrimary,
              ),
            ),
          ],

          // Recurring indicator
          if (details.isRecurring) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.eventPurple.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(AppBorderRadius.small),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.repeat,
                    size: 16,
                    color: AppColors.eventPurple,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Recurring Event',
                    style: textTheme.bodySmall?.copyWith(
                      color: AppColors.eventPurple,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(AppBorderRadius.small),
          ),
          child: Icon(icon, size: 20, color: color),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w500,
              color: palette.textPrimary,
            ),
          ),
        ),
      ],
    );
  }
}
```

### **File:** `lib/ui/widgets/attendee_list.dart` (**NEW**)

```dart
import 'package:flutter/material.dart';
import '../../core/theme_constants.dart';
import '../../domain/contact.dart';
import 'contact_avatar.dart';

/// Display list of event attendees
class AttendeeList extends StatelessWidget {
  final List<Contact> attendees;
  final int maxVisible;

  const AttendeeList({
    super.key,
    required this.attendees,
    this.maxVisible = 5,
  });

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final visibleAttendees = attendees.take(maxVisible).toList();
    final remainingCount = attendees.length - maxVisible;

    return Wrap(
      spacing: 8,
      runSpacing: 12,
      children: [
        ...visibleAttendees.map(
          (contact) => _AttendeeChip(contact: contact, palette: palette),
        ),
        if (remainingCount > 0)
          Chip(
            avatar: const CircleAvatar(
              backgroundColor: AppColors.primary,
              child: Icon(Icons.add, size: 16, color: Colors.white),
            ),
            label: Text(
              '+$remainingCount more',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: palette.textPrimary,
              ),
            ),
            backgroundColor: palette.surfaceVariant,
          ),
      ],
    );
  }
}

class _AttendeeChip extends StatelessWidget {
  final Contact contact;
  final AppPalette palette;

  const _AttendeeChip({
    required this.contact,
    required this.palette,
  });

  @override
  Widget build(BuildContext context) {
    return Chip(
      avatar: ContactAvatar(
        name: contact.name,
        radius: 12,
        colorHexOverride: contact.colorHex,
      ),
      label: Text(
        contact.name,
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: palette.textPrimary,
        ),
      ),
      backgroundColor: palette.surfaceVariant,
    );
  }
}
```

---

## 🔔 **Phase 4: Notifications Integration**

### **File:** `lib/ui/screens/notifications_screen.dart` (**MODIFY**)

Update the `_handleNotificationTap` method:

```dart
void _handleNotificationTap(
  BuildContext context,
  app_notification.Notification notification,
) async {
  if (!notification.isRead) {
    await ref.read(notificationListProvider.notifier).markAsRead(notification.id);
  }

  switch (notification.type) {
    case app_notification.NotificationType.eventInvite:
      if (notification.metadata != null &&
          notification.metadata!.containsKey('invite_id')) {
        final inviteId = notification.metadata!['invite_id'] as String;
        await EventInviteResponseSheet.show(context, inviteId);
      } else {
        context.go('/calendar');
      }
      break;
    case app_notification.NotificationType.partnerRequest:
    case app_notification.NotificationType.partnerAccepted:
      context.go('/people');
      break;
    case app_notification.NotificationType.eventReminder:
    case app_notification.NotificationType.eventUpdated:
    case app_notification.NotificationType.eventCancelled:
      context.go('/calendar');
      break;
    case app_notification.NotificationType.signalShared:
    case app_notification.NotificationType.signalReceived:
      context.go('/signals');
      break;
    case app_notification.NotificationType.system:
      _showNotificationDetail(context, notification);
      break;
  }
}
```

> ℹ️ The notification taxonomy now mirrors Supabase types (`eventInvite`, `eventUpdated`, etc.). Update any remaining references to legacy values such as `invitation` or `eventUpdate` before wiring additional invite surfaces.

---

## 🎯 **Phase 5: Edge Cases & Polish**

### **Edge Cases to Handle:**

1. **Event No Longer Exists**
   - Show error: "This event has been cancelled"
   - Disable response buttons

2. **Already Responded**
   - Show current response status
   - Allow changing response

3. **Network Offline**
   - Show offline banner
   - Queue response for later (optional)

4. **Organizer Cancels During Response**
   - Detect conflict in API call
   - Show cancellation message

5. **Recurring Event Complexity**
   - Show recurrence pattern clearly
   - Indicate "This is a series" badge

### **Polish Enhancements:**

1. **Animations:**
   - Fade in/out transitions
   - Button press animations
   - Smooth sheet expand/collapse

2. **Haptic Feedback:**
   - Light haptic on response selection
   - Medium haptic on submit

3. **Accessibility:**
   - Semantic labels for all interactive elements
   - Screen reader announcements for state changes
   - Sufficient touch target sizes (48x48 minimum)

4. **Loading States:**
   - Skeleton loaders for event details
   - Progress indicators for API calls
   - Disable interactions during loading

---

## ✅ **Testing Checklist**

### **Unit Tests:**
- [ ] `CalendarApi.respondToEventInvite()` - success case
- [ ] `CalendarApi.respondToEventInvite()` - network error
- [ ] `CalendarApi.respondToEventInvite()` - database error
- [ ] `EventInviteNotifier.respondToInvite()` - accept flow
- [ ] `EventInviteNotifier.checkConflicts()` - finds overlaps

### **Widget Tests:**
- [ ] `EventInviteResponseSheet` - renders correctly
- [ ] Response option selection works
- [ ] Accept button enabled only when response selected
- [ ] Loading state displays correctly
- [ ] Error state displays correctly
- [ ] Note field toggles correctly

### **Integration Tests:**
- [ ] Full flow: Notification → Response → Success
- [ ] Full flow: Notification → Response → Error → Retry
- [ ] Conflict detection shows warning
- [ ] Accepted event appears in calendar
- [ ] Organizer receives notification

### **Manual Testing:**
- [ ] UI looks good on small screens (iPhone SE)
- [ ] UI looks good on large screens (iPad)
- [ ] Dark mode support
- [ ] Animations are smooth
- [ ] Haptic feedback works on device
- [ ] Screen reader reads content correctly

---

## 📊 **Implementation Order**

### **Day 1 (1 hour):**
1. Create API methods in `api_service.dart`
2. Create `event_invite_providers.dart`
3. Test API integration with Postman/console

### **Day 2 (1.5 hours):**
4. Create `EventInviteResponseSheet`
5. Create `EventInviteCard` widget
6. Create `AttendeeList` widget
7. Test UI in isolation

### **Day 3 (30 min):**
8. Integrate with notifications screen
9. Update notification domain model
10. End-to-end testing
11. Bug fixes & polish

---

## 🎊 **Success Criteria**

Feature is complete when:
- ✅ User can tap event invite notification
- ✅ Sheet displays event details correctly
- ✅ User can select Accept/Maybe/Decline
- ✅ User can add optional note
- ✅ API call updates database
- ✅ Organizer receives notification
- ✅ Accepted events appear in calendar
- ✅ Conflict warnings display correctly
- ✅ Error handling works gracefully
- ✅ All animations are smooth
- ✅ Accessibility requirements met

---

## 📚 **Resources**

### **Your Existing Patterns:**
- `lib/logic/services/api_service.dart` - API pattern reference
- `lib/ui/screens/create_event_screen.dart` - Modal sheet reference
- `lib/ui/widgets/contact_avatar.dart` - Avatar component
- `lib/core/theme_constants.dart` - All colors, styles, shadows

### **Database Schema:**
- `supabase/schema/002_calendars_events.sql` - event_invites table

---

**Ready to start building?** Follow this plan step-by-step and you'll have a production-ready event invite system! 🚀
