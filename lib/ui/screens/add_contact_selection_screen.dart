import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/supabase_client.dart';
import '../../domain/contact.dart';
import '../../logic/providers/contact_providers.dart';
import '../../logic/services/device_contacts_service.dart';
import '../../logic/services/dev_data_service.dart';
import '../../logic/providers/auth_providers.dart';
import '../widgets/contact_avatar.dart';
import '../widgets/accessibility/semantic_button.dart';

/// Tab options for contact selection
enum ContactSelectionTab { fromContacts, sendInvite }

/// Main contact selection screen matching the provided screenshot design
class AddContactSelectionScreen extends ConsumerStatefulWidget {
  const AddContactSelectionScreen({super.key});

  @override
  ConsumerState<AddContactSelectionScreen> createState() =>
      _AddContactSelectionScreenState();
}

class _AddContactSelectionScreenState
    extends ConsumerState<AddContactSelectionScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  List<DeviceContact> _deviceContacts = [];
  List<DeviceContact> _filteredContacts = [];
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _searchController.addListener(_onSearchChanged);
    _loadDeviceContacts();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    final query = _searchController.text;
    setState(() {
      if (query.trim().isEmpty) {
        _filteredContacts = List.from(_deviceContacts);
      } else {
        _filteredContacts = _deviceContacts.where((contact) {
          final nameMatch =
              contact.name.toLowerCase().contains(query.toLowerCase());
          final emailMatch =
              contact.email?.toLowerCase().contains(query.toLowerCase()) ??
                  false;
          return nameMatch || emailMatch;
        }).toList();
      }
    });
  }

  Future<void> _loadDeviceContacts() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await DeviceContactsService.getDeviceContacts();
    result.when(
      success: (contacts) {
        setState(() {
          _deviceContacts = contacts;
          _filteredContacts = List.from(contacts);
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            _buildHeader(),
            // Tab Bar
            _buildTabBar(),
            // Search Bar (only on From Contacts tab)
            if (_tabController.index == 0) _buildSearchBar(),
            // Content
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildFromContactsTab(),
                  _buildSendInviteTab(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 1,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Row(
        children: [
          const Text(
            'Add Partner',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              color: Colors.black87,
            ),
          ),
          const Spacer(),
          SemanticIconButton(
            label: 'Close',
            icon: Icons.close,
            onPressed: () => context.pop(),
            color: Colors.black54,
          ),
        ],
      ),
    );
  }

  Widget _buildTabBar() {
    return Container(
      color: Colors.white,
      child: TabBar(
        controller: _tabController,
        onTap: (index) => setState(() {}), // Rebuild to show/hide search
        indicatorColor: const Color(0xFF007AFF),
        indicatorWeight: 3,
        labelColor: const Color(0xFF007AFF),
        unselectedLabelColor: Colors.black54,
        labelStyle: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelStyle: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w500,
        ),
        tabs: const [
          Tab(
            icon: Icon(Icons.contacts),
            text: 'From Contacts',
          ),
          Tab(
            icon: Icon(Icons.mail_outline),
            text: 'Send Invite',
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Container(
      color: const Color(0xFFF2F2F7),
      padding: const EdgeInsets.all(16),
      child: TextField(
        controller: _searchController,
        decoration: InputDecoration(
          hintText: 'Search contacts...',
          prefixIcon: const Icon(Icons.search, color: Colors.grey),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: BorderSide.none,
          ),
          filled: true,
          fillColor: Colors.white,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
      ),
    );
  }

  Widget _buildFromContactsTab() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              _errorMessage!,
              style: const TextStyle(
                fontSize: 16,
                color: Colors.black54,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadDeviceContacts,
              child: const Text('Try Again'),
            ),
          ],
        ),
      );
    }

    if (_filteredContacts.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.contacts_outlined,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              _searchController.text.trim().isNotEmpty
                  ? 'No contacts found matching "${_searchController.text}"'
                  : 'No contacts available',
              style: const TextStyle(
                fontSize: 16,
                color: Colors.black54,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      itemCount: _filteredContacts.length,
      itemBuilder: (context, index) {
        final contact = _filteredContacts[index];
        return _buildContactListItem(contact);
      },
    );
  }

  Widget _buildContactListItem(DeviceContact contact) {
    return InkWell(
      onTap: () => _selectContact(contact),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            ContactAvatar(
              name: contact.name,
              radius: 24,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    contact.name,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w500,
                      color: Colors.black87,
                    ),
                  ),
                  if (contact.email != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      contact.email!,
                      style: const TextStyle(
                        fontSize: 15,
                        color: Colors.black54,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSendInviteTab() {
    return const SendInviteForm();
  }

  Future<void> _selectContact(DeviceContact deviceContact) async {
    // Show permission selection dialog
    final permission = await _showPermissionSelectionDialog();
    if (permission == null) return;

    // Get current user ID
    final currentUser = ref.read(currentUserProvider);
    final ownerId = currentUser?.id ??
        (!SupabaseService.isConfigured ? DevDataService.currentUserId : null);

    if (ownerId == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please sign in to add contacts'),
            backgroundColor: Colors.red,
          ),
        );
      }
      return;
    }

    // Convert to MyOrbit contact
    final contact = deviceContact.toContact(
      ownerId: ownerId,
      permission: permission,
      status: ContactStatus.contactOnly, // Default to contact-only
    );

    // Add to contacts
    final contactListNotifier = ref.read(contactListProvider.notifier);
    await contactListNotifier.addContact(contact);

    if (mounted) {
      // Show success message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
              '${contact.name} added as ${permission.name.toLowerCase()} contact'),
          backgroundColor: Colors.green,
        ),
      );

      // Go back to people screen
      context.pop();
    }
  }

  Future<PartnerPermission?> _showPermissionSelectionDialog() async {
    return showDialog<PartnerPermission>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Select Permission Level'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: PartnerPermission.values.map((permission) {
            IconData icon;
            String title;
            String description;
            Color color;

            switch (permission) {
              case PartnerPermission.private:
                icon = Icons.visibility_off;
                title = 'Private';
                description = 'No access to your calendar';
                color = Colors.red;
                break;
              case PartnerPermission.semiVisible:
                icon = Icons.access_time;
                title = 'Semi-Visible';
                description = 'Sees busy times only';
                color = Colors.orange;
                break;
              case PartnerPermission.visible:
                icon = Icons.visibility;
                title = 'Visible';
                description = 'Sees all event details';
                color = Colors.green;
                break;
            }

            return ListTile(
              leading: Icon(icon, color: color),
              title: Text(title),
              subtitle: Text(description),
              onTap: () => Navigator.pop(context, permission),
            );
          }).toList(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }
}

