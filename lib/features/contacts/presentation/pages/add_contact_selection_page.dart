import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import 'package:myorbit_calendar/core/di/service_locator.dart';
import 'package:myorbit_calendar/core/enums/app_state_status.dart';
import 'package:myorbit_calendar/core/firebase_app_services.dart';
import 'package:myorbit_calendar/core/theme_constants.dart';
import 'package:myorbit_calendar/features/contacts/domain/entities/contact.dart';
import 'package:myorbit_calendar/features/contacts/presentation/cubit/contact_cubit.dart';
import 'package:myorbit_calendar/logic/services/dev_data_service.dart';
import 'package:myorbit_calendar/logic/services/device_contacts_service.dart';
import 'package:myorbit_calendar/ui/widgets/accessibility/semantic_button.dart';
import 'package:myorbit_calendar/ui/widgets/app_gradient_background.dart';
import 'package:myorbit_calendar/ui/widgets/contact_avatar.dart';

/// Tab options for contact selection
enum ContactSelectionTab { fromContacts, sendInvite }

/// Main contact selection screen - Migrated to BLoC
class AddContactSelectionScreenBloc extends StatefulWidget {
  const AddContactSelectionScreenBloc({super.key});

  @override
  State<AddContactSelectionScreenBloc> createState() =>
      _AddContactSelectionScreenBlocState();
}

class _AddContactSelectionScreenBlocState
    extends State<AddContactSelectionScreenBloc>
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

    return BlocProvider<ContactCubit>(
      create: (_) => sl<ContactCubit>()..loadContacts(),
      child: Scaffold(
        backgroundColor: palette.background,
        body: AppGradientBackground(
          child: SafeArea(
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
                      const SendInviteForm(),
                    ],
                  ),
                ),
              ],
            ),
          ),
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
          tabs: [
            const Tab(
              icon: Icon(Icons.contacts),
              text: 'From Contacts',
            ),
            Tab(
              icon: Image.asset(
                'icons/send_invite_button.webp',
                height: 20,
                fit: BoxFit.contain,
              ),
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
    DeviceContact contact,
    ThemeData theme,
    AppPalette palette,
  ) {
    return InkWell(
      onTap: () => _selectContact(contact),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            ContactAvatar(
              name: contact.name,
              radius: 24,
              photoBase64: contact.photoBase64,
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
    final currentUser = FirebaseAppServices.currentUser;
    final ownerId = currentUser?.uid ??
        (!FirebaseAppServices.isConfigured
            ? DevDataService.currentUserId
            : null);

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

    // Add to contacts using BLoC
    if (mounted) {
      await context.read<ContactCubit>().createContact(contact);

      final state = context.read<ContactCubit>().state;
      if (state.status == AppStateStatus.success) {
        // Show success message
        final permissionLabel = _permissionLabel(permission);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content:
                  Text('${contact.name} added as $permissionLabel contact'),
              backgroundColor: colorScheme.primary,
              behavior: SnackBarBehavior.floating,
            ),
          );

          // Go back to people screen
          context.pop();
        }
      } else if (state.status == AppStateStatus.failure) {
        // Show error message
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to add contact: ${state.message}'),
              backgroundColor: colorScheme.error,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
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
/// Note: This widget still uses Riverpod and will be migrated separately
class SendInviteForm extends StatelessWidget {
  const SendInviteForm({super.key});

  @override
  Widget build(BuildContext context) {
    // TODO: Migrate SendInviteForm to BLoC when needed
    // For now, keeping the original implementation
    return const Center(
      child: Text('Send Invite form - To be migrated'),
    );
  }
}
