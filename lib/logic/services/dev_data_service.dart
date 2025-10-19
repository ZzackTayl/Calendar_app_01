/// Development seed data service for MyOrbit
///
/// Provides realistic mock data for UI development without needing Supabase.
/// All data is generated relative to DateTime.now() to stay fresh.
library;

import '../../core/color_utils.dart';
import '../../domain/availability_signal.dart';
import '../../domain/contact.dart';
import '../../domain/enums.dart';
import '../../domain/event.dart';
import '../../domain/signal_share.dart';
import '../../domain/signal_timeline_entry.dart';
import '../../domain/user_profile.dart';
import '../../domain/user_calendar.dart';

class DevDataService {
  // ============================================================================
  // CONSISTENT USER IDS (used across all mock data)
  // ============================================================================

  static const String currentUserId = 'user-current-123';
  static const String partner1Id = 'user-partner-alex';
  static const String partner2Id = 'user-partner-sam';
  static const String partner3Id = 'user-partner-jordan';
  static const String partner4Id = 'user-partner-casey';
  static const String partner5Id = 'user-partner-taylor';

  static const String primaryCalendarId = 'primary';
  static const String familyCalendarId = 'calendar-family';
  static const String workCalendarId = 'calendar-work';

  // ============================================================================
  // USER PROFILES
  // ============================================================================

  /// Get the current logged-in user's profile
  static UserProfile getMockCurrentUser() {
    final now = DateTime.now();
    return UserProfile(
      id: currentUserId,
      email: 'you@example.com',
      displayName: 'You',
      photoUrl: null,
      createdAt: now.subtract(const Duration(days: 90)),
      updatedAt: now.subtract(const Duration(days: 1)),
    );
  }

  /// Get list of connected partners
  static List<UserProfile> getMockPartners() {
    final now = DateTime.now();
    return [
      UserProfile(
        id: partner1Id,
        email: 'alex@example.com',
        displayName: 'Alex Chen',
        photoUrl: null,
        createdAt: now.subtract(const Duration(days: 60)),
        updatedAt: now.subtract(const Duration(days: 2)),
      ),
      UserProfile(
        id: partner2Id,
        email: 'sam@example.com',
        displayName: 'Sam Rivera',
        photoUrl: null,
        createdAt: now.subtract(const Duration(days: 45)),
        updatedAt: now.subtract(const Duration(days: 5)),
      ),
      UserProfile(
        id: partner3Id,
        email: 'jordan@example.com',
        displayName: 'Jordan Kim',
        photoUrl: null,
        createdAt: now.subtract(const Duration(days: 30)),
        updatedAt: now.subtract(const Duration(days: 3)),
      ),
      UserProfile(
        id: partner4Id,
        email: 'casey@example.com',
        displayName: 'Casey Morgan',
        photoUrl: null,
        createdAt: now.subtract(const Duration(days: 20)),
        updatedAt: now.subtract(const Duration(days: 1)),
      ),
      UserProfile(
        id: partner5Id,
        email: 'taylor@example.com',
        displayName: 'Taylor Brooks',
        photoUrl: null,
        createdAt: now.subtract(const Duration(days: 15)),
        updatedAt: now.subtract(const Duration(hours: 12)),
      ),
    ];
  }

  /// Get a specific user by ID
  static UserProfile? getMockUserById(String id) {
    if (id == currentUserId) return getMockCurrentUser();

    final partners = getMockPartners();
    try {
      return partners.firstWhere((p) => p.id == id);
    } catch (e) {
      return null;
    }
  }

  // ============================================================================
  // USER CALENDARS
  // ============================================================================

  /// Connected calendars for the mock user (primary + up to 2 secondary).
  static List<UserCalendar> getMockCalendars() => const [
        UserCalendar(
          id: primaryCalendarId,
          name: 'Personal Calendar',
          colorValue: 0xFF4D8CFF,
          isPrimary: true,
          provider: 'MyOrbit',
        ),
        UserCalendar(
          id: familyCalendarId,
          name: 'Family Calendar',
          colorValue: 0xFF1E3A8A,
          provider: 'Google',
        ),
        UserCalendar(
          id: workCalendarId,
          name: 'Work Calendar',
          colorValue: 0xFF374151,
          provider: 'Outlook',
        ),
      ];

