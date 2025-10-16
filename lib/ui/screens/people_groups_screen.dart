import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/supabase_client.dart';
import '../../core/theme_constants.dart';
import '../../core/color_utils.dart';
import '../../domain/contact.dart';
import '../../domain/event.dart';
import '../../logic/providers/contact_providers.dart';
import '../../logic/providers/event_providers.dart';
import '../../domain/availability_signal.dart';
import '../../logic/providers/signal_providers.dart';
import '../../logic/services/permission_service.dart';
import '../../logic/services/device_contacts_service.dart';
import '../../logic/providers/auth_providers.dart';
import '../../logic/providers/onboarding_provider.dart';
import '../widgets/accessibility/semantic_button.dart';
import '../widgets/contact_avatar.dart';
import '../widgets/contact_invite_mode_row.dart';

class PeopleGroupsScreen extends ConsumerStatefulWidget {
  const PeopleGroupsScreen({super.key});

  @override
  ConsumerState<PeopleGroupsScreen> createState() => _PeopleGroupsScreenState();
}

class _PeopleGroupsScreenState extends ConsumerState<PeopleGroupsScreen> {
  // Track which contact permission sections are expanded
  final Map<String, bool> _expandedStates = {};

  // Track editing state per contact
  final Map<String, bool> _editingNameStates = {};
  final Map<String, TextEditingController> _nameControllers = {};
  final Map<String, String?> _localColorSelections = {};

  // Track selected tab: 0 = Connected, 1 = Pending, 2 = Contacts
  int _selectedTab = 0;

  List<Contact> _latestContacts = const [];
  List<CalendarEvent> _latestEvents = const [];

