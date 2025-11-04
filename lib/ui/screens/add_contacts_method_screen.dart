import 'package:flutter/material.dart';

import '../../core/theme_constants.dart';
import '../../features/contacts/domain/entities/contact.dart';
import '../widgets/accessibility/semantic_card.dart';
import '../widgets/accessibility/semantic_text.dart';
import '../widgets/app_gradient_background.dart';

enum AddContactMethod {
  reference,
  invite,
}

class AddContactsMethodScreen extends StatefulWidget {
  final int currentStep;
  final int totalSteps;
  final List<Contact> selectedContacts;
  final Function(AddContactMethod method) onMethodSelected;
  final VoidCallback? onBack;

  const AddContactsMethodScreen({
    super.key,
    required this.currentStep,
    required this.totalSteps,
    required this.selectedContacts,
    required this.onMethodSelected,
    this.onBack,
  });

  @override
  State<AddContactsMethodScreen> createState() =>
      _AddContactsMethodScreenState();
}

class _AddContactsMethodScreenState extends State<AddContactsMethodScreen> {
  AddContactMethod? _selectedMethod;

  @override
  Widget build(BuildContext context) {
    final progress = widget.currentStep / widget.totalSteps;
    final theme = Theme.of(context);
    final palette = AppPalette.of(context);
    final textTheme = theme.textTheme;

    return Scaffold(
      backgroundColor: palette.background,
      body: AppGradientBackground(
        child: SafeArea(
          minimum: const EdgeInsets.only(top: 24),
          child: Column(
            children: [
              // Progress indicator
              Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Step ${widget.currentStep} of ${widget.totalSteps}',
                          style: textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w500,
                            color: palette.textPrimary,
                          ),
                        ),
                        Text(
                          '${(progress * 100).round()}%',
                          style: textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w500,
                            color: palette.textPrimary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: LinearProgressIndicator(
                        value: progress,
                        minHeight: 8,
                        backgroundColor: palette.divider,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          theme.colorScheme.primary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 20),

                      // Title
                      SemanticHeading(
                        child: Text(
                          'How should we add them?',
                          style: textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: palette.textPrimary,
                          ),
                        ),
                      ),

                      const SizedBox(height: 12),

                      // Subtitle
                      Text(
                        'Choose how you\'d like to connect with your\nselected connections',
                        style: textTheme.bodyMedium?.copyWith(
                          color: palette.textSecondary,
                          height: 1.5,
                        ),
                      ),

                      const SizedBox(height: 32),

                      // Option 1: Add as contacts for reference
                      GestureDetector(
                        onTap: () {
                          setState(() {
                            _selectedMethod = AddContactMethod.reference;
                          });
                        },
                        child: SemanticCard(
                          label: 'Add as contacts for reference',
                          hint:
                              'Keep connections available without sharing access',
                          child: Container(
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: palette.surface,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: _selectedMethod ==
                                        AddContactMethod.reference
                                    ? theme.colorScheme.primary
                                    : Colors.transparent,
                                width: 2,
                              ),
                              boxShadow:
                                  _selectedMethod == AddContactMethod.reference
                                      ? [
                                          BoxShadow(
                                            color: theme.colorScheme.primary
                                                .withValues(alpha: 0.18),
                                            blurRadius: 12,
                                            offset: const Offset(0, 4),
                                          ),
                                        ]
                                      : null,
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: theme.colorScheme.primary
                                        .withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Icon(
                                    Icons.contacts_outlined,
                                    color: theme.colorScheme.primary,
                                    size: 24,
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Add as contacts for reference',
                                        style: textTheme.titleMedium?.copyWith(
                                          fontWeight: FontWeight.w600,
                                          color: palette.textPrimary,
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        'They won\'t have access to your calendar, but you can reference them when creating events. You can invite them to the app later.',
                                        style: textTheme.bodyMedium?.copyWith(
                                          color: palette.textSecondary,
                                          height: 1.4,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),

                      const SizedBox(height: 16),

                      // Option 2: Invite them to the app
                      GestureDetector(
                        onTap: () {
                          setState(() {
                            _selectedMethod = AddContactMethod.invite;
                          });
                        },
                        child: SemanticCard(
                          label: 'Invite them to the app',
                          hint:
                              'Send a connection invite with calendar access controls',
                          child: Container(
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: palette.surface,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color:
                                    _selectedMethod == AddContactMethod.invite
                                        ? theme.colorScheme.tertiary
                                        : Colors.transparent,
                                width: 2,
                              ),
                              boxShadow:
                                  _selectedMethod == AddContactMethod.invite
                                      ? [
                                          BoxShadow(
                                            color: theme.colorScheme.tertiary
                                                .withValues(alpha: 0.18),
                                            blurRadius: 12,
                                            offset: const Offset(0, 4),
                                          ),
                                        ]
                                      : null,
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: theme.colorScheme.tertiary
                                        .withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Icon(
                                    Icons.person_add_outlined,
                                    color: theme.colorScheme.tertiary,
                                    size: 24,
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Invite them to the app',
                                        style: textTheme.titleMedium?.copyWith(
                                          fontWeight: FontWeight.w600,
                                          color: palette.textPrimary,
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        'Send them an invitation to join MyOrbit. Once they accept, you can share calendar access with full consent controls.',
                                        style: textTheme.bodyMedium?.copyWith(
                                          color: palette.textSecondary,
                                          height: 1.4,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),

                      const SizedBox(height: 40),

                      // Selected contacts section
                      Text(
                        'You\'ve selected:',
                        style: textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: palette.textPrimary,
                        ),
                      ),

                      const SizedBox(height: 16),

                      // Show message if no contacts selected
                      if (widget.selectedContacts.isEmpty)
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: palette.subtleSurface,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.info_outline,
                                  color: palette.textSecondary),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  'No contacts selected yet. You can add connections later from the dashboard.',
                                  style: textTheme.bodyMedium?.copyWith(
                                    color: palette.textSecondary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                      ...widget.selectedContacts.map((contact) {
                        final initials = contact.name
                            .split(' ')
                            .map((word) => word.isNotEmpty ? word[0] : '')
                            .take(2)
                            .join()
                            .toUpperCase();

                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Row(
                            children: [
                              CircleAvatar(
                                radius: 24,
                                backgroundColor: theme.colorScheme.secondary,
                                child: Text(
                                  initials,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Text(
                                contact.name,
                                style: textTheme.bodyLarge?.copyWith(
                                  color: palette.textPrimary,
                                ),
                              ),
                            ],
                          ),
                        );
                      }),

                      const SizedBox(height: 40),
                    ],
                  ),
                ),
              ),

              // Bottom buttons
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: palette.surface,
                  boxShadow: [
                    BoxShadow(
                      color: palette.cardShadow,
                      blurRadius: 10,
                      offset: const Offset(0, -2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: widget.onBack,
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          side: BorderSide(color: palette.divider),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: Text(
                          'Back',
                          style: textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: palette.textPrimary,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      flex: 2,
                      child: ElevatedButton(
                        onPressed: _selectedMethod != null
                            ? () => widget.onMethodSelected(_selectedMethod!)
                            : null,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: theme.colorScheme.primary,
                          foregroundColor: theme.colorScheme.onPrimary,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 0,
                          disabledBackgroundColor: theme.disabledColor,
                        ),
                        child: Text(
                          'Add Contacts',
                          style: textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: theme.colorScheme.onPrimary,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
