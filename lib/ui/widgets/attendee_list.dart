import 'package:flutter/material.dart';
import '../../core/theme_constants.dart';
import '../../core/responsive_utils.dart';
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
              style: context.responsiveTextTheme.bodySmall?.copyWith(
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
        style: context.responsiveTextTheme.bodySmall?.copyWith(
          fontWeight: FontWeight.w600,
          color: palette.textPrimary,
        ),
      ),
      backgroundColor: palette.surfaceVariant,
    );
  }
}
