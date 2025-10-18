import 'package:flutter/material.dart';

import '../../core/theme_constants.dart';
import '../../domain/contact.dart';
import '../../logic/providers/onboarding_provider.dart';
import 'contact_avatar.dart';

/// Shared row widget for selecting how to invite or reference a contact.
class ContactInviteModeRow extends StatelessWidget {
  const ContactInviteModeRow({
    super.key,
    required this.contact,
    required this.selectedMode,
    required this.onModeSelected,
    this.referenceColor = AppColors.activityBlue,
    this.appInviteColor = AppColors.activityPurple,
  });

  final Contact contact;
  final PartnerInviteMode? selectedMode;
  final ValueChanged<PartnerInviteMode?> onModeSelected;
  final Color referenceColor;
  final Color appInviteColor;

  bool get _isReferenceSelected => selectedMode == PartnerInviteMode.referenceContact;

  bool get _isAppInviteSelected => selectedMode == PartnerInviteMode.appInvitation;

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);

    String subtitle;
    Color subtitleColor;
    if (_isReferenceSelected) {
      subtitle = 'Reference contact';
      subtitleColor = AppColors.activityBlue;
    } else if (_isAppInviteSelected) {
      subtitle = 'App invitation';
      subtitleColor = AppColors.activityPurple;
    } else {
      subtitle = 'Please select a method';
      subtitleColor = palette.textSecondary;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: palette.surface,
        borderRadius: BorderRadius.circular(20),
        boxShadow: AppShadows.subtle,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          ContactAvatar(
            name: contact.name,
            radius: 24,
            colorHexOverride: contact.colorHex,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  contact.name,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: palette.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 13,
                    color: subtitleColor,
                    fontWeight:
                        _isReferenceSelected || _isAppInviteSelected ? FontWeight.w600 : null,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _InviteModeToggleButton(
                icon: Icons.calendar_today_outlined,
                color: referenceColor,
                selected: _isReferenceSelected,
                onTap: () => onModeSelected(
                  _isReferenceSelected ? null : PartnerInviteMode.referenceContact,
                ),
              ),
              const SizedBox(width: 12),
              _InviteModeToggleButton(
                icon: Icons.person_add_alt_1_outlined,
                color: appInviteColor,
                selected: _isAppInviteSelected,
                onTap: () => onModeSelected(
                  _isAppInviteSelected ? null : PartnerInviteMode.appInvitation,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _InviteModeToggleButton extends StatelessWidget {
  const _InviteModeToggleButton({
    required this.icon,
    required this.color,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 52,
        height: 52,
        decoration: BoxDecoration(
          color: selected ? color.withValues(alpha: 0.15) : palette.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: selected ? color : palette.subtleSurface,
            width: selected ? 2 : 1,
          ),
        ),
        child: Icon(
          icon,
          color: selected ? color : palette.textSecondary,
        ),
      ),
    );
  }
}