  // ============================================================================
  // CALENDAR EVENTS
  // ============================================================================

  /// Get all mock events (10-15 events across different dates)
  static List<CalendarEvent> getMockEvents() {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    return [
      // Today's events
      CalendarEvent(
        id: 'event-1',
        title: 'Team Standup',
        description: 'Daily team sync meeting',
        start: today.add(const Duration(hours: 9)),
        end: today.add(const Duration(hours: 9, minutes: 30)),
        privacyLevel: EventPrivacyLevel.normal,
        invitedPartnerIds: [partner1Id, partner2Id],
        ownerId: currentUserId,
        calendarId: workCalendarId,
        createdAt: now.subtract(const Duration(days: 7)),
        updatedAt: now.subtract(const Duration(days: 7)),
        rescheduleStatus: EventRescheduleStatus.pendingContact,
      ),
      CalendarEvent(
        id: 'event-2',
        title: 'Lunch with Alex',
        description: 'Catch up over lunch',
        start: today.add(const Duration(hours: 12)),
        end: today.add(const Duration(hours: 13)),
        privacyLevel: EventPrivacyLevel.normal,
        invitedPartnerIds: [partner1Id],
        ownerId: currentUserId,
        calendarId: primaryCalendarId,
        createdAt: now.subtract(const Duration(days: 2)),
        updatedAt: now.subtract(const Duration(days: 2)),
        rescheduleStatus: EventRescheduleStatus.contactConfirmed,
      ),
      CalendarEvent(
        id: 'event-3',
        title: 'Private: Doctor Appointment',
        description: 'Annual checkup',
        start: today.add(const Duration(hours: 15)),
        end: today.add(const Duration(hours: 16)),
        privacyLevel: EventPrivacyLevel.superExclusive,
        invitedPartnerIds: [],
        ownerId: currentUserId,
        calendarId: primaryCalendarId,
        createdAt: now.subtract(const Duration(days: 14)),
        updatedAt: now.subtract(const Duration(days: 14)),
      ),

      // Tomorrow's events
      CalendarEvent(
        id: 'event-4',
        title: 'Project Planning',
        description: 'Q4 planning session',
        start: today.add(const Duration(days: 1, hours: 10)),
        end: today.add(const Duration(days: 1, hours: 11, minutes: 30)),
        privacyLevel: EventPrivacyLevel.normal,
        invitedPartnerIds: [partner1Id, partner2Id, partner3Id],
        ownerId: currentUserId,
        calendarId: workCalendarId,
        createdAt: now.subtract(const Duration(days: 5)),
        updatedAt: now.subtract(const Duration(days: 5)),
        rescheduleStatus: EventRescheduleStatus.awaitingUserApproval,
      ),
      CalendarEvent(
        id: 'event-5',
        title: 'Coffee Chat',
        description: 'Informal 1:1 with Jordan',
        start: today.add(const Duration(days: 1, hours: 14)),
        end: today.add(const Duration(days: 1, hours: 15)),
        privacyLevel: EventPrivacyLevel.exclusive,
        invitedPartnerIds: [partner3Id],
        ownerId: currentUserId,
        calendarId: workCalendarId,
        createdAt: now.subtract(const Duration(days: 3)),
        updatedAt: now.subtract(const Duration(days: 3)),
        rescheduleStatus: EventRescheduleStatus.scheduled,
      ),

      // This week's events
      CalendarEvent(
        id: 'event-6',
        title: 'Team Lunch',
        description: 'Monthly team lunch outing',
        start: today.add(const Duration(days: 2, hours: 12)),
        end: today.add(const Duration(days: 2, hours: 13, minutes: 30)),
        privacyLevel: EventPrivacyLevel.normal,
        invitedPartnerIds: [partner1Id, partner2Id, partner3Id, partner4Id],
        ownerId: currentUserId,
        calendarId: workCalendarId,
        createdAt: now.subtract(const Duration(days: 10)),
        updatedAt: now.subtract(const Duration(days: 10)),
      ),
      CalendarEvent(
        id: 'event-7',
        title: 'Gym Session',
        description: 'Evening workout',
        start: today.add(const Duration(days: 2, hours: 18)),
        end: today.add(const Duration(days: 2, hours: 19, minutes: 30)),
        privacyLevel: EventPrivacyLevel.normal,
        invitedPartnerIds: [partner5Id],
        ownerId: currentUserId,
        calendarId: primaryCalendarId,
        createdAt: now.subtract(const Duration(days: 1)),
        updatedAt: now.subtract(const Duration(days: 1)),
      ),
      CalendarEvent(
        id: 'event-8',
        title: 'Client Presentation',
        description: 'Product demo for new client',
        start: today.add(const Duration(days: 3, hours: 14)),
        end: today.add(const Duration(days: 3, hours: 15, minutes: 30)),
        privacyLevel: EventPrivacyLevel.exclusive,
        invitedPartnerIds: [partner1Id],
        ownerId: currentUserId,
        calendarId: workCalendarId,
        createdAt: now.subtract(const Duration(days: 8)),
        updatedAt: now.subtract(const Duration(days: 8)),
      ),
      CalendarEvent(
        id: 'event-9',
        title: 'Weekend Hike',
        description: 'Morning hike at the trails',
        start: today.add(const Duration(days: 5, hours: 8)),
        end: today.add(const Duration(days: 5, hours: 12)),
        privacyLevel: EventPrivacyLevel.normal,
        invitedPartnerIds: [partner2Id, partner3Id, partner5Id],
        ownerId: currentUserId,
        calendarId: familyCalendarId,
        createdAt: now.subtract(const Duration(days: 6)),
        updatedAt: now.subtract(const Duration(days: 6)),
      ),

      // Next week's events
      CalendarEvent(
        id: 'event-10',
        title: 'Sprint Planning',
        description: 'Plan next sprint tasks',
        start: today.add(const Duration(days: 7, hours: 9)),
        end: today.add(const Duration(days: 7, hours: 11)),
        privacyLevel: EventPrivacyLevel.normal,
        invitedPartnerIds: [partner1Id, partner2Id, partner4Id],
        ownerId: currentUserId,
        calendarId: workCalendarId,
        createdAt: now.subtract(const Duration(days: 4)),
        updatedAt: now.subtract(const Duration(days: 4)),
      ),
      CalendarEvent(
        id: 'event-11',
        title: 'Dentist Appointment',
        description: 'Routine cleaning',
        start: today.add(const Duration(days: 8, hours: 16)),
        end: today.add(const Duration(days: 8, hours: 17)),
        privacyLevel: EventPrivacyLevel.superExclusive,
        invitedPartnerIds: [],
        ownerId: currentUserId,
        calendarId: primaryCalendarId,
        createdAt: now.subtract(const Duration(days: 21)),
        updatedAt: now.subtract(const Duration(days: 21)),
      ),
      CalendarEvent(
        id: 'event-12',
        title: 'Book Club',
        description: 'Monthly book discussion',
        start: today.add(const Duration(days: 10, hours: 19)),
        end: today.add(const Duration(days: 10, hours: 21)),
        privacyLevel: EventPrivacyLevel.normal,
        invitedPartnerIds: [partner3Id, partner4Id, partner5Id],
        ownerId: currentUserId,
        calendarId: familyCalendarId,
        createdAt: now.subtract(const Duration(days: 15)),
        updatedAt: now.subtract(const Duration(days: 15)),
      ),

      // Past events (for history)
      CalendarEvent(
        id: 'event-13',
        title: 'Team Retrospective',
        description: 'Sprint retrospective meeting',
        start: today.subtract(const Duration(days: 2, hours: -14)),
        end: today.subtract(const Duration(days: 2, hours: -15)),
        privacyLevel: EventPrivacyLevel.normal,
        invitedPartnerIds: [partner1Id, partner2Id],
        ownerId: currentUserId,
        calendarId: workCalendarId,
        createdAt: now.subtract(const Duration(days: 9)),
        updatedAt: now.subtract(const Duration(days: 9)),
      ),
      CalendarEvent(
        id: 'event-14',
        title: 'Birthday Party',
        description: "Sam's birthday celebration",
        start: today.subtract(const Duration(days: 5, hours: -18)),
        end: today.subtract(const Duration(days: 5, hours: -22)),
        privacyLevel: EventPrivacyLevel.normal,
        invitedPartnerIds: [partner1Id, partner2Id, partner3Id, partner4Id, partner5Id],
        ownerId: currentUserId,
        calendarId: familyCalendarId,
        createdAt: now.subtract(const Duration(days: 12)),
        updatedAt: now.subtract(const Duration(days: 12)),
      ),
    ];
  }