  @override
  void dispose() {
    for (final controller in _nameControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

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
    final mySignalsAsync = ref.watch(activeSignalsProvider);
    final sharedSignalsAsync = ref.watch(signalsSharedWithMeProvider);
    final List<AvailabilitySignal> mySignals =
        mySignalsAsync.asData?.value ?? const <AvailabilitySignal>[];
    final List<AvailabilitySignal> sharedSignals =
        sharedSignalsAsync.asData?.value ?? const <AvailabilitySignal>[];

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
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'My Connections',
                style: textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                  color: palette.textPrimary,
                ),
              ),
              const SizedBox(height: 16),
              _buildAvailabilityOverview(
                context,
                mySignals,
                sharedSignals,
              ),
            ],
          ),
        ),

        // Tab bar
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
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
          // Connected contacts header and Add button
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Connected Contacts',
                  style: textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: palette.textPrimary,
                  ),
                ),
                SemanticButton(
                  label: 'Add Connection',
                  onPressed: () => context.push('/add-contact'),
                  child: ElevatedButton.icon(
                    onPressed: () => context.push('/add-contact'),
                    icon: const Icon(Icons.person_add, size: 20),
                    label: const Text('Add Connection'),
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
          // Connections list with explanation
          Expanded(
            child: connectedContacts.isEmpty
                ? Center(
                    child: Text(
                      'No connected contacts yet',
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
                    subtitle: 'Invite connections to share your calendar',
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
                  onPressed: _showInviteFromContactsSheet,
                  child: ElevatedButton.icon(
                    onPressed: _showInviteFromContactsSheet,
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
            child: contactOnlyContacts.isEmpty
                ? _buildEmptyState(
                    icon: Icons.phone,
                    title: 'No reference contacts',
                    subtitle: 'Add contacts to reference when creating events',
                    action: SemanticButton(
                      label: 'Add Contact',
                      onPressed: _showInviteFromContactsSheet,
                      child: OutlinedButton.icon(
                        onPressed: _showInviteFromContactsSheet,
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
                  )
                : ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    children: [
                      ...contactOnlyContacts
                          .map((contact) => _buildContactCard(contact)),
                      const SizedBox(height: 24),
                    ],
                  ),
          ),
        ],
      ],
    );
  }

  Widget _buildAvailabilityOverview(
    BuildContext context,
    List<AvailabilitySignal> mySignals,
    List<AvailabilitySignal> sharedSignals,
  ) {
    final palette = AppPalette.of(context);
    final totalSignals = mySignals.length + sharedSignals.length;

    if (totalSignals == 0) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: palette.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: palette.divider),
        ),
        child: Text(
          'No availability signals active right now. Share one to keep connections informed.',
          style: TextStyle(
            fontSize: 15,
            color: palette.textSecondary,
          ),
        ),
      );
    }

    Widget buildStat(String label, int value) {
      return Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '$value',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w700,
                color: palette.textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                color: palette.textSecondary,
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: palette.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: palette.cardShadow,
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Availability Overview',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: palette.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              buildStat('Shared by you', mySignals.length),
              const SizedBox(width: 16),
              buildStat('From connections', sharedSignals.length),
            ],
          ),
        ],
      ),
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
              ContactAvatar(
                name: contact.name,
                radius: 28,
                colorHexOverride: contact.colorHex,
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
            'We\'ll notify you once this connection accepts the invitation.',
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
    final textTheme = Theme.of(context).textTheme;
    final palette = AppPalette.of(context);
    final isExpanded = _expandedStates[contact.id] ?? false;
    final isEditingName = _editingNameStates[contact.id] ?? false;
    final controller = _controllerFor(contact);

    if (!isEditingName && controller.text != contact.name) {
      controller.value = TextEditingValue(
        text: contact.name,
        selection: TextSelection.collapsed(offset: contact.name.length),
      );
    }

    final effectiveColorHex = _effectiveColorHex(contact);
    final effectiveColor = _effectiveColor(contact);
    final permissionMeta = _permissionMeta(contact.permission);
    final canManagePermissions = contact.status == ContactStatus.accepted;

    final nameSection = isEditingName
        ? _buildNameEditor(contact, controller, palette, textTheme)
        : _buildNameDisplay(contact, palette, textTheme);

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
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ContactAvatar(
                  name: contact.name,
                  radius: 28,
                  colorHexOverride: effectiveColorHex,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      nameSection,
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          _statusChipFor(contact),
                          if (canManagePermissions)
                            _buildPermissionBadge(permissionMeta),
                        ],
                      ),
                      if (!canManagePermissions) ...[
                        const SizedBox(height: 6),
                        Text(
                          contact.status == ContactStatus.pending
                              ? 'We\'ll unlock permissions once this invite is accepted.'
                              : 'Reference contacts stay private until you invite them.',
                          style: textTheme.bodySmall?.copyWith(
                            color: palette.textSecondary,
                            height: 1.4,
                          ),
                        ),
                      ],
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          _ColorIndicatorDot(color: effectiveColor),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Shown on event cards and calendar timelines',
                              style: textTheme.bodySmall?.copyWith(
                                color: palette.textSecondary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                SemanticIconButton(
                  label: 'Delete ${contact.name}',
                  hint: 'Removes this contact from your connections',
                  icon: Icons.delete_outline,
                  color: const Color(0xFFEF4444),
                  onPressed: () => _showDeleteConfirmation(context, contact),
                ),
              ],
            ),
          ),
          _buildExpansionTrigger(
            contact,
            isExpanded: isExpanded,
            canManagePermissions: canManagePermissions,
            permissionMeta: permissionMeta,
          ),
          if (isExpanded)
            _buildExpandedContactDetails(
              contact,
              canManagePermissions: canManagePermissions,
            ),
        ],
      ),
    );
  }

  Widget _statusChipFor(Contact contact) {
    switch (contact.status) {
      case ContactStatus.accepted:
        return _buildStatusChip('Connected', const Color(0xFF059669));
      case ContactStatus.pending:
        return _buildStatusChip('Pending', const Color(0xFFF59E0B));
      case ContactStatus.contactOnly:
        return _buildStatusChip('Reference', const Color(0xFF2563EB));
    }
  }

  Widget _buildNameDisplay(
    Contact contact,
    AppPalette palette,
    TextTheme textTheme,
  ) {
    return InkWell(
      onTap: () => _startEditingName(contact),
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Text(
                contact.name,
                style: textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: palette.textPrimary,
                ),
              ),
            ),
            Tooltip(
              message: 'Edit name',
              child: Icon(
                Icons.edit,
                size: 18,
                color: palette.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNameEditor(
    Contact contact,
    TextEditingController controller,
    AppPalette palette,
    TextTheme textTheme,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: controller,
          autofocus: true,
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _saveContactName(contact),
          decoration: InputDecoration(
            labelText: 'Connection name',
            isDense: true,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: palette.textPrimary,
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            FilledButton(
              onPressed: () => _saveContactName(contact),
              child: const Text('Save'),
            ),
            const SizedBox(width: 8),
            TextButton(
              onPressed: () => _cancelEditingName(contact),
              child: const Text('Cancel'),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildPermissionBadge(_PermissionMeta meta) {
    final textTheme = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: meta.color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(meta.icon, size: 16, color: meta.color),
          const SizedBox(width: 6),
          Text(
            meta.label,
            style: textTheme.labelLarge?.copyWith(
              fontWeight: FontWeight.w700,
              color: meta.color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildExpansionTrigger(
    Contact contact, {
    required bool isExpanded,
    required bool canManagePermissions,
    required _PermissionMeta permissionMeta,
  }) {
    final palette = AppPalette.of(context);
    final summary = canManagePermissions
        ? 'Color & permissions • ${permissionMeta.label}'
        : 'Assign color & invite options';

    return InkWell(
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
              Icons.palette_outlined,
              size: 20,
              color: palette.textSecondary,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                summary,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: palette.textPrimary,
                ),
              ),
            ),
            Icon(
              isExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
              color: palette.textSecondary,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildExpandedContactDetails(
    Contact contact, {
    required bool canManagePermissions,
  }) {
    final palette = AppPalette.of(context);
    final textTheme = Theme.of(context).textTheme;

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: palette.subtleSurface,
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(20),
          bottomRight: Radius.circular(20),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
            child: _buildColorSelector(contact),
          ),
          if (canManagePermissions) ...[
            Divider(height: 1, thickness: 1, color: palette.divider),
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
                  'Sees when you\'re busy but not event details',
              color: const Color(0xFFF59E0B),
              isSelected: contact.permission == PartnerPermission.semiVisible,
            ),
            _buildPermissionOption(
              contact: contact,
              permission: PartnerPermission.visible,
              icon: Icons.visibility,
              title: 'Visible',
              description:
                  'Sees all your events unless you mark them private',
              color: const Color(0xFF4CAF50),
              isSelected: contact.permission == PartnerPermission.visible,
              isLast: true,
            ),
          ] else
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
              child: Text(
                'When this contact joins you can update their permissions here.',
                style: textTheme.bodySmall?.copyWith(
                  color: palette.textSecondary,
                  height: 1.4,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildColorSelector(Contact contact) {
    final textTheme = Theme.of(context).textTheme;
    final palette = AppPalette.of(context);
    final effectiveHex = _effectiveColorHex(contact);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Connection color',
          style: textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w700,
            color: palette.textPrimary,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            for (int i = 0; i < ContactColorUtils.palette.length; i++)
              _ColorSwatchButton(
                color: ContactColorUtils.palette[i],
                isSelected:
                    ContactColorUtils.toHex(ContactColorUtils.palette[i]) ==
                        effectiveHex,
                onTap: () => _handleColorSelection(
                  contact,
                  ContactColorUtils.toHex(ContactColorUtils.palette[i]),
                ),
                label: _colorLabel(i),
              ),
            _ColorSwatchButton(
              color: Colors.transparent,
              isSelected: effectiveHex == null,
              onTap: () => _handleColorSelection(contact, null),
              label: 'Reset color',
              icon: Icons.block,
            ),
          ],
        ),
      ],
    );
  }

  TextEditingController _controllerFor(Contact contact) {
    return _nameControllers.putIfAbsent(
      contact.id,
      () => TextEditingController(text: contact.name),
    );
  }

  String? _effectiveColorHex(Contact contact) {
    if (_localColorSelections.containsKey(contact.id)) {
      return _localColorSelections[contact.id];
    }
    return contact.colorHex;
  }

  Color _effectiveColor(Contact contact) {
    return ContactColorUtils.fromHex(_effectiveColorHex(contact)) ??
        ContactColorUtils.fallbackForName(contact.name);
  }

  void _startEditingName(Contact contact) {
    final controller = _controllerFor(contact);
    controller.selection = TextSelection(
      baseOffset: 0,
      extentOffset: controller.text.length,
    );
    setState(() {
      _editingNameStates[contact.id] = true;
    });
  }

  void _cancelEditingName(Contact contact) {
    final controller = _controllerFor(contact);
    controller.text = contact.name;
    FocusScope.of(context).unfocus();
    setState(() {
      _editingNameStates[contact.id] = false;
    });
  }

  Future<void> _saveContactName(Contact contact) async {
    final controller = _controllerFor(contact);
    final trimmed = controller.text.trim();
    if (trimmed.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Name cannot be empty.')),
        );
      }
      return;
    }
    if (trimmed == contact.name) {
      _cancelEditingName(contact);
      return;
    }
    await ref
        .read(contactListProvider.notifier)
        .updateContact(contact.copyWith(name: trimmed), showWarning: false);
    if (!mounted) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _editingNameStates[contact.id] = false;
    });
  }

  Future<void> _handleColorSelection(Contact contact, String? colorHex) async {
    setState(() {
      _localColorSelections[contact.id] = colorHex;
    });
    await ref
        .read(contactListProvider.notifier)
        .updateContactColor(contact.id, colorHex);
    if (!mounted) return;
    setState(() {
      _localColorSelections.remove(contact.id);
    });
  }

  Future<void> _showInviteFromContactsSheet() async {
    if (!mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => FractionallySizedBox(
        heightFactor: 0.92,
        child: _InviteFromContactsSheet(
          ownerId: ref.read(currentUserProvider)?.id,
        ),
      ),
    );
  }

  String _colorLabel(int index) {
    const labels = [
      'Orchid',
      'Indigo',
      'Azure',
      'Sky',
      'Teal',
      'Emerald',
      'Green',
      'Amber',
      'Rose',
      'Lavender',
    ];
    if (index >= 0 && index < labels.length) {
      return labels[index];
    }
    return 'Color ${index + 1}';
  }

  _PermissionMeta _permissionMeta(PartnerPermission permission) {
    switch (permission) {
      case PartnerPermission.visible:
        return const _PermissionMeta(
          icon: Icons.visibility,
          label: 'Visible',
          color: Color(0xFF4CAF50),
        );
      case PartnerPermission.semiVisible:
        return const _PermissionMeta(
          icon: Icons.access_time,
          label: 'Semi-Visible',
          color: Color(0xFFF59E0B),
        );
      case PartnerPermission.private:
        return const _PermissionMeta(
          icon: Icons.visibility_off,
          label: 'Private',
          color: Color(0xFFEF4444),
        );
    }
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
        title: const Text('Remove Connection'),
        content: Text(
          'Are you sure you want to remove ${contact.name} from your connections? '
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

class _ColorIndicatorDot extends StatelessWidget {
  const _ColorIndicatorDot({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    final borderColor =
        ContactColorUtils.onColor(color).withValues(alpha: 0.45);
    return Container(
      width: 14,
      height: 14,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        border: Border.all(color: borderColor, width: 2),
      ),
    );
  }
}

class _ColorSwatchButton extends StatelessWidget {
  const _ColorSwatchButton({
    required this.color,
    required this.isSelected,
    required this.onTap,
    required this.label,
    this.icon,
  });

  final Color color;
  final bool isSelected;
  final VoidCallback onTap;
  final String label;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final displayColor =
        color == Colors.transparent ? palette.surface : color;
    final hasCustomIcon = icon != null;
    final borderColor = color == Colors.transparent
        ? palette.divider
        : ContactColorUtils.onColor(color).withValues(alpha: 0.35);

    return Semantics(
      label: isSelected ? '$label, selected' : label,
      button: true,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: displayColor,
            shape: BoxShape.circle,
            border: Border.all(
              color: isSelected ? palette.textPrimary : borderColor,
              width: isSelected ? 3 : 1.5,
            ),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: palette.textPrimary.withValues(alpha: 0.15),
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : null,
          ),
          child: Center(
            child: hasCustomIcon
                ? Icon(
                    icon,
                    size: 20,
                    color: palette.textSecondary,
                  )
                : isSelected
                    ? Icon(
                        Icons.check,
                        size: 20,
                        color: ContactColorUtils.onColor(color),
                      )
                    : null,
          ),
        ),
      ),
    );
  }
}

