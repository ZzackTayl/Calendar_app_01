import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/user_provider.dart';

class PeopleGroupsScreen extends StatefulWidget {
  const PeopleGroupsScreen({super.key});

  @override
  State<PeopleGroupsScreen> createState() => _PeopleGroupsScreenState();
}

class _PeopleGroupsScreenState extends State<PeopleGroupsScreen> {
  int _selectedTabIndex = 0;

  @override
  Widget build(BuildContext context) {
    final userProfile = context.watch<UserProfileProvider>();
    final connected = userProfile.partners
        .where((partner) => partner.status == ConnectionStatus.connected)
        .toList();
    final pending = userProfile.partners
        .where((partner) => partner.status == ConnectionStatus.pendingInvite)
        .toList();
    final contactOnly = userProfile.partners
        .where((partner) => partner.status == ConnectionStatus.contactOnly)
        .toList();

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFB7F0FF), Color(0xFFF7C8FF)],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              _buildHeader(),
              _buildTabs(),
              _buildContent(connected, pending, contactOnly),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      child: Row(
        children: [
          TextButton.icon(
            onPressed: () {
              if (Navigator.canPop(context)) {
                Navigator.pop(context);
              } else {
                Navigator.pushReplacementNamed(context, '/dashboard');
              }
            },
            style: TextButton.styleFrom(
              foregroundColor: Colors.black87,
              textStyle:
                  const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
            label: const Text('Back'),
          ),
          const Spacer(),
        ],
      ),
    );
  }

  Widget _buildTabs() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: Row(
        children: [
          _buildTab('Connected', 0),
          const SizedBox(width: 16),
          _buildTab('Pending (0)', 1),
          const SizedBox(width: 16),
          _buildTab('Contacts (0)', 2),
        ],
      ),
    );
  }

  Widget _buildTab(String label, int index) {
    final isSelected = _selectedTabIndex == index;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedTabIndex = index;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? Colors.grey.withOpacity(0.2) : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: isSelected ? Colors.black87 : Colors.black54,
          ),
        ),
      ),
    );
  }

  Widget _buildContent(List<PartnerProfile> connected,
      List<PartnerProfile> pending, List<PartnerProfile> contactOnly) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  _getTabTitle(),
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    color: Colors.black87,
                  ),
                ),
                const Spacer(),
                if (_selectedTabIndex == 0) _buildAddPartnerButton(),
              ],
            ),
            const SizedBox(height: 20),
            Expanded(
              child: _buildPartnerList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAddPartnerButton() {
    return GestureDetector(
      onTap: () {
        // TODO: Implement add partner functionality
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Add Partner functionality coming soon')),
        );
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: const Color(0xFF7C3BFF),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.person_add, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            const Text(
              'Add Partner',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
                fontSize: 16,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPartnerList() {
    final userProfile = context.watch<UserProfileProvider>();
    List<PartnerProfile> partners = [];

    switch (_selectedTabIndex) {
      case 0:
        partners = userProfile.partners
            .where((partner) => partner.status == ConnectionStatus.connected)
            .toList();
        break;
      case 1:
        partners = userProfile.partners
            .where(
                (partner) => partner.status == ConnectionStatus.pendingInvite)
            .toList();
        break;
      case 2:
        partners = userProfile.partners
            .where((partner) => partner.status == ConnectionStatus.contactOnly)
            .toList();
        break;
    }

    if (partners.isEmpty) {
      return _buildEmptyState();
    }

    return ListView.builder(
      itemCount: partners.length,
      itemBuilder: (context, index) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: _buildPartnerCard(partners[index]),
        );
      },
    );
  }

  Widget _buildPartnerCard(PartnerProfile partner) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _buildAvatar(partner.name),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          partner.name,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: Colors.black87,
                          ),
                        ),
                        const SizedBox(width: 12),
                        _buildStatusBadge(),
                      ],
                    ),
                    const SizedBox(height: 8),
                    _buildVisibilityStatus(partner.permission),
                  ],
                ),
              ),
              _buildDeleteButton(partner),
            ],
          ),
          const SizedBox(height: 16),
          _buildPermissionDropdown(partner),
        ],
      ),
    );
  }

  Widget _buildAvatar(String name) {
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';
    final color = _getAvatarColor(name);

    return Container(
      width: 50,
      height: 50,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Text(
          initial,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFE8F5E8),
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Text(
        'Connected',
        style: TextStyle(
          color: Color(0xFF4CAF50),
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildVisibilityStatus(ConnectionPermission permission) {
    IconData icon;
    String text;
    Color color;

    switch (permission) {
      case ConnectionPermission.visible:
        icon = Icons.visibility;
        text = 'Visible';
        color = const Color(0xFF4CAF50);
        break;
      case ConnectionPermission.semiVisible:
        icon = Icons.schedule;
        text = 'Semi-Visible';
        color = const Color(0xFFFF9800);
        break;
      case ConnectionPermission.private:
        icon = Icons.lock;
        text = 'Private';
        color = const Color(0xFF9E9E9E);
        break;
    }

    return Row(
      children: [
        Icon(icon, color: color, size: 16),
        const SizedBox(width: 8),
        Text(
          text,
          style: const TextStyle(
            color: Colors.black87,
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildDeleteButton(PartnerProfile partner) {
    return GestureDetector(
      onTap: () {
        _showDeleteConfirmation(partner);
      },
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.red.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Icon(
          Icons.delete_outline,
          color: Colors.red,
          size: 20,
        ),
      ),
    );
  }

  Widget _buildPermissionDropdown(PartnerProfile partner) {
    IconData icon;
    String text;
    Color color;

    switch (partner.permission) {
      case ConnectionPermission.visible:
        icon = Icons.visibility;
        text = 'Permission: Visible';
        color = const Color(0xFF4CAF50);
        break;
      case ConnectionPermission.semiVisible:
        icon = Icons.schedule;
        text = 'Permission: Semi-Visible';
        color = const Color(0xFFFF9800);
        break;
      case ConnectionPermission.private:
        icon = Icons.lock;
        text = 'Permission: Private';
        color = const Color(0xFF9E9E9E);
        break;
    }

    return GestureDetector(
      onTap: () {
        _showPermissionDialog(partner);
      },
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.grey.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(icon, color: color, size: 16),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                text,
                style: const TextStyle(
                  color: Colors.black87,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            const Icon(
              Icons.keyboard_arrow_down,
              color: Colors.black54,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.people_outline,
            size: 64,
            color: Colors.black54.withOpacity(0.5),
          ),
          const SizedBox(height: 16),
          Text(
            _getEmptyStateTitle(),
            style: const TextStyle(
              color: Colors.black87,
              fontWeight: FontWeight.w600,
              fontSize: 18,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _getEmptyStateMessage(),
            style: const TextStyle(
              color: Colors.black54,
              fontSize: 14,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  String _getTabTitle() {
    switch (_selectedTabIndex) {
      case 0:
        return 'Connected Partners';
      case 1:
        return 'Pending Partners';
      case 2:
        return 'Contact Partners';
      default:
        return 'Partners';
    }
  }

  String _getEmptyStateTitle() {
    switch (_selectedTabIndex) {
      case 0:
        return 'No connected partners';
      case 1:
        return 'No pending invites';
      case 2:
        return 'No contact partners';
      default:
        return 'No partners';
    }
  }

  String _getEmptyStateMessage() {
    switch (_selectedTabIndex) {
      case 0:
        return 'Add partners to start coordinating plans together';
      case 1:
        return 'Invite partners to see pending requests here';
      case 2:
        return 'Add contact partners to manage your connections';
      default:
        return 'Add partners to get started';
    }
  }

  Color _getAvatarColor(String name) {
    final colors = [
      const Color(0xFF7C3BFF), // Purple
      const Color(0xFFFF9800), // Orange
      const Color(0xFF4CAF50), // Green
      const Color(0xFF2196F3), // Blue
      const Color(0xFFE91E63), // Pink
    ];
    return colors[name.hashCode % colors.length];
  }

  void _showDeleteConfirmation(PartnerProfile partner) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Delete Partner'),
          content: Text('Are you sure you want to remove ${partner.name}?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                // TODO: Implement delete functionality
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('${partner.name} removed')),
                );
              },
              child: const Text('Delete', style: TextStyle(color: Colors.red)),
            ),
          ],
        );
      },
    );
  }

  void _showPermissionDialog(PartnerProfile partner) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text('Change ${partner.name}\'s Permission'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildPermissionOption(
                context,
                ConnectionPermission.visible,
                'Visible',
                'Full access to your calendar',
                Icons.visibility,
                const Color(0xFF4CAF50),
              ),
              _buildPermissionOption(
                context,
                ConnectionPermission.semiVisible,
                'Semi-Visible',
                'Limited access to your calendar',
                Icons.schedule,
                const Color(0xFFFF9800),
              ),
              _buildPermissionOption(
                context,
                ConnectionPermission.private,
                'Private',
                'No access to your calendar',
                Icons.lock,
                const Color(0xFF9E9E9E),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
          ],
        );
      },
    );
  }

  Widget _buildPermissionOption(
    BuildContext context,
    ConnectionPermission permission,
    String title,
    String description,
    IconData icon,
    Color color,
  ) {
    return ListTile(
      leading: Icon(icon, color: color),
      title: Text(title),
      subtitle: Text(description),
      onTap: () {
        Navigator.of(context).pop();
        // TODO: Implement permission change functionality
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Permission changed to $title')),
        );
      },
    );
  }
}
