import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/color_utils.dart';
import '../../core/enums/app_state_status.dart';
import '../../core/responsive_utils.dart';
import '../../core/supabase_client.dart';
import '../../core/theme_constants.dart';
import '../../features/contacts/domain/entities/contact.dart';
import '../../features/contacts/presentation/cubit/contact_cubit.dart';
import '../../l10n/app_localizations.dart';
import '../widgets/accessibility/semantic_button.dart';
import '../widgets/contact_avatar.dart';
import '../widgets/send_invite_button.dart';

/// People & Groups Screen - BLoC version with full contact management
class PeopleGroupsScreen extends StatefulWidget {
  const PeopleGroupsScreen({super.key});

  @override
  State<PeopleGroupsScreen> createState() => _PeopleGroupsScreenState();
}

class _PeopleGroupsScreenState extends State<PeopleGroupsScreen> {
  final Map<String, bool> _expandedStates = {};
  final Map<String, bool> _editingNameStates = {};
  final Map<String, TextEditingController> _nameControllers = {};
  final Map<String, String> _localColorSelections = {};
  int _selectedTab = 0;

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

    return Scaffold(
      backgroundColor: palette.background,
      body: Container(
        decoration: BoxDecoration(
          gradient: palette.isDark
              ? const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF1A1C24), Color(0xFF252837)],
                )
              : AppGradients.backgroundFor(palette.brightness),
        ),
        child: SafeArea(
          minimum: const EdgeInsets.only(top: 24),
          child: BlocBuilder<ContactCubit, ContactState>(
            builder: (context, contactState) {
              if (contactState.status == AppStateStatus.loading) {
                return const Center(child: CircularProgressIndicator());
              }

              if (contactState.status == AppStateStatus.failure) {
                return Center(
                  child: Text(
                    'Error: ${contactState.message}',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.error,
                    ),
                  ),
                );
              }

              return _buildContent(context, contactState.contacts);
            },
          ),
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context, List<Contact> contacts) {
    final palette = AppPalette.of(context);
    final textStyles = context.responsiveText;
    final l10n = AppLocalizations.of(context);
    final isOffline = !SupabaseService.isConfigured;

    final connectedContacts = contacts
        .where((c) => c.status == ContactStatus.accepted)
        .toList();
    final pendingContacts = contacts
        .where((c) => c.status == ContactStatus.pending)
        .toList();
    final contactOnlyContacts = contacts
        .where((c) => c.status == ContactStatus.contactOnly)
        .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (isOffline)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, color: Colors.blue),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Working in offline preview mode.',
                      style: TextStyle(color: Colors.blue.shade700),
                    ),
                  ),
                ],
              ),
            ),
          ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
          child: Row(
            children: [
              Image.asset(
                'icons/Connections.webp',
                width: 80,
                height: 80,
                fit: BoxFit.contain,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  l10n.peopleMyOrbitTitle,
                  style: textStyles.heading2.copyWith(
                    color: palette.textPrimary,
                  ),
                ),
              ),
            ],
          ),
        ),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              _buildTab('Connected', 0, connectedContacts.length),
              const SizedBox(width: 4),
              _buildTab('Pending', 1, pendingContacts.length),
              const SizedBox(width: 4),
              _buildTab('Contacts', 2, contactOnlyContacts.length),
            ],
          ),
        ),
        const SizedBox(height: 24),
        Expanded(
          child: _buildTabContent(
            context,
            connectedContacts,
            pendingContacts,
            contactOnlyContacts,
          ),
        ),
      ],
    );
  }

  Widget _buildTab(String label, int tabIndex, int count) {
    final palette = AppPalette.of(context);
    final theme = Theme.of(context);
    final isSelected = _selectedTab == tabIndex;
    final textColor = isSelected
        ? (palette.isDark ? palette.textPrimary : Colors.black)
        : (palette.isDark ? palette.tabUnselectedText : Colors.black);
    final countColor =
        palette.isDark ? AppColors.cardBorderBabyBlue : palette.chevronColor;

    return GestureDetector(
      onTap: () => setState(() => _selectedTab = tabIndex),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
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
        child: Text.rich(
          TextSpan(
            text: label,
            style: theme.textTheme.titleMedium?.copyWith(
              fontSize: 14,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
              color: textColor,
            ),
            children: label != 'Contacts'
                ? [
                    const TextSpan(text: ' ('),
                    TextSpan(
                      text: '$count',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontSize: 14,
                        color: countColor,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const TextSpan(text: ')'),
                  ]
                : null,
          ),
        ),
      ),
    );
  }

  Widget _buildTabContent(
    BuildContext context,
    List<Contact> connectedContacts,
    List<Contact> pendingContacts,
    List<Contact> contactOnlyContacts,
  ) {
    switch (_selectedTab) {
      case 0:
        return _buildConnectedTab(context, connectedContacts);
      case 1:
        return _buildPendingTab(context, pendingContacts);
      case 2:
        return _buildContactsTab(context, contactOnlyContacts);
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildConnectedTab(BuildContext context, List<Contact> contacts) {
    final palette = AppPalette.of(context);
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  'Connections',
                  style: textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: palette.textPrimary,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              _buildAddButton(context, theme, palette),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Expanded(
          child: contacts.isEmpty
              ? Center(
                  child: Text(
                    'No connected contacts yet',
                    style: textTheme.bodySmall?.copyWith(
                      color: palette.textSecondary,
                    ),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  children: contacts
                      .map((contact) => _buildContactCard(contact))
                      .toList(),
                ),
        ),
      ],
    );
  }

  Widget _buildPendingTab(BuildContext context, List<Contact> contacts) {
    final palette = AppPalette.of(context);
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  'Pending Invites',
                  style: textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: palette.textPrimary,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              SendInviteButton(
                semanticsLabel: 'Send Invite',
                semanticsHint: 'Open the invite flow',
                height: 44,
                onPressed: () {
                  HapticFeedback.mediumImpact();
                  context.push('/add-contact');
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Expanded(
          child: contacts.isEmpty
              ? Center(
                  child: Text(
                    'No pending invites',
                    style: textTheme.bodySmall?.copyWith(
                      color: palette.textSecondary,
                    ),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  children: contacts
                      .map((contact) => _buildContactCard(contact))
                      .toList(),
                ),
        ),
      ],
    );
  }

  Widget _buildContactsTab(BuildContext context, List<Contact> contacts) {
    final palette = AppPalette.of(context);
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  'Reference Contacts',
                  style: textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: palette.textPrimary,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              _buildAddButton(context, theme, palette),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Expanded(
          child: contacts.isEmpty
              ? Center(
                  child: Text(
                    'No reference contacts',
                    style: textTheme.bodySmall?.copyWith(
                      color: palette.textSecondary,
                    ),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  children: contacts
                      .map((contact) => _buildContactCard(contact))
                      .toList(),
                ),
        ),
      ],
    );
  }

  Widget _buildAddButton(
      BuildContext context, ThemeData theme, AppPalette palette) {
    return SemanticButton(
      label: 'Add connection',
      onPressed: () {
        HapticFeedback.mediumImpact();
        context.push('/add-contact');
      },
      child: ElevatedButton(
        onPressed: () {
          HapticFeedback.mediumImpact();
          context.push('/add-contact');
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: theme.colorScheme.secondary,
          foregroundColor:
              palette.isDark ? Colors.white : theme.colorScheme.onSecondary,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
          elevation: 0,
        ),
        child: Image.asset(
          'icons/plus_add_button.webp',
          height: 26,
          fit: BoxFit.contain,
        ),
      ),
    );
  }

  Widget _buildContactCard(Contact contact) {
    final palette = AppPalette.of(context);
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;
    final isExpanded = _expandedStates[contact.id] ?? false;
    final isEditingName = _editingNameStates[contact.id] ?? false;
    final controller = _controllerFor(contact);
    final effectiveColorHex = _effectiveColorHex(contact);
    final canManagePermissions = contact.status == ContactStatus.accepted;

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
                  avatarUrl: contact.avatarUrl,
                  photoBase64: contact.localPhotoBase64,
                  colorHexOverride: effectiveColorHex,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (isEditingName)
                        _buildNameEditor(contact, controller)
                      else
                        _buildNameDisplay(contact),
                      if (!isEditingName &&
                          contact.email != null &&
                          contact.email!.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          contact.email!,
                          style: textTheme.bodySmall?.copyWith(
                            fontSize: 12,
                            color: palette.textSecondary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (!isEditingName)
                      IconButton(
                        icon: Image.asset(
                          'icons/pencil_icon.webp',
                          width: 22,
                          height: 22,
                        ),
                        onPressed: () {
                          HapticFeedback.lightImpact();
                          _startEditingName(contact);
                        },
                        tooltip: 'Edit',
                      ),
                    IconButton(
                      icon: Image.asset(
                        'icons/trash_icon.webp',
                        width: 22,
                        height: 22,
                      ),
                      onPressed: () {
                        HapticFeedback.lightImpact();
                        _showDeleteConfirmation(context, contact);
                      },
                      tooltip: 'Delete',
                    ),
                  ],
                ),
              ],
            ),
          ),
          if (canManagePermissions)
            _buildExpansionTrigger(contact, isExpanded),
          if (isExpanded && canManagePermissions)
            _buildExpandedContactDetails(contact),
        ],
      ),
    );
  }

  Widget _buildNameDisplay(Contact contact) {
    final palette = AppPalette.of(context);
    final theme = Theme.of(context);

    return InkWell(
      onTap: () => _startEditingName(contact),
      child: Text(
        contact.name,
        style: theme.textTheme.titleSmall?.copyWith(
          fontWeight: FontWeight.w600,
          fontSize: 15,
          color: palette.textPrimary,
        ),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
    );
  }

  Widget _buildNameEditor(Contact contact, TextEditingController controller) {
    final palette = AppPalette.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: controller,
          autofocus: true,
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _saveContactName(contact),
          decoration: InputDecoration(
            labelText: 'Name',
            isDense: true,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: palette.textPrimary),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            FilledButton(
              onPressed: () {
                HapticFeedback.mediumImpact();
                _saveContactName(contact);
              },
              child: const Text('Save'),
            ),
            const SizedBox(width: 8),
            TextButton(
              onPressed: () {
                HapticFeedback.lightImpact();
                _cancelEditingName(contact);
              },
              child: const Text('Cancel'),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildExpansionTrigger(Contact contact, bool isExpanded) {
    final palette = AppPalette.of(context);
    final theme = Theme.of(context);

    return InkWell(
      onTap: () {
        setState(() {
          _expandedStates[contact.id] = !isExpanded;
        });
      },
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
                'Set theme & permissions',
                style: theme.textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                  color: palette.textPrimary,
                ),
              ),
            ),
            Icon(
              isExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
              color: palette.chevronColor,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildExpandedContactDetails(Contact contact) {
    final palette = AppPalette.of(context);

    return Container(
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
          Divider(height: 1, thickness: 1, color: palette.divider),
          _buildPermissionOption(
            contact: contact,
            permission: PartnerPermission.private,
            icon: Icons.visibility_off,
            title: 'Private',
            description: 'Sees none of your data unless invited to an event',
            color: const Color(0xFFEF4444),
            isSelected: contact.permission == PartnerPermission.private,
          ),
          _buildPermissionOption(
            contact: contact,
            permission: PartnerPermission.semiVisible,
            icon: Icons.access_time,
            title: 'Semi-Visible',
            description: 'Sees when you are busy but not event details',
            color: const Color(0xFFF59E0B),
            isSelected: contact.permission == PartnerPermission.semiVisible,
          ),
          _buildPermissionOption(
            contact: contact,
            permission: PartnerPermission.visible,
            icon: Icons.visibility,
            title: 'Visible',
            description: 'Sees all your events unless you mark them private',
            color: const Color(0xFF4CAF50),
            isSelected: contact.permission == PartnerPermission.visible,
            isLast: true,
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
          'Connection theme',
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
              _buildColorSwatch(
                ContactColorUtils.palette[i],
                ContactColorUtils.toHex(ContactColorUtils.palette[i]) ==
                    effectiveHex,
                () => _handleColorSelection(
                  contact,
                  ContactColorUtils.toHex(ContactColorUtils.palette[i]),
                ),
              ),
          ],
        ),
      ],
    );
  }

  Widget _buildColorSwatch(Color color, bool isSelected, VoidCallback onTap) {
    final palette = AppPalette.of(context);
    final borderColor =
        ContactColorUtils.onColor(color).withValues(alpha: 0.35);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(
            color: isSelected ? palette.textPrimary : borderColor,
            width: isSelected ? 3 : 1.5,
          ),
        ),
        child: Center(
          child: isSelected
              ? Icon(
                  Icons.check,
                  size: 20,
                  color: ContactColorUtils.onColor(color),
                )
              : null,
        ),
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
            Icon(icon, size: 24, color: color),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                      color: color,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: textTheme.bodySmall?.copyWith(
                      fontSize: 12,
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

  TextEditingController _controllerFor(Contact contact) {
    return _nameControllers.putIfAbsent(
      contact.id,
      () => TextEditingController(text: contact.name),
    );
  }

  String _effectiveColorHex(Contact contact) {
    if (_localColorSelections.containsKey(contact.id)) {
      return _localColorSelections[contact.id]!;
    }
    return contact.colorHex ?? ContactColorUtils.hexForName(contact.name);
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
      _showSnackBar('Name cannot be empty.');
      return;
    }
    if (trimmed == contact.name) {
      _cancelEditingName(contact);
      return;
    }

    final contactCubit = context.read<ContactCubit>();
    await contactCubit.updateContact(contact.copyWith(name: trimmed));

    if (!mounted) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _editingNameStates[contact.id] = false;
    });
  }

  Future<void> _handleColorSelection(Contact contact, String colorHex) async {
    setState(() {
      _localColorSelections[contact.id] = colorHex;
    });

    final contactCubit = context.read<ContactCubit>();
    await contactCubit.updateContact(contact.copyWith(colorHex: colorHex));

    if (!mounted) return;
    setState(() {
      _localColorSelections.remove(contact.id);
    });
  }

  Future<void> _updateContactPermission(
    Contact contact,
    PartnerPermission newPermission,
  ) async {
    final contactCubit = context.read<ContactCubit>();
    await contactCubit
        .updateContact(contact.copyWith(permission: newPermission));

    if (!mounted) return;
    _showSnackBar(
        '${contact.name} is now ${newPermission.name.toLowerCase()}');
  }

  void _showDeleteConfirmation(BuildContext context, Contact contact) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove Connection'),
        content: Text(
          'Are you sure you want to remove ${contact.name}?',
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

  Future<void> _deleteContact(Contact contact) async {
    final contactCubit = context.read<ContactCubit>();
    await contactCubit.deleteContact(contact.id);
  }

  void _showSnackBar(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }
}
