import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/contact.dart';
import '../../logic/providers/contact_providers.dart';
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

  @override
  Widget build(BuildContext context) {
    final contactsAsync = ref.watch(contactListProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFE6F3FF),
      body: SafeArea(
        child: contactsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, stackTrace) => Center(
            child: SelectableText.rich(
              TextSpan(
                children: [
                  const TextSpan(
                    text: 'Error: ',
                    style: TextStyle(color: Colors.red),
                  ),
                  TextSpan(text: error.toString()),
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
    final connectedContacts = ref.watch(connectedPartnersProvider);
    final pendingContacts = ref.watch(pendingInvitesProvider);
    final contactOnlyContacts = ref.watch(contactOnlyContactsProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        const Padding(
          padding: EdgeInsets.fromLTRB(16, 16, 16, 24),
          child: Text(
            'People & Groups',
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.w900,
              color: Color(0xFF1F2C3E),
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
                const Text(
                  'Connected Partners',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF1F2C3E),
                  ),
                ),
                SemanticButton(
                  label: 'Add Partner',
                  onPressed: () => _showAddPartnerDialog(context),
                  child: ElevatedButton.icon(
                    onPressed: () => _showAddPartnerDialog(context),
                    icon: const Icon(Icons.person_add, size: 20),
                    label: const Text('Add Partner'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFA64D79),
                      foregroundColor: Colors.white,
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
                ? const Center(
                    child: Text(
                      'No connected partners yet',
                      style: TextStyle(
                        fontSize: 16,
                        color: Colors.black54,
                      ),
                    ),
                  )
                : ListView(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    children: [
                      ...connectedContacts
                          .map((contact) => _buildContactCard(contact)),
                      const SizedBox(height: 24),
                      _buildPermissionExplanation(),
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
                const Text(
                  'Pending Invitations',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF1F2C3E),
                  ),
                ),
                SemanticButton(
                  label: 'Send Invite',
                  onPressed: () => _showAddPartnerDialog(context),
                  child: ElevatedButton.icon(
                    onPressed: () => _showAddPartnerDialog(context),
                    icon: const Icon(Icons.mail_outline, size: 20),
                    label: const Text('Send Invite'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFA64D79),
                      foregroundColor: Colors.white,
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
              icon: Icons.access_time,
              title: 'No pending invitations',
              subtitle: 'Invite partners to share your calendar',
            ),
          ),
        ] else ...[
          // Reference Contacts
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Reference Contacts',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF1F2C3E),
                  ),
                ),
                SemanticButton(
                  label: 'Add Contact',
                  onPressed: () => _showAddPartnerDialog(context),
                  child: ElevatedButton.icon(
                    onPressed: () => _showAddPartnerDialog(context),
                    icon: const Icon(Icons.add, size: 20),
                    label: const Text('Add Contact'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFA64D79),
                      foregroundColor: Colors.white,
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
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildTab(String label, bool isSelected, int count, int tabIndex) {
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedTab = tabIndex;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(24),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.08),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Text(
          '$label ($count)',
          style: TextStyle(
            fontSize: 16,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
            color:
                isSelected ? const Color(0xFF1F2C3E) : const Color(0xFF6B7280),
          ),
        ),
      ),
    );
  }

  Widget _buildContactCard(Contact contact) {
    final isExpanded = _expandedStates[contact.id] ?? false;

    // Determine avatar color based on name
    Color avatarColor;
    if (contact.name.toLowerCase().startsWith('a')) {
      avatarColor = const Color(0xFF7C6FD6); // Purple
    } else if (contact.name.toLowerCase().startsWith('s')) {
      avatarColor = const Color(0xFFE89C4B); // Orange
    } else if (contact.name.toLowerCase().startsWith('j')) {
      avatarColor = const Color(0xFF5AC18E); // Green
    } else {
      avatarColor = const Color(0xFF7C6FD6); // Default purple
    }

    final String initial =
        contact.name.isNotEmpty ? contact.name[0].toUpperCase() : '?';

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
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
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
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1F2C3E),
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
                            style: TextStyle(
                              fontSize: 15,
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
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFD1FAE5),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    'Connected',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF059669),
                    ),
                  ),
                ),
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
                color: const Color(0xFFF9FAFB),
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
                    color: const Color(0xFF6B7280),
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
    return InkWell(
      onTap: () {
        if (!isSelected) {
          _updateContactPermission(contact, permission);
        }
      },
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
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
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: color,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: const TextStyle(
                      fontSize: 14,
                      color: Color(0xFF6B7280),
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

  Widget _buildPermissionExplanation() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 4),
          child: Text(
            'Permission Levels Explained',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: Color(0xFF2563EB),
            ),
          ),
        ),
        const SizedBox(height: 16),
        _buildExplanationItem(
          label: 'Private:',
          description:
              'They see nothing unless you invite them to specific events',
          color: const Color(0xFF2563EB),
        ),
        const SizedBox(height: 12),
        _buildExplanationItem(
          label: 'Semi-Visible:',
          description: 'They see you\'re busy but not event details',
          color: const Color(0xFF2563EB),
        ),
        const SizedBox(height: 12),
        _buildExplanationItem(
          label: 'Visible:',
          description: 'They see all events unless you mark them as private',
          color: const Color(0xFF2563EB),
        ),
        const SizedBox(height: 12),
        _buildExplanationItem(
          label: 'Note:',
          description:
              'Anyone invited to an event can always see that event\'s details',
          color: const Color(0xFF2563EB),
        ),
      ],
    );
  }

  Widget _buildExplanationItem({
    required String label,
    required String description,
    required Color color,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: RichText(
        text: TextSpan(
          style: const TextStyle(
            fontSize: 15,
            color: Color(0xFF2563EB),
            height: 1.5,
          ),
          children: [
            TextSpan(
              text: label,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            TextSpan(
              text: ' $description',
              style: const TextStyle(fontWeight: FontWeight.w600),
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
  }) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            size: 80,
            color: const Color(0xFF9CA3AF),
          ),
          const SizedBox(height: 24),
          Text(
            title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: Color(0xFF6B7280),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: const TextStyle(
              fontSize: 15,
              color: Color(0xFF9CA3AF),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Future<void> _updateContactPermission(
    Contact contact,
    PartnerPermission newPermission,
  ) async {
    final contactListNotifier = ref.read(contactListProvider.notifier);
    await contactListNotifier.updateContactPermission(
        contact.id, newPermission);
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

  Future<void> _deleteContact(Contact contact) async {
    final contactListNotifier = ref.read(contactListProvider.notifier);
    await contactListNotifier.deleteContact(contact.id);
  }

  /// Show add partner dialog
  void _showAddPartnerDialog(BuildContext context) {
    final nameController = TextEditingController();
    final emailController = TextEditingController();
    PartnerPermission selectedPermission = PartnerPermission.semiVisible;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Add Partner'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(
                    labelText: 'Name *',
                    hintText: 'Enter partner name',
                    border: OutlineInputBorder(),
                  ),
                  textCapitalization: TextCapitalization.words,
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: emailController,
                  decoration: const InputDecoration(
                    labelText: 'Email (optional)',
                    hintText: 'partner@example.com',
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 16),
                const Text(
                  'Permission Level',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                ...PartnerPermission.values.map((permission) {
                  IconData icon;
                  String title;
                  String description;
                  Color color;

                  switch (permission) {
                    case PartnerPermission.private:
                      icon = Icons.visibility_off;
                      title = 'Private';
                      description = 'Sees none of your data';
                      color = const Color(0xFFEF4444);
                      break;
                    case PartnerPermission.semiVisible:
                      icon = Icons.access_time;
                      title = 'Semi-Visible';
                      description = 'Sees events but not details';
                      color = const Color(0xFFF59E0B);
                      break;
                    case PartnerPermission.visible:
                      icon = Icons.visibility;
                      title = 'Visible';
                      description = 'Sees all events';
                      color = const Color(0xFF4CAF50);
                      break;
                  }

                  return RadioListTile<PartnerPermission>(
                    value: permission,
                    groupValue: selectedPermission,
                    onChanged: (value) {
                      setState(() {
                        selectedPermission = value!;
                      });
                    },
                    title: Row(
                      children: [
                        Icon(icon, size: 18, color: color),
                        const SizedBox(width: 8),
                        Text(title),
                      ],
                    ),
                    subtitle:
                        Text(description, style: const TextStyle(fontSize: 12)),
                  );
                }),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (nameController.text.trim().isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Please enter a name')),
                  );
                  return;
                }

                // Create new contact
                final newContact = Contact(
                  id: DateTime.now().millisecondsSinceEpoch.toString(),
                  name: nameController.text.trim(),
                  email: emailController.text.trim().isEmpty
                      ? null
                      : emailController.text.trim(),
                  permission: selectedPermission,
                  status: ContactStatus.contactOnly, // Start as contact only
                  ownerId: 'current-user', // Mock owner ID
                  createdAt: DateTime.now(),
                );

                // Add to provider
                final contactListNotifier =
                    ref.read(contactListProvider.notifier);
                await contactListNotifier.addContact(newContact);

                if (context.mounted) {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('${newContact.name} added successfully'),
                    ),
                  );
                }
              },
              child: const Text('Add Partner'),
            ),
          ],
        ),
      ),
    );
  }
}
