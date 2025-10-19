import 'package:flutter/material.dart';

import '../../core/color_utils.dart';
import '../../domain/contact.dart';
import '../../domain/event.dart';

/// Resolves which contact color should represent an event.
class ContactColorResolver {
  ContactColorResolver._();

  /// Determine the primary contact for [event] using interaction count and recency.
  static Contact? preferredContactForEvent({
    required CalendarEvent event,
    required List<Contact> contacts,
    required List<CalendarEvent> allEvents,
  }) {
    final candidates = event.invitedPartnerIds
        .map((id) => _findContactByPartnerId(id, contacts))
        .whereType<Contact>()
        .toList(growable: false);

    if (candidates.isEmpty) {
      return null;
    }
    if (candidates.length == 1) {
      return candidates.first;
    }

    candidates.sort(
      (a, b) => _interactionData(b, allEvents)
          .compareTo(_interactionData(a, allEvents)),
    );
    return candidates.first;
  }

  /// Resolve the color that should represent [event].
  static Color resolveColor({
    required CalendarEvent event,
    required List<Contact> contacts,
    required List<CalendarEvent> allEvents,
  }) {
    if (event.invitedPartnerIds.isEmpty) {
      return Colors.black;
    }

    final contact = preferredContactForEvent(
      event: event,
      contacts: contacts,
      allEvents: allEvents,
    );

    if (contact == null) {
      return ContactColorUtils.fallbackForName('');
    }

    return ContactColorUtils.fromHex(contact.colorHex) ??
        ContactColorUtils.fallbackForName(contact.name);
  }

  static _ContactInteractionData _interactionData(
    Contact contact,
    List<CalendarEvent> events,
  ) {
    final ids = <String>{
      contact.id,
      if (contact.externalUserId != null) contact.externalUserId!,
    };

    int count = 0;
    DateTime latest = DateTime.fromMillisecondsSinceEpoch(0);
    for (final event in events) {
      if (event.invitedPartnerIds.any(ids.contains)) {
        count += 1;
        if (event.start.isAfter(latest)) {
          latest = event.start;
        }
      }
    }
    return _ContactInteractionData(count: count, latest: latest);
  }

  static Contact? _findContactByPartnerId(
    String partnerId,
    List<Contact> contacts,
  ) {
    for (final contact in contacts) {
      if (contact.id == partnerId || contact.externalUserId == partnerId) {
        return contact;
      }
    }
    return null;
  }
}

class _ContactInteractionData implements Comparable<_ContactInteractionData> {
  const _ContactInteractionData({
    required this.count,
    required this.latest,
  });

  final int count;
  final DateTime latest;

  @override
  int compareTo(_ContactInteractionData other) {
    final countComparison = count.compareTo(other.count);
    if (countComparison != 0) return countComparison;
    return latest.compareTo(other.latest);
  }
}
