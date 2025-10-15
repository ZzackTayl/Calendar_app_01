import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/supabase_client.dart';
import '../../core/theme_constants.dart';
import '../../domain/contact.dart';
import '../../domain/event.dart';
import '../../logic/providers/contact_providers.dart';
import '../../logic/providers/event_providers.dart';
import '../../logic/services/permission_service.dart';
import '../widgets/accessibility/semantic_button.dart';

class PeopleGroupsScreen extends ConsumerStatefulWidget {
  const PeopleGroupsScreen({super.key});

  @override
  ConsumerState<PeopleGroupsScreen> createState() => _PeopleGroupsScreenState();
}

class _PeopleGroupsScreenState extends ConsumerState<PeopleGroupsScreen> {
  // Track which contact permission sections are expanded
  final Map<String, bool> _expandedStates = {};

  // Track selected tab: 0 = Connected, 1 = Pending, 2 = Contacts
  int _selectedTab = 0;

  List<Contact> _latestContacts = const [];
  List<CalendarEvent> _latestEvents = const [];

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final contactsAsync = ref.watch(contactListProvider);
    final eventsAsync = ref.watch(eventListProvider);

    _latestEvents = eventsAsync.maybeWhen(
      data: (events) => events,
      orElse: () => const [],
    );

    return Scaffold(
      backgroundColor: palette.background,
      body: SafeArea(
        child: contactsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, stackTrace) => Center(
            child: SelectableText.rich(
              TextSpan(
                children: [
                  TextSpan(
                    text: 'Error: ',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: colorScheme.error,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  TextSpan(
                    text: error.toString(),
                    style: theme.textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
          ),
          data: (contacts) => _buildContent(context, contacts),
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context, List<Contact> contacts) {
    _latestContacts = contacts;
    final palette = AppPalette.of(context);
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;
    final isOffline = !SupabaseService.isConfigured;

    final connectedContacts = ref.watch(connectedPartnersProvider);
    final pendingContacts = ref.watch(pendingInvitesProvider);
    final contactOnlyContacts = ref.watch(contactOnlyContactsProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (isOffline) ...[
          _OfflineNotice(
            message:
                'Working in offline preview mode. Contacts and permissions use mock data until Supabase is connected.',
          ),
          const SizedBox(height: 16),
        ],
        // Header
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          child: Text(
            'People & Groups',
            style: textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.w900,
              color: palette.textPrimary,
            ),
          ),
        ),

        // Tab bar
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              _buildTab(
                  'Connected', _selectedTab == 0, connectedContacts.length, 0),
              const SizedBox(width: 12),
              _buildTab(
                  'Pending', _selectedTab == 1, pendingContacts.length, 1),
              const SizedBox(width: 12),
              _buildTab(
                  'Contacts', _selectedTab == 2, contactOnlyContacts.length, 2),
            ],
          ),
        ),

        const SizedBox(height: 24),

        // Content based on selected tab
        if (_selectedTab == 0) ...[
          // Connected Partners header and Add button
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Connected Partners',
                  style: textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: palette.textPrimary,
                  ),
                ),
                SemanticButton(
                  label: 'Add Partner',
                  onPressed: () => context.push('/add-contact'),
                  child: ElevatedButton.icon(
                    onPressed: () => context.push('/add-contact'),
                    icon: const Icon(Icons.person_add, size: 20),
                    label: const Text('Add Partner'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: theme.colorScheme.secondary,
                      foregroundColor: theme.colorScheme.onSecondary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(24),
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 12,
                      ),
                      elevation: 0,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          // Partners list with explanation
          Expanded(
            child: connectedContacts.isEmpty
                ? Center(
                    child: Text(
                      'No connected partners yet',
                      style: textTheme.bodyLarge?.copyWith(
                        color: palette.textSecondary,
                      ),
                    ),
                  )
                : ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    children: [
                      ...connectedContacts
                          .map((contact) => _buildContactCard(contact)),
                      const SizedBox(height: 24),
                      _buildPermissionExplanation(context),
                      const SizedBox(height: 24),
                    ],
                  ),
          ),
        ] else if (_selectedTab == 1) ...[
          // Pending Invitations
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Pending Invitations',
                  style: textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: palette.textPrimary,
                  ),
                ),
                SemanticButton(
                  label: 'Send Invite',
                  onPressed: () => context.push('/add-contact'),
                  child: ElevatedButton.icon(
                    onPressed: () => context.push('/add-contact'),
                    icon: const Icon(Icons.mail_outline, size: 20),
                    label: const Text('Send Invite'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: theme.colorScheme.secondary,
                      foregroundColor: theme.colorScheme.onSecondary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(24),
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 12,
                      ),
                      elevation: 0,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: pendingContacts.isEmpty
                ? _buildEmptyState(
                    icon: Icons.access_time,
                    title: 'No pending invitations',
                    subtitle: 'Invite partners to share your calendar',
                    action: SemanticButton(
                      label: 'Send Invite',
                      onPressed: () => context.push('/add-contact'),
                      child: ElevatedButton.icon(
                        onPressed: () => context.push('/add-contact'),
                        icon: const Icon(Icons.mail_outline, size: 18),
                        label: const Text('Send an Invite'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: theme.colorScheme.secondary,
                          foregroundColor: theme.colorScheme.onSecondary,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                          ),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 20,
                            vertical: 12,
                          ),
                          elevation: 0,
                        ),
                      ),
                    ),
                  )
                : ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    children: [
                      ...pendingContacts
                          .map((contact) => _buildPendingInviteCard(contact)),
                      const SizedBox(height: 24),
                    ],
                  ),
          ),
        ] else ...[
          // Reference Contacts
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Reference Contacts',
                  style: textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: palette.textPrimary,
                  ),
                ),
                SemanticButton(
                  label: 'Add Contact',
                  onPressed: () => context.push('/add-contact'),
                  child: ElevatedButton.icon(
                    onPressed: () => context.push('/add-contact'),
                    icon: const Icon(Icons.add, size: 20),
                    label: const Text('Add Contact'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: theme.colorScheme.secondary,
                      foregroundColor: theme.colorScheme.onSecondary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(24),
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 12,
                      ),
                      elevation: 0,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: _buildEmptyState(
              icon: Icons.phone,
              title: 'No reference contacts',
              subtitle: 'Add contacts to reference when creating events',
              action: SemanticButton(
                label: 'Add Contact',
                onPressed: () => context.push('/add-contact'),
                child: OutlinedButton.icon(
                  onPressed: () => context.push('/add-contact'),
                  icon: const Icon(Icons.person_add_alt, size: 18),
                  label: const Text('Choose from contacts'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: theme.colorScheme.secondary,
                    side: BorderSide(color: theme.colorScheme.secondary),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 12,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildTab(String label, bool isSelected, int count, int tabIndex) {
    final palette = AppPalette.of(context);
    final textTheme = Theme.of(context).textTheme;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedTab = tabIndex;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        decoration: BoxDecoration(
          color:
              isSelected ? palette.tabSelectedBackground : Colors.transparent,
          borderRadius: BorderRadius.circular(24),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: palette.cardShadow,
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Text(
          '$label ($count)',
          style: textTheme.titleMedium?.copyWith(
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
            color: isSelected ? palette.textPrimary : palette.tabUnselectedText,
          ),
        ),
      ),
    );
  }

  Color _avatarColorFor(Contact contact) {
    final name = contact.name.toLowerCase();
    if (name.startsWith('a')) {
      return const Color(0xFF7C6FD6);
    }
    if (name.startsWith('s')) {
      return const Color(0xFFE89C4B);
    }
    if (name.startsWith('j')) {
      return const Color(0xFF5AC18E);
    }
    return const Color(0xFF7C6FD6);
  }

  String _contactInitial(Contact contact) {
    return contact.name.isNotEmpty ? contact.name[0].toUpperCase() : '?';
  }

  Widget _buildStatusChip(String label, Color color) {
    final palette = AppPalette.of(context);
    final textTheme = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 12,
        vertical: 6,
      ),
      decoration: BoxDecoration(
        color: palette.highlightFor(color),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: textTheme.labelLarge?.copyWith(
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
    );
  }

  Widget _buildPendingInviteCard(Contact contact) {
    final theme = Theme.of(context);
    final palette = AppPalette.of(context);
    final textTheme = theme.textTheme;
    final avatarColor = _avatarColorFor(contact);
    final initial = _contactInitial(contact);
    const accentColor = Color(0xFFB45309);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: palette.surface,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: palette.cardShadow,
            blurRadius: 12,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 28,
                backgroundColor: avatarColor,
                child: Text(
                  initial,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      contact.name,
                      style: textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: palette.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    if (contact.email != null && contact.email!.isNotEmpty)
                      Text(
                        contact.email!,
                        style: textTheme.bodyMedium?.copyWith(
                          color: palette.textSecondary,
                        ),
                      ),
                  ],
                ),
              ),
              _buildStatusChip('Pending Invite', accentColor),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            'We\'ll notify you once this partner accepts the invitation.',
            style: textTheme.bodyMedium?.copyWith(
              color: palette.textSecondary,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              SemanticButton(
                label: 'Cancel invite for ${contact.name}',
                onPressed: () =>
                    _showCancelInviteConfirmation(context, contact),
                child: OutlinedButton.icon(
                  onPressed: () =>
                      _showCancelInviteConfirmation(context, contact),
                  icon: const Icon(Icons.close, size: 18),
                  label: const Text('Cancel Invite'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: accentColor,
                    side: const BorderSide(color: accentColor),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildContactCard(Contact contact) {
    final theme = Theme.of(context);
    final palette = AppPalette.of(context);
    final textTheme = theme.textTheme;
    final isExpanded = _expandedStates[contact.id] ?? false;

    final avatarColor = _avatarColorFor(contact);
    final String initial = _contactInitial(contact);

    // Determine permission details
    IconData permissionIcon;
    String permissionText;
    Color permissionColor;

    switch (contact.permission) {
      case PartnerPermission.visible:
        permissionIcon = Icons.visibility;
        permissionText = 'Visible';
        permissionColor = const Color(0xFF4CAF50);
        break;
      case PartnerPermission.semiVisible:
        permissionIcon = Icons.access_time;
        permissionText = 'Semi-Visible';
        permissionColor = const Color(0xFFF59E0B);
        break;
      case PartnerPermission.private:
        permissionIcon = Icons.visibility_off;
        permissionText = 'Private';
        permissionColor = const Color(0xFFEF4444);
        break;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: palette.surface,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: palette.cardShadow,
            blurRadius: 12,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          // Main contact info
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                // Avatar
                CircleAvatar(
                  radius: 28,
                  backgroundColor: avatarColor,
                  child: Text(
                    initial,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                // Name and status
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        contact.name,
                        style: textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: palette.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Icon(
                            permissionIcon,
                            size: 18,
                            color: permissionColor,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            permissionText,
                            style: textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: permissionColor,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                // Delete button
                SemanticIconButton(
                  label: 'Delete ${contact.name}',
                  hint: 'Removes this contact from your partners',
                  icon: Icons.delete_outline,
                  color: const Color(0xFFEF4444),
                  onPressed: () {
                    _showDeleteConfirmation(context, contact);
                  },
                ),
              ],
            ),
          ),
          // Connected status badge (between main info and permission selector)
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 0),
            child: Row(
              children: [
                _buildStatusChip('Connected', const Color(0xFF059669)),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // Permission dropdown section
          InkWell(
            onTap: () {
              setState(() {
                _expandedStates[contact.id] = !isExpanded;
              });
            },
            borderRadius: BorderRadius.only(
              bottomLeft: Radius.circular(isExpanded ? 0 : 20),
              bottomRight: Radius.circular(isExpanded ? 0 : 20),
            ),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              decoration: BoxDecoration(
                color: palette.subtleSurface,
                borderRadius: BorderRadius.only(
                  bottomLeft: Radius.circular(isExpanded ? 0 : 20),
                  bottomRight: Radius.circular(isExpanded ? 0 : 20),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    permissionIcon,
                    size: 20,
                    color: permissionColor,
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'Permission: $permissionText',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: permissionColor,
                    ),
                  ),
                  const Spacer(),
                  Icon(
                    isExpanded
                        ? Icons.keyboard_arrow_up
                        : Icons.keyboard_arrow_down,
                    color: palette.textSecondary,
                  ),
                ],
              ),
            ),
          ),
          // Expanded permission options
          if (isExpanded)
            Column(
              children: [
                _buildPermissionOption(
                  contact: contact,
                  permission: PartnerPermission.private,
                  icon: Icons.visibility_off,
                  title: 'Private',
                  description:
                      'Sees none of your data unless specifically invited to an event',
                  color: const Color(0xFFEF4444),
                  isSelected: contact.permission == PartnerPermission.private,
                ),
                _buildPermissionOption(
                  contact: contact,
                  permission: PartnerPermission.semiVisible,
                  icon: Icons.access_time,
                  title: 'Semi-Visible',
                  description:
                      'Sees your events but not details (busy vs specific titles)',
                  color: const Color(0xFFF59E0B),
                  isSelected:
                      contact.permission == PartnerPermission.semiVisible,
                ),
                _buildPermissionOption(
                  contact: contact,
                  permission: PartnerPermission.visible,
                  icon: Icons.visibility,
                  title: 'Visible',
                  description:
                      'Sees all your events unless specifically set to private',
                  color: const Color(0xFF4CAF50),
                  isSelected: contact.permission == PartnerPermission.visible,
                  isLast: true,
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildPermissionOption({
    required Contact contact,
    required PartnerPermission permission,
    required IconData icon,
    required String title,
    required String description,
    required Color color,
    required bool isSelected,
    bool isLast = false,
  }) {
    final palette = AppPalette.of(context);
    final textTheme = Theme.of(context).textTheme;
    return InkWell(
      onTap: () {
        if (!isSelected) {
          _updateContactPermission(contact, permission);
        }
      },
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: palette.surface,
          border: isSelected
              ? Border.all(color: color.withValues(alpha: 0.5), width: 2)
              : null,
          borderRadius: isLast
              ? const BorderRadius.only(
                  bottomLeft: Radius.circular(20),
                  bottomRight: Radius.circular(20),
                )
              : null,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              icon,
              size: 24,
              color: color,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: color,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
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
    );
  }

  Widget _buildPermissionExplanation(BuildContext context) {
    final palette = AppPalette.of(context);
    final textTheme = Theme.of(context).textTheme;
    const accent = Color(0xFF2563EB);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Text(
            'Permission Levels Explained',
            style: textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w800,
              color: accent,
            ),
          ),
        ),
        const SizedBox(height: 16),
        _buildExplanationItem(
          label: 'Private:',
          description:
              'They see nothing unless you invite them to specific events',
          color: accent,
          textColor: palette.textSecondary,
        ),
        const SizedBox(height: 12),
        _buildExplanationItem(
          label: 'Semi-Visible:',
          description: 'They see you\'re busy but not event details',
          color: accent,
          textColor: palette.textSecondary,
        ),
        const SizedBox(height: 12),
        _buildExplanationItem(
          label: 'Visible:',
          description: 'They see all events unless you mark them as private',
          color: accent,
          textColor: palette.textSecondary,
        ),
        const SizedBox(height: 12),
        _buildExplanationItem(
          label: 'Note:',
          description:
              'Anyone invited to an event can always see that event\'s details',
          color: accent,
          textColor: palette.textSecondary,
        ),
      ],
    );
  }

  Widget _buildExplanationItem({
    required String label,
    required String description,
    required Color color,
    required Color textColor,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: RichText(
        text: TextSpan(
          style: TextStyle(
            fontSize: 15,
            color: textColor,
            height: 1.5,
          ),
          children: [
            TextSpan(
              text: label,
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.w700,
              ),
            ),
            TextSpan(
              text: ' $description',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: textColor,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState({
    required IconData icon,
    required String title,
    required String subtitle,
    Widget? action,
  }) {
    final palette = AppPalette.of(context);
    final textTheme = Theme.of(context).textTheme;
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            size: 80,
            color: palette.textSecondary,
          ),
          const SizedBox(height: 24),
          Text(
            title,
            style: textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: palette.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: textTheme.bodyMedium?.copyWith(
              color: palette.textTertiary,
            ),
            textAlign: TextAlign.center,
          ),
          if (action != null) ...[
            const SizedBox(height: 16),
            action,
          ],
        ],
      ),
    );
  }

  Future<void> _updateContactPermission(
    Contact contact,
    PartnerPermission newPermission,
  ) async {
    final contactListNotifier = ref.read(contactListProvider.notifier);
    final warnings = PermissionService.validatePermissionChange(
      contact: contact,
      newPermission: newPermission,
      allEvents: _latestEvents,
      allContacts: _latestContacts,
    );

    if (warnings.isNotEmpty) {
      final proceed = await _showPermissionWarnings(context, warnings);
      if (proceed != true) {
        return;
      }
    }

    try {
      await contactListNotifier.updateContactPermission(
        contact.id,
        newPermission,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '${contact.name} is now ${newPermission.name.toLowerCase()}',
          ),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to update permission: $error'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _showCancelInviteConfirmation(BuildContext context, Contact contact) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Invitation'),
        content: Text(
          'Cancel the invitation to ${contact.name}? They will be removed from your pending list.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Keep Invite'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _cancelPendingInvite(contact);
            },
            child: const Text(
              'Cancel Invite',
              style: TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );
  }

  void _showDeleteConfirmation(BuildContext context, Contact contact) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove Partner'),
        content: Text(
          'Are you sure you want to remove ${contact.name} from your partners? '
          'This will revoke their access to your calendar.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _deleteContact(contact);
            },
            child: const Text(
              'Remove',
              style: TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _cancelPendingInvite(Contact contact) async {
    final contactListNotifier = ref.read(contactListProvider.notifier);
    try {
      await contactListNotifier.deleteContact(contact.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Invitation to ${contact.name} has been canceled.'),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to cancel invitation: $error'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _deleteContact(Contact contact) async {
    final contactListNotifier = ref.read(contactListProvider.notifier);
    await contactListNotifier.deleteContact(contact.id);
  }

  Future<bool?> _showPermissionWarnings(
    BuildContext context,
    List<PermissionWarning> warnings,
  ) {
    return showDialog<bool>(
      context: context,
      builder: (context) {
        final textTheme = Theme.of(context).textTheme;
        final palette = AppPalette.of(context);
        return AlertDialog(
          title: Text(
            'Check visibility changes',
            style: textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
              color: palette.textPrimary,
            ),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: warnings
                .map(
                  (warning) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(
                      warning.message,
                      style: textTheme.bodyMedium?.copyWith(
                        color: palette.textSecondary,
                      ),
                    ),
                  ),
                )
                .toList(),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Review'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Continue'),
            ),
          ],
        );
      },
    );
  }
}

class _OfflineNotice extends StatelessWidget {
  const _OfflineNotice({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final textTheme = Theme.of(context).textTheme;
    return Container(
      decoration: BoxDecoration(
        color: palette.badgeInfoBackground,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: palette.badgeInfoBorder),
      ),
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            Icons.info_outline,
            color: palette.badgeInfoIcon,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: textTheme.bodyMedium?.copyWith(
                color: palette.textSecondary,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