  /// Get events for a specific date
  static List<CalendarEvent> getMockEventsForDate(DateTime date) {
    final allEvents = getMockEvents();
    final targetDate = DateTime(date.year, date.month, date.day);

    return allEvents.where((event) {
      final eventDate = DateTime(event.start.year, event.start.month, event.start.day);
      return eventDate == targetDate;
    }).toList();
  }

  /// Get events for a specific week (starting from weekStart)
  static List<CalendarEvent> getMockEventsForWeek(DateTime weekStart) {
    final allEvents = getMockEvents();
    final weekEnd = weekStart.add(const Duration(days: 7));

    return allEvents.where((event) {
      return event.start.isAfter(weekStart) && event.start.isBefore(weekEnd);
    }).toList();
  }

  /// Get a mock event with specific visibility
  static CalendarEvent getMockEventWithPrivacyLevel(EventPrivacyLevel privacyLevel) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    switch (privacyLevel) {
      case EventPrivacyLevel.normal:
        return CalendarEvent(
          id: 'event-normal-demo',
          title: 'Team Meeting',
          description: 'Regular team sync',
          start: today.add(const Duration(hours: 10)),
          end: today.add(const Duration(hours: 11)),
          privacyLevel: EventPrivacyLevel.normal,
          invitedPartnerIds: [partner1Id, partner2Id],
          ownerId: currentUserId,
          calendarId: primaryCalendarId,
          createdAt: now,
          updatedAt: now,
        );
      case EventPrivacyLevel.exclusive:
        return CalendarEvent(
          id: 'event-exclusive-demo',
          title: 'Private Meeting',
          description: 'Confidential discussion',
          start: today.add(const Duration(hours: 14)),
          end: today.add(const Duration(hours: 15)),
          privacyLevel: EventPrivacyLevel.exclusive,
          invitedPartnerIds: [partner1Id],
          ownerId: currentUserId,
          calendarId: primaryCalendarId,
          createdAt: now,
          updatedAt: now,
        );
      case EventPrivacyLevel.superExclusive:
        return CalendarEvent(
          id: 'event-super-exclusive-demo',
          title: 'Personal Time',
          description: 'Private appointment',
          start: today.add(const Duration(hours: 16)),
          end: today.add(const Duration(hours: 17)),
          privacyLevel: EventPrivacyLevel.superExclusive,
          invitedPartnerIds: [],
          ownerId: currentUserId,
          calendarId: primaryCalendarId,
          createdAt: now,
          updatedAt: now,
        );
    }
  }

  // ============================================================================
  // AVAILABILITY SIGNALS
  // ============================================================================

  /// Get all mock availability signals (3-5 active signals)
  static List<AvailabilitySignal> getMockSignals() {
    final now = DateTime.now();

    return [
      // Active signal from current user
      AvailabilitySignal(
        id: 'signal-1',
        userId: currentUserId,
        signalType: SignalType.available,
        startTime: now.add(const Duration(hours: 2)),
        endTime: now.add(const Duration(hours: 4)),
        duration: SignalDuration.hours2,
        message: 'Free for coffee or quick chat!',
        createdAt: now.subtract(const Duration(minutes: 30)),
      ),

      // Active signal from partner
      AvailabilitySignal(
        id: 'signal-2',
        userId: partner1Id,
        signalType: SignalType.available,
        startTime: now.subtract(const Duration(hours: 1)),
        endTime: now.add(const Duration(hours: 3)),
        duration: SignalDuration.hours4,
        message: 'Working from home, flexible schedule',
        createdAt: now.subtract(const Duration(hours: 2)),
      ),

      // Busy signal from another partner
      AvailabilitySignal(
        id: 'signal-3',
        userId: partner2Id,
        signalType: SignalType.busy,
        startTime: now,
        endTime: now.add(const Duration(hours: 2)),
        duration: SignalDuration.hours2,
        message: 'In meetings, will respond later',
        createdAt: now.subtract(const Duration(minutes: 15)),
      ),

      // Flexible signal representation
      AvailabilitySignal(
        id: 'signal-3b',
        userId: currentUserId,
        signalType: SignalType.flexible,
        startTime: now.add(const Duration(hours: 3)),
        endTime: now.add(const Duration(hours: 5)),
        duration: SignalDuration.hours2,
        message: 'Open to plans later this afternoon',
        createdAt: now.subtract(const Duration(minutes: 10)),
      ),

      // Future signal
      AvailabilitySignal(
        id: 'signal-4',
        userId: partner3Id,
        signalType: SignalType.available,
        startTime: now.add(const Duration(days: 1, hours: 10)),
        endTime: now.add(const Duration(days: 1, hours: 12)),
        duration: SignalDuration.hours2,
        message: 'Free tomorrow morning for calls',
        createdAt: now.subtract(const Duration(hours: 5)),
      ),

      // Expired signal (for testing)
      AvailabilitySignal(
        id: 'signal-5',
        userId: partner4Id,
        signalType: SignalType.available,
        startTime: now.subtract(const Duration(hours: 3)),
        endTime: now.subtract(const Duration(hours: 1)),
        duration: SignalDuration.hours2,
        message: 'Was available earlier',
        createdAt: now.subtract(const Duration(hours: 4)),
      ),

      // All-day unavailable signal
      AvailabilitySignal(
        id: 'signal-6',
        userId: partner5Id,
        signalType: SignalType.unavailable,
        startTime: DateTime(now.year, now.month, now.day),
        endTime: DateTime(now.year, now.month, now.day + 1),
        duration: SignalDuration.day,
        message: 'Out of office today',
        createdAt: now.subtract(const Duration(days: 1)),
      ),
    ];
  }

  /// Get signal shares (who can see which signals)
  static List<SignalShare> getMockSignalShares() {
    final now = DateTime.now();

    return [
      // Current user's signal shared with partners
      SignalShare(
        id: 'share-1',
        signalId: 'signal-1',
        sharedWithUserId: partner1Id,
        sharedByUserId: currentUserId,
        createdAt: now.subtract(const Duration(minutes: 30)),
        notify: true,
        autoAccept: false,
      ),
      SignalShare(
        id: 'share-2',
        signalId: 'signal-1',
        sharedWithUserId: partner2Id,
        sharedByUserId: currentUserId,
        createdAt: now.subtract(const Duration(minutes: 30)),
        notify: false,
        autoAccept: true,
      ),

      // Partner signals shared with current user
      SignalShare(
        id: 'share-3',
        signalId: 'signal-2',
        sharedWithUserId: currentUserId,
        sharedByUserId: partner1Id,
        createdAt: now.subtract(const Duration(hours: 2)),
        notify: true,
        autoAccept: false,
      ),
      SignalShare(
        id: 'share-4',
        signalId: 'signal-3',
        sharedWithUserId: currentUserId,
        sharedByUserId: partner2Id,
        createdAt: now.subtract(const Duration(minutes: 15)),
        notify: true,
        autoAccept: false,
      ),
      SignalShare(
        id: 'share-5',
        signalId: 'signal-4',
        sharedWithUserId: currentUserId,
        sharedByUserId: partner3Id,
        createdAt: now.subtract(const Duration(hours: 5)),
        notify: true,
        autoAccept: false,
      ),
      SignalShare(
        id: 'share-6',
        signalId: 'signal-6',
        sharedWithUserId: currentUserId,
        sharedByUserId: partner5Id,
        createdAt: now.subtract(const Duration(days: 1)),
        notify: true,
        autoAccept: false,
      ),
    ];
  }

  /// Timeline of recent availability signal activity
  static List<SignalTimelineEntry> getMockSignalTimeline() {
    final now = DateTime.now();
    // Headlines stay neutral (no "You") so the UI consistently attributes actions
    // to the correct person. Only the owner edits their signals; partner entries
    // always reference the partnerId for clarity.
    return [
      SignalTimelineEntry(
        id: 'signal-timeline-1',
        type: SignalTimelineType.created,
        timestamp: now.subtract(const Duration(hours: 2)),
        headline: 'Signaled "Free for coffee!" to partners',
        subheadline: 'Shared with Alex Chen and Sam Rivera',
        signalId: 'signal-1',
        isOwner: true,
      ),
      SignalTimelineEntry(
        id: 'signal-timeline-2',
        type: SignalTimelineType.shared,
        timestamp: now.subtract(const Duration(hours: 1, minutes: 15)),
        headline: 'Alex Chen signaled "Working from home"',
        subheadline: 'Marked as flexible for the afternoon',
        signalId: 'signal-2',
        partnerId: partner1Id,
      ),
      SignalTimelineEntry(
        id: 'signal-timeline-3',
        type: SignalTimelineType.reminder,
        timestamp: now.subtract(const Duration(minutes: 45)),
        headline: 'Signal expiring soon',
        subheadline: 'Sam will be busy in 30 minutes',
        signalId: 'signal-3',
        partnerId: partner2Id,
      ),
      SignalTimelineEntry(
        id: 'signal-timeline-4',
        type: SignalTimelineType.extended,
        timestamp: now.subtract(const Duration(minutes: 20)),
        headline: 'Signal "Afternoon plans" extended by 1 hour',
        subheadline: 'Availability now flexible later into the evening',
        signalId: 'signal-3b',
        isOwner: true,
      ),
      SignalTimelineEntry(
        id: 'signal-timeline-5',
        type: SignalTimelineType.ended,
        timestamp: now.subtract(const Duration(minutes: 5)),
        headline: 'Taylor closed "Out of office" signal',
        subheadline: 'Was marked unavailable for today',
        signalId: 'signal-6',
        partnerId: partner5Id,
      ),
    ];
  }

  /// Get a mock active signal of specific type
  static AvailabilitySignal getMockActiveSignal(SignalType type) {
    final now = DateTime.now();

    return AvailabilitySignal(
      id: 'signal-demo-${type.name}',
      userId: currentUserId,
      signalType: type,
      startTime: now,
      endTime: now.add(const Duration(hours: 2)),
      duration: SignalDuration.hours2,
      message: 'Demo ${type.label} signal',
      createdAt: now,
    );
  }

  // ============================================================================
  // CONTACTS
  // ============================================================================

  /// Get all mock contacts (mix of connected and unconnected)
  static List<Contact> getMockContacts() {
    final now = DateTime.now();
    final paletteHex =
        ContactColorUtils.palette.map(ContactColorUtils.toHex).toList(growable: false);

    return [
      // Connected partners (accepted)
      Contact(
        id: 'contact-1',
        name: 'Alex Chen',
        email: 'alex@example.com',
        phoneNumber: '+1-555-0101',
        status: ContactStatus.accepted,
        permission: PartnerPermission.visible,
        externalUserId: partner1Id,
        labels: ['work', 'team'],
        colorHex: paletteHex[0],
        ownerId: currentUserId,
        createdAt: now.subtract(const Duration(days: 60)),
        updatedAt: now.subtract(const Duration(days: 2)),
      ),
      Contact(
        id: 'contact-2',
        name: 'Sam Rivera',
        email: 'sam@example.com',
        phoneNumber: '+1-555-0102',
        status: ContactStatus.accepted,
        permission: PartnerPermission.visible,
        externalUserId: partner2Id,
        labels: ['work', 'friend'],
        colorHex: paletteHex[1],
        ownerId: currentUserId,
        createdAt: now.subtract(const Duration(days: 45)),
        updatedAt: now.subtract(const Duration(days: 5)),
      ),
      Contact(
        id: 'contact-3',
        name: 'Jordan Kim',
        email: 'jordan@example.com',
        phoneNumber: '+1-555-0103',
        status: ContactStatus.accepted,
        permission: PartnerPermission.semiVisible,
        externalUserId: partner3Id,
        labels: ['friend'],
        colorHex: paletteHex[2],
        ownerId: currentUserId,
        createdAt: now.subtract(const Duration(days: 30)),
        updatedAt: now.subtract(const Duration(days: 3)),
      ),
      Contact(
        id: 'contact-4',
        name: 'Casey Morgan',
        email: 'casey@example.com',
        phoneNumber: '+1-555-0104',
        status: ContactStatus.accepted,
        permission: PartnerPermission.visible,
        externalUserId: partner4Id,
        labels: ['work'],
        colorHex: paletteHex[3],
        ownerId: currentUserId,
        createdAt: now.subtract(const Duration(days: 20)),
        updatedAt: now.subtract(const Duration(days: 1)),
      ),
      Contact(
        id: 'contact-5',
        name: 'Taylor Brooks',
        email: 'taylor@example.com',
        phoneNumber: '+1-555-0105',
        status: ContactStatus.accepted,
        permission: PartnerPermission.private,
        externalUserId: partner5Id,
        labels: ['gym', 'friend'],
        colorHex: paletteHex[4],
        ownerId: currentUserId,
        createdAt: now.subtract(const Duration(days: 15)),
        updatedAt: now.subtract(const Duration(hours: 12)),
      ),

      // Pending connection requests
      Contact(
        id: 'contact-6',
        name: 'Morgan Lee',
        email: 'morgan@example.com',
        phoneNumber: '+1-555-0106',
        status: ContactStatus.pending,
        permission: PartnerPermission.private,
        externalUserId: null,
        labels: ['work'],
        colorHex: paletteHex[5],
        ownerId: currentUserId,
        createdAt: now.subtract(const Duration(days: 3)),
        updatedAt: now.subtract(const Duration(days: 3)),
      ),
      Contact(
        id: 'contact-7',
        name: 'Riley Parker',
        email: 'riley@example.com',
        phoneNumber: '+1-555-0107',
        status: ContactStatus.pending,
        permission: PartnerPermission.private,
        externalUserId: null,
        labels: ['friend'],
        colorHex: paletteHex[6],
        ownerId: currentUserId,
        createdAt: now.subtract(const Duration(days: 1)),
        updatedAt: now.subtract(const Duration(days: 1)),
      ),

      // Contact-only (not connected on platform)
      Contact(
        id: 'contact-8',
        name: 'Jamie Wilson',
        email: 'jamie@example.com',
        phoneNumber: '+1-555-0108',
        status: ContactStatus.contactOnly,
        permission: PartnerPermission.private,
        externalUserId: null,
        labels: ['family'],
        colorHex: paletteHex[7],
        ownerId: currentUserId,
        createdAt: now.subtract(const Duration(days: 100)),
        updatedAt: now.subtract(const Duration(days: 50)),
      ),
      Contact(
        id: 'contact-9',
        name: 'Avery Thompson',
        email: 'avery@example.com',
        phoneNumber: '+1-555-0109',
        status: ContactStatus.contactOnly,
        permission: PartnerPermission.private,
        externalUserId: null,
        labels: ['client'],
        colorHex: paletteHex[8],
        ownerId: currentUserId,
        createdAt: now.subtract(const Duration(days: 80)),
        updatedAt: now.subtract(const Duration(days: 40)),
      ),
    ];
  }

  // ============================================================================
  // ACTIVITY / NOTIFICATIONS
  // ============================================================================

  /// Get recent activity/notifications
  static List<Map<String, dynamic>> getMockRecentActivity({
    bool includeOlder = false,
  }) {
    final now = DateTime.now();

    final allActivities = [
      {
        'id': 'activity-1',
        'type': NotificationType.signalReceived,
        'title': 'Alex is available',
        'message': 'Alex Chen shared an availability signal',
        'timestamp': now.subtract(const Duration(hours: 2)),
        'read': false,
        'relatedUserId': partner1Id,
        'relatedSignalId': 'signal-2',
      },
      {
        'id': 'activity-2',
        'type': NotificationType.eventInvite,
        'title': 'New event invitation',
        'message': 'Sam invited you to Team Lunch',
        'timestamp': now.subtract(const Duration(hours: 5)),
        'read': false,
        'relatedUserId': partner2Id,
        'relatedEventId': 'event-6',
      },
      {
        'id': 'activity-3',
        'type': NotificationType.partnerAccepted,
        'title': 'Connection accepted',
        'message': 'Taylor Brooks accepted your connection request',
        'timestamp': now.subtract(const Duration(hours: 12)),
        'read': true,
        'relatedUserId': partner5Id,
      },
      {
        'id': 'activity-4',
        'type': NotificationType.eventReminder,
        'title': 'Upcoming event',
        'message': 'Team Standup starts in 1 hour',
        'timestamp': now.subtract(const Duration(days: 1, hours: -8)),
        'read': true,
        'relatedEventId': 'event-1',
      },
      {
        'id': 'activity-5',
        'type': NotificationType.signalShared,
        'title': 'Signal shared',
        'message': 'Your availability signal was shared with 2 partners',
        'timestamp': now.subtract(const Duration(days: 2)),
        'read': true,
        'relatedSignalId': 'signal-1',
      },
      {
        'id': 'activity-6',
        'type': NotificationType.partnerRequest,
        'title': 'New connection request',
        'message': 'Riley Parker wants to connect',
        'timestamp': now.subtract(const Duration(days: 1)),
        'read': false,
        'relatedUserId': 'user-pending-riley',
      },
      {
        'id': 'activity-7',
        'type': NotificationType.eventUpdated,
        'title': 'Event updated',
        'message': 'Project Planning time has changed',
        'timestamp': now.subtract(const Duration(days: 5)),
        'read': true,
        'relatedEventId': 'event-4',
      },
      {
        'id': 'activity-8',
        'type': NotificationType.signalReceived,
        'title': 'Jordan is flexible',
        'message': 'Jordan Kim shared a flexible availability signal',
        'timestamp': now.subtract(const Duration(days: 3)),
        'read': true,
        'relatedUserId': partner3Id,
        'relatedSignalId': 'signal-4',
      },
    ];

    final filtered = allActivities.where((activity) {
      final timestamp = activity['timestamp'] as DateTime;
      return includeOlder || now.difference(timestamp) <= const Duration(days: 7);
    }).toList()
      ..sort((a, b) {
        final aTime = a['timestamp'] as DateTime;
        final bTime = b['timestamp'] as DateTime;
        return bTime.compareTo(aTime);
      });

    return filtered;
  }

  // ============================================================================
  // HELPER METHODS FOR SPECIFIC SCENARIOS
  // ============================================================================

  /// Get a partner with their associated events
  static Map<String, dynamic> getMockPartnerWithEvents(String partnerId) {
    final partner = getMockUserById(partnerId);
    if (partner == null) {
      return {'partner': null, 'events': <CalendarEvent>[]};
    }

    final allEvents = getMockEvents();
    final partnerEvents =
        allEvents.where((event) => event.invitedPartnerIds.contains(partnerId)).toList();

    return {
      'partner': partner,
      'events': partnerEvents,
    };
  }

  /// Get signals shared with a specific partner
  static List<AvailabilitySignal> getMockSignalsSharedWith(String partnerId) {
    final allSignals = getMockSignals();
    final allShares = getMockSignalShares();

    final sharedSignalIds = allShares
        .where((share) => share.sharedWithUserId == partnerId)
        .map((share) => share.signalId)
        .toSet();

    return allSignals.where((signal) => sharedSignalIds.contains(signal.id)).toList();
  }

  /// Get signals received from a specific partner
  static List<AvailabilitySignal> getMockSignalsReceivedFrom(String partnerId) {
    final allSignals = getMockSignals();
    final allShares = getMockSignalShares();

    final receivedSignalIds = allShares
        .where(
            (share) => share.sharedByUserId == partnerId && share.sharedWithUserId == currentUserId)
        .map((share) => share.signalId)
        .toSet();

    return allSignals.where((signal) => receivedSignalIds.contains(signal.id)).toList();
  }

  /// Get only active (current) signals
  static List<AvailabilitySignal> getMockActiveSignals() {
    return getMockSignals().where((signal) => signal.isActive).toList();
  }

  /// Get only future signals
  static List<AvailabilitySignal> getMockFutureSignals() {
    return getMockSignals().where((signal) => signal.isFuture).toList();
  }

  /// Get unread activity items
  static List<Map<String, dynamic>> getMockUnreadActivity() {
    return getMockRecentActivity().where((activity) => activity['read'] == false).toList();
  }

  /// Get activity by type
  static List<Map<String, dynamic>> getMockActivityByType(NotificationType type) {
    return getMockRecentActivity().where((activity) => activity['type'] == type).toList();
  }
}