/// Form for sending invites to new contacts
class SendInviteForm extends ConsumerStatefulWidget {
  const SendInviteForm({super.key});

  @override
  ConsumerState<SendInviteForm> createState() => _SendInviteFormState();
}

class _SendInviteFormState extends ConsumerState<SendInviteForm> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  PartnerPermission _selectedPermission = PartnerPermission.semiVisible;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Send an invitation to someone new',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 24),

            // Name field
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Full Name',
                hintText: 'Enter their full name',
                border: OutlineInputBorder(),
              ),
              textCapitalization: TextCapitalization.words,
              validator: (value) {
                if (value?.trim().isEmpty ?? true) {
                  return 'Name is required';
                }
                return null;
              },
            ),

            const SizedBox(height: 16),

            // Email field
            TextFormField(
              controller: _emailController,
              decoration: const InputDecoration(
                labelText: 'Email Address',
                hintText: 'Enter their email address',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.emailAddress,
              validator: (value) {
                if (value?.trim().isEmpty ?? true) {
                  return 'Email is required';
                }
                if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$')
                    .hasMatch(value!)) {
                  return 'Enter a valid email address';
                }
                return null;
              },
            ),

            const SizedBox(height: 24),

            // Permission selection
            const Text(
              'Permission Level',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 12),

            ...PartnerPermission.values.map((permission) {
              IconData icon;
              String title;
              String description;
              Color color;

              switch (permission) {
                case PartnerPermission.private:
                  icon = Icons.visibility_off;
                  title = 'Private';
                  description = 'No access to your calendar';
                  color = Colors.red;
                  break;
                case PartnerPermission.semiVisible:
                  icon = Icons.access_time;
                  title = 'Semi-Visible';
                  description = 'Sees busy times only';
                  color = Colors.orange;
                  break;
                case PartnerPermission.visible:
                  icon = Icons.visibility;
                  title = 'Visible';
                  description = 'Sees all event details';
                  color = Colors.green;
                  break;
              }

              return RadioListTile<PartnerPermission>(
                value: permission,
                groupValue: _selectedPermission,
                onChanged: (value) {
                  setState(() {
                    _selectedPermission = value!;
                  });
                },
                title: Row(
                  children: [
                    Icon(icon, color: color, size: 20),
                    const SizedBox(width: 8),
                    Text(title),
                  ],
                ),
                subtitle: Text(description),
                contentPadding: EdgeInsets.zero,
              );
            }),

            const SizedBox(height: 32),

            // Send invite button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _sendInvite,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF007AFF),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text(
                  'Send Invite',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _sendInvite() async {
    if (!_formKey.currentState!.validate()) return;

    // Get current user ID
    final currentUser = ref.read(currentUserProvider);
    final ownerId = currentUser?.id ??
        (!SupabaseService.isConfigured ? DevDataService.currentUserId : null);

    if (ownerId == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please sign in to send invites'),
            backgroundColor: Colors.red,
          ),
        );
      }
      return;
    }

    // Create pending contact
    final contact = Contact(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      name: _nameController.text.trim(),
      email: _emailController.text.trim(),
      status: ContactStatus.pending, // This will be pending until they accept
      permission: _selectedPermission,
      ownerId: ownerId,
      createdAt: DateTime.now(),
    );

    // Add to contacts
    final contactListNotifier = ref.read(contactListProvider.notifier);
    await contactListNotifier.addContact(contact);

    if (mounted) {
      // Show success message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Invitation sent to ${contact.name}'),
          backgroundColor: Colors.green,
        ),
      );

      // Go back to people screen
      context.pop();
    }
  }
}
