import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/supabase_client.dart';
import '../../domain/contact.dart';
import '../../logic/providers/contact_providers.dart';
import '../../logic/services/device_contacts_service.dart';
import '../../logic/services/dev_data_service.dart';
import '../../logic/services/api_service.dart';
import '../../logic/providers/auth_providers.dart';
import '../widgets/contact_avatar.dart';
import '../widgets/accessibility/semantic_button.dart';
import '../../core/theme_constants.dart';

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
    final theme = Theme.of(context);
    final palette = AppPalette.of(context);

    return Scaffold(
      backgroundColor: palette.background,
      body: SafeArea(
        minimum: const EdgeInsets.only(top: 24),
        child: Column(
          children: [
            // Header
            _buildHeader(theme, palette),
            // Tab Bar
            _buildTabBar(theme, palette),
            // Search Bar (only on From Contacts tab)
            if (_tabController.index == 0) _buildSearchBar(theme, palette),
            // Content
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildFromContactsTab(theme, palette),
                  _buildSendInviteTab(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(ThemeData theme, AppPalette palette) {
    final textTheme = theme.textTheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: palette.surface,
        boxShadow: [
          BoxShadow(
            color: palette.cardShadow,
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Text(
            'Add Connection',
            style: textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
              color: palette.textPrimary,
            ),
          ),
          const Spacer(),
          SemanticIconButton(
            label: 'Close',
            icon: Icons.close,
            onPressed: () => context.pop(),
            color: palette.textSecondary,
          ),
        ],
      ),
    );
  }

  Widget _buildTabBar(ThemeData theme, AppPalette palette) {
    return Container(
      color: palette.surface,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: DecoratedBox(
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(color: palette.divider),
          ),
        ),
        child: TabBar(
          controller: _tabController,
          onTap: (index) => setState(() {}), // Rebuild to show/hide search
          indicatorColor: theme.colorScheme.primary,
          indicatorSize: TabBarIndicatorSize.label,
          indicatorWeight: 3,
          labelColor: theme.colorScheme.primary,
          unselectedLabelColor: palette.tabUnselectedText,
          labelStyle: theme.textTheme.titleMedium
              ?.copyWith(fontWeight: FontWeight.w600),
          unselectedLabelStyle: theme.textTheme.titleMedium?.copyWith(
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
      ),
    );
  }

  Widget _buildSearchBar(ThemeData theme, AppPalette palette) {
    return Container(
      color: palette.surface,
      padding: const EdgeInsets.all(16),
      child: TextField(
        controller: _searchController,
        style: theme.textTheme.bodyLarge?.copyWith(color: palette.textPrimary),
        decoration: InputDecoration(
          hintText: 'Search contacts...',
          hintStyle: theme.textTheme.bodyMedium
              ?.copyWith(color: palette.textSecondary),
          prefixIcon: Icon(Icons.search, color: palette.textSecondary),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: palette.divider),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: palette.divider),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: theme.colorScheme.primary),
          ),
          filled: true,
          fillColor: palette.subtleSurface,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
      ),
    );
  }

  Widget _buildFromContactsTab(ThemeData theme, AppPalette palette) {
    if (_isLoading) {
      return Center(
        child: CircularProgressIndicator(color: theme.colorScheme.primary),
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
              color: theme.colorScheme.error.withValues(alpha: 0.7),
            ),
            const SizedBox(height: 16),
            Text(
              _errorMessage!,
              style: theme.textTheme.bodyMedium
                  ?.copyWith(color: palette.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadDeviceContacts,
              child: const Text('Try again'),
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
              color: palette.textSecondary,
            ),
            const SizedBox(height: 16),
            Text(
              _searchController.text.trim().isNotEmpty
                  ? 'No contacts found matching "${_searchController.text}"'
                  : 'No contacts available',
              style: theme.textTheme.bodyMedium
                  ?.copyWith(color: palette.textSecondary),
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
        return _buildContactListItem(contact, theme, palette);
      },
    );
  }

  Widget _buildContactListItem(
      DeviceContact contact, ThemeData theme, AppPalette palette) {
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
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: palette.textPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (contact.email != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      contact.email!,
                      style: theme.textTheme.bodyMedium
                          ?.copyWith(color: palette.textSecondary),
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

  String _permissionLabel(PartnerPermission permission) {
    switch (permission) {
      case PartnerPermission.private:
        return 'private';
      case PartnerPermission.semiVisible:
        return 'semi-visible';
      case PartnerPermission.visible:
        return 'visible';
    }
  }

  Future<void> _selectContact(DeviceContact deviceContact) async {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

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
          SnackBar(
            content: const Text('Please sign in to add contacts'),
            backgroundColor: colorScheme.error,
            behavior: SnackBarBehavior.floating,
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
      final permissionLabel = _permissionLabel(permission);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${contact.name} added as $permissionLabel contact'),
          backgroundColor: colorScheme.primary,
          behavior: SnackBarBehavior.floating,
        ),
      );

      // Go back to people screen
      context.pop();
    }
  }

  Future<PartnerPermission?> _showPermissionSelectionDialog() async {
    return showDialog<PartnerPermission>(
      context: context,
      builder: (dialogContext) {
        final dialogTheme = Theme.of(dialogContext);
        final palette = AppPalette.of(dialogContext);
        final textTheme = dialogTheme.textTheme;
        final colorScheme = dialogTheme.colorScheme;

        return AlertDialog(
          title: Text(
            'Select Permission Level',
            style: textTheme.titleLarge?.copyWith(color: palette.textPrimary),
          ),
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
                  color = colorScheme.error;
                  break;
                case PartnerPermission.semiVisible:
                  icon = Icons.access_time;
                  title = 'Semi-Visible';
                  description = 'Sees busy times only';
                  color = colorScheme.secondary;
                  break;
                case PartnerPermission.visible:
                  icon = Icons.visibility;
                  title = 'Visible';
                  description = 'Sees all event details';
                  color = colorScheme.primary;
                  break;
              }

              return ListTile(
                leading: Icon(icon, color: color),
                title: Text(
                  title,
                  style: textTheme.titleMedium
                      ?.copyWith(color: palette.textPrimary),
                ),
                subtitle: Text(
                  description,
                  style: textTheme.bodyMedium
                      ?.copyWith(color: palette.textSecondary),
                ),
                onTap: () => Navigator.pop(dialogContext, permission),
              );
            }).toList(),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Cancel'),
            ),
          ],
        );
      },
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
  final _phoneController = TextEditingController();
  PartnerPermission _selectedPermission = PartnerPermission.semiVisible;
  String _invitationMethod = 'email'; // 'email' or 'sms'
  bool _isLoading = false;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final palette = AppPalette.of(context);
    final textTheme = theme.textTheme;
    final colorScheme = theme.colorScheme;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Send an invitation to someone new',
              style: textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w600,
                color: palette.textPrimary,
              ),
            ),
            const SizedBox(height: 24),

            // Name field
            TextFormField(
              controller: _nameController,
              style: textTheme.bodyLarge?.copyWith(color: palette.textPrimary),
              decoration: const InputDecoration(
                labelText: 'Full Name',
                hintText: 'Enter their full name',
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

            // Invitation method selection
            Text(
              'Invitation Method',
              style: textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: palette.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(label: Text('Email'), value: 'email'),
                      ButtonSegment(label: Text('SMS'), value: 'sms'),
                    ],
                    selected: {_invitationMethod},
                    onSelectionChanged: (Set<String> newSelection) {
                      setState(() {
                        _invitationMethod = newSelection.first;
                      });
                    },
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Email field (shown when email method selected)
            if (_invitationMethod == 'email')
              TextFormField(
                controller: _emailController,
                style: textTheme.bodyLarge?.copyWith(color: palette.textPrimary),
                decoration: const InputDecoration(
                  labelText: 'Email Address',
                  hintText: 'Enter their email address',
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

            // Phone field (shown when SMS method selected)
            if (_invitationMethod == 'sms')
              TextFormField(
                controller: _phoneController,
                style: textTheme.bodyLarge?.copyWith(color: palette.textPrimary),
                decoration: const InputDecoration(
                  labelText: 'Phone Number',
                  hintText: 'Enter phone number in E.164 format (+1234567890)',
                  helperText: 'Format: +1 country code + number',
                ),
                keyboardType: TextInputType.phone,
                validator: (value) {
                  if (value?.trim().isEmpty ?? true) {
                    return 'Phone number is required';
                  }
                  // E.164 format validation
                  if (!RegExp(r'^\+\d{1,15}$').hasMatch(value!.trim())) {
                    return 'Enter a valid phone number in E.164 format (e.g., +1234567890)';
                  }
                  return null;
                },
              ),

            const SizedBox(height: 24),

            // Permission selection
            Text(
              'Permission Level',
              style: textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: palette.textPrimary,
              ),
            ),
            const SizedBox(height: 12),

            RadioGroup<PartnerPermission>(
              groupValue: _selectedPermission,
              onChanged: (value) {
                if (value != null) {
                  setState(() {
                    _selectedPermission = value;
                  });
                }
              },
              child: Column(
                children: PartnerPermission.values.map((permission) {
                  final option = _permissionOption(theme, permission);
                  final isSelected = permission == _selectedPermission;

                  return Container(
                    margin: const EdgeInsets.symmetric(vertical: 6),
                    decoration: BoxDecoration(
                      color: palette.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color:
                            isSelected ? colorScheme.primary : palette.divider,
                      ),
                    ),
                    child: RadioListTile<PartnerPermission>(
                      value: permission,
                      activeColor: colorScheme.primary,
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 4),
                      title: Row(
                        children: [
                          Icon(option.icon, color: option.color, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            option.title,
                            style: textTheme.titleMedium?.copyWith(
                              color: palette.textPrimary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                      subtitle: Text(
                        option.description,
                        style: textTheme.bodyMedium?.copyWith(
                          color: palette.textSecondary,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),

            const SizedBox(height: 32),

            // Send invite button
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _isLoading ? null : _sendInvite,
                style: FilledButton.styleFrom(
                  backgroundColor: colorScheme.primary,
                  foregroundColor: colorScheme.onPrimary,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  disabledBackgroundColor: colorScheme.primary.withValues(alpha: 0.5),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : const Text(
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

    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    setState(() => _isLoading = true);

    try {
      // Get current user ID
      final currentUser = ref.read(currentUserProvider);
      final ownerId = currentUser?.id ??
          (!SupabaseService.isConfigured ? DevDataService.currentUserId : null);

      if (ownerId == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Please sign in to send invites'),
              backgroundColor: colorScheme.error,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
        return;
      }

      final name = _nameController.text.trim();
      final email = _emailController.text.trim();
      final phone = _phoneController.text.trim();

      // Send invitation via API
      final result = await ContactInvitationApi.sendContactInvitation(
        recipientName: name,
        recipientEmail: email,
        recipientPhoneNumber: _invitationMethod == 'sms' ? phone : null,
        method: _invitationMethod,
        permission: _selectedPermission.name,
      );

      if (!mounted) return;

      result.when(
        success: (_) {
          setState(() => _isLoading = false);
          
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Invitation sent to $name via ${_invitationMethod.toUpperCase()}'),
              backgroundColor: colorScheme.primary,
              behavior: SnackBarBehavior.floating,
            ),
          );
          
          // Clear form
          _nameController.clear();
          _emailController.clear();
          _phoneController.clear();
          setState(() => _invitationMethod = 'email');
          
          // Go back to people screen
          context.pop();
        },
        failure: (message, error) {
          setState(() => _isLoading = false);
          
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to send invitation: $message'),
              backgroundColor: colorScheme.error,
              behavior: SnackBarBehavior.floating,
            ),
          );
        },
      );
    } catch (e) {
      setState(() => _isLoading = false);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: colorScheme.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  _PermissionOption _permissionOption(
      ThemeData theme, PartnerPermission permission) {
    final colorScheme = theme.colorScheme;
    switch (permission) {
      case PartnerPermission.private:
        return _PermissionOption(
          icon: Icons.visibility_off,
          title: 'Private',
          description: 'No access to your calendar',
          color: colorScheme.error,
        );
      case PartnerPermission.semiVisible:
        return _PermissionOption(
          icon: Icons.access_time,
          title: 'Semi-Visible',
          description: 'Sees busy times only',
          color: colorScheme.secondary,
        );
      case PartnerPermission.visible:
        return _PermissionOption(
          icon: Icons.visibility,
          title: 'Visible',
          description: 'Sees all event details',
          color: colorScheme.primary,
        );
    }
  }
}

class _PermissionOption {
  const _PermissionOption({
    required this.icon,
    required this.title,
    required this.description,
    required this.color,
  });

  final IconData icon;
  final String title;
  final String description;
  final Color color;
}