class _PermissionMeta {
  const _PermissionMeta({
    required this.icon,
    required this.label,
    required this.color,
  });

  final IconData icon;
  final String label;
  final Color color;
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

class _InviteFromContactsSheet extends ConsumerStatefulWidget {
  const _InviteFromContactsSheet({this.ownerId});

  final String? ownerId;

  @override
  ConsumerState<_InviteFromContactsSheet> createState() =>
      _InviteFromContactsSheetState();
}

class _InviteFromContactsSheetState
    extends ConsumerState<_InviteFromContactsSheet> {
  final TextEditingController _searchController = TextEditingController();
  List<_DeviceContactEntry> _allEntries = const [];
  List<_DeviceContactEntry> _filteredEntries = const [];
  final Map<String, PartnerInviteMode> _selectedModes = {};
  final Set<String> _inFlightIds = {};
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_onSearchChanged);
    Future.microtask(_loadContacts);
  }

  @override
  void dispose() {
    _searchController.removeListener(_onSearchChanged);
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadContacts() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await DeviceContactsService.getDeviceContacts();
    result.when(
      success: (deviceContacts) {
        final entries = deviceContacts
            .map(_entryForDeviceContact)
            .toList(growable: false);
        setState(() {
          _allEntries = entries;
          _filteredEntries = entries;
          _isLoading = false;
        });
      },
      failure: (message, _) {
        setState(() {
          _errorMessage = message;
          _isLoading = false;
        });
      },
    );
  }

  void _onSearchChanged() {
    final query = _searchController.text.trim().toLowerCase();
    setState(() {
      if (query.isEmpty) {
        _filteredEntries = _allEntries;
      } else {
        _filteredEntries = _allEntries.where((entry) {
          final name = entry.contact.name.toLowerCase();
          final email = entry.contact.email?.toLowerCase() ?? '';
          return name.contains(query) || email.contains(query);
        }).toList(growable: false);
      }
    });
  }

  _DeviceContactEntry _entryForDeviceContact(DeviceContact deviceContact) {
    final ownerId = widget.ownerId ?? 'local-owner';
    final seed =
        '${deviceContact.name}-${deviceContact.email ?? ''}-${deviceContact.phoneNumber ?? ''}';
    final stableId = 'device-${seed.hashCode & 0x7fffffff}';

    final contact = Contact(
      id: stableId,
      name: deviceContact.name,
      email: deviceContact.email,
      phoneNumber: deviceContact.phoneNumber,
      status: ContactStatus.contactOnly,
      permission: PartnerPermission.private,
      ownerId: ownerId,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );

    return _DeviceContactEntry(
      deviceContact: deviceContact,
      contact: contact,
    );
  }

  Contact? _findExistingContact(_DeviceContactEntry entry) {
    final contactsAsync = ref.read(contactListProvider);
    final contacts = contactsAsync.maybeWhen(
      data: (value) => value,
      orElse: () => const <Contact>[],
    );

    for (final existing in contacts) {
      final existingEmail = existing.email?.toLowerCase();
      final email = entry.contact.email?.toLowerCase();
      if (email != null &&
          email.isNotEmpty &&
          existingEmail != null &&
          existingEmail == email) {
        return existing;
      }

      final existingPhone = existing.phoneNumber
          ?.replaceAll(RegExp(r'\s+'), '')
          .replaceAll('-', '');
      final phone = entry.contact.phoneNumber
          ?.replaceAll(RegExp(r'\s+'), '')
          .replaceAll('-', '');
      if (phone != null &&
          phone.isNotEmpty &&
          existingPhone != null &&
          existingPhone == phone) {
        return existing;
      }
    }

    return null;
  }

  Future<void> _saveReferenceContact(_DeviceContactEntry entry) async {
    final existing = _findExistingContact(entry);
    if (existing != null) {
      _showSnack('${entry.contact.name} is already in your connections.');
      return;
    }

    setState(() {
      _inFlightIds.add(entry.contact.id);
    });

    try {
      final contact = entry.contact.copyWith(
        status: ContactStatus.contactOnly,
        permission: PartnerPermission.private,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );
      await ref.read(contactListProvider.notifier).addContact(contact);
      _showSnack('Added ${entry.contact.name} as a reference contact.');
    } finally {
      if (mounted) {
        setState(() {
          _inFlightIds.remove(entry.contact.id);
        });
      }
    }
  }

  Future<Contact> _ensurePendingContact(_DeviceContactEntry entry) async {
    final existing = _findExistingContact(entry);
    if (existing != null) {
      return existing;
    }

    final contact = entry.contact.copyWith(
      status: ContactStatus.pending,
      permission: PartnerPermission.private,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
    await ref.read(contactListProvider.notifier).addContact(contact);
    return contact;
  }

  Future<void> _sendEmailInvite(_DeviceContactEntry entry) async {
    final email = entry.deviceContact.email;
    if (email == null || email.isEmpty) {
      _showSnack('No email address available for ${entry.contact.name}.');
      return;
    }

    setState(() {
      _inFlightIds.add(entry.contact.id);
    });

    try {
      await _ensurePendingContact(entry);
      final firstName = entry.contact.name.split(' ').first;
      final uri = Uri(
        scheme: 'mailto',
        path: email,
        queryParameters: {
          'subject': 'Join me on MyOrbit',
          'body':
              'Hi $firstName,\n\nI\'m inviting you to join MyOrbit so we can coordinate schedules more easily. Download the app and connect with me when you have a moment!\n\nThanks!',
        },
      );
      final launched = await launchUrl(
        uri,
        mode: LaunchMode.externalApplication,
      );
      if (!launched) {
        _showSnack('Could not open your email app.');
      } else {
        _showSnack('Opening your email app…');
      }
    } finally {
      if (mounted) {
        setState(() {
          _inFlightIds.remove(entry.contact.id);
        });
      }
    }
  }

  Future<void> _sendSmsInvite(_DeviceContactEntry entry) async {
    final rawPhone = entry.deviceContact.phoneNumber;
    if (rawPhone == null || rawPhone.isEmpty) {
      _showSnack('No phone number available for ${entry.contact.name}.');
      return;
    }

    setState(() {
      _inFlightIds.add(entry.contact.id);
    });

    try {
      await _ensurePendingContact(entry);
      final firstName = entry.contact.name.split(' ').first;
      final cleaned =
          rawPhone.replaceAll(RegExp(r'\s+'), '').replaceAll('-', '');
      final body =
          'Hi $firstName! Join me on MyOrbit so we can coordinate schedules. I just sent you an invite.';
      final uri = Uri.parse(
        'sms:$cleaned?body=${Uri.encodeComponent(body)}',
      );
      final launched = await launchUrl(uri);
      if (!launched) {
        _showSnack('Could not open your messaging app.');
      } else {
        _showSnack('Opening your messaging app…');
      }
    } finally {
      if (mounted) {
        setState(() {
          _inFlightIds.remove(entry.contact.id);
        });
      }
    }
  }

  void _showSnack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final textTheme = Theme.of(context).textTheme;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Column(
        children: [
          const SizedBox(height: 12),
          Container(
            width: 44,
            height: 4,
            decoration: BoxDecoration(
              color: palette.divider,
              borderRadius: BorderRadius.circular(100),
            ),
          ),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                Text(
                  'Invite from contacts',
                  style: textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: palette.textPrimary,
                  ),
                ),
                const Spacer(),
                IconButton(
                  onPressed: () => Navigator.of(context).maybePop(),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.search),
                hintText: 'Search contacts',
                filled: true,
                fillColor: palette.subtleSurface,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          Expanded(
            child: _buildBody(palette, textTheme),
          ),
        ],
      ),
    );
  }

  Widget _buildBody(AppPalette palette, TextTheme textTheme) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_errorMessage != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _errorMessage!,
              style: textTheme.bodyMedium?.copyWith(
                color: palette.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _loadContacts,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }
    if (_filteredEntries.isEmpty) {
      return Center(
        child: Text(
          'No contacts found. Try a different search.',
          style: textTheme.bodyMedium?.copyWith(
            color: palette.textSecondary,
          ),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
      itemCount: _filteredEntries.length,
      separatorBuilder: (_, __) => const SizedBox(height: 16),
      itemBuilder: (context, index) {
        final entry = _filteredEntries[index];
        final selectedMode = _selectedModes[entry.contact.id];
        final isProcessing = _inFlightIds.contains(entry.contact.id);

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: palette.surface,
            borderRadius: BorderRadius.circular(20),
            boxShadow: AppShadows.subtle,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              ContactInviteModeRow(
                contact: entry.contact,
                selectedMode: selectedMode,
                onModeSelected: (mode) {
                  setState(() {
                    if (mode == null) {
                      _selectedModes.remove(entry.contact.id);
                    } else {
                      _selectedModes[entry.contact.id] = mode;
                    }
                  });
                },
              ),
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 200),
                child: selectedMode == null
                    ? const SizedBox.shrink()
                    : Padding(
                        padding: const EdgeInsets.only(top: 12),
                        child: _buildInviteActions(
                          entry,
                          selectedMode,
                          isProcessing,
                          palette,
                          textTheme,
                        ),
                      ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildInviteActions(
    _DeviceContactEntry entry,
    PartnerInviteMode mode,
    bool isProcessing,
    AppPalette palette,
    TextTheme textTheme,
  ) {
    if (isProcessing) {
      return const Center(child: CircularProgressIndicator());
    }

    if (mode == PartnerInviteMode.referenceContact) {
      return Align(
        alignment: Alignment.centerRight,
        child: FilledButton.icon(
          onPressed: () => _saveReferenceContact(entry),
          icon: const Icon(Icons.bookmark_add_outlined),
          label: const Text('Save as reference'),
        ),
      );
    }

    final actions = <Widget>[];
    final hasEmail =
        entry.deviceContact.email != null && entry.deviceContact.email!.isNotEmpty;
    final hasPhone = entry.deviceContact.phoneNumber != null &&
        entry.deviceContact.phoneNumber!.isNotEmpty;

    if (hasEmail) {
      actions.add(
        OutlinedButton.icon(
          onPressed: () => _sendEmailInvite(entry),
          icon: const Icon(Icons.email_outlined),
          label: const Text('Send email'),
        ),
      );
    }

    if (hasPhone) {
      actions.add(
        OutlinedButton.icon(
          onPressed: () => _sendSmsInvite(entry),
          icon: const Icon(Icons.sms_outlined),
          label: const Text('Send SMS'),
        ),
      );
    }

    if (actions.isEmpty) {
      return Text(
        'Add an email or phone number to this contact to send an invite.',
        style: textTheme.bodySmall?.copyWith(
          color: palette.textSecondary,
        ),
      );
    }

    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: actions,
    );
  }
}

class _DeviceContactEntry {
  _DeviceContactEntry({
    required this.deviceContact,
    required this.contact,
  });

  final DeviceContact deviceContact;
  final Contact contact;
}
