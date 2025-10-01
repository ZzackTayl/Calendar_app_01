import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/user_provider.dart';

class PeopleGroupsScreen extends StatelessWidget {
  const PeopleGroupsScreen({super.key});

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
      backgroundColor: const Color(0xFFF5F5F5),
      body: SafeArea(
        child: Column(
          children: [
            const _ScreenHeader(),
            Expanded(
              child: CustomScrollView(
                physics: const BouncingScrollPhysics(),
                slivers: [
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                    sliver: SliverList(
                      delegate: SliverChildListDelegate([
                        _buildSummaryRow(
                          connected: connected.length,
                          pending: pending.length,
                          contactOnly: contactOnly.length,
                        ),
                        const SizedBox(height: 20),
                        _PartnerSection(
                          title: 'Connected',
                          description:
                              'Partners who can coordinate plans in real time.',
                          emptyText:
                              'No connected partners yet. Invite someone to get started!',
                          partners: connected,
                        ),
                        const SizedBox(height: 16),
                        _PartnerSection(
                          title: 'Pending invites',
                          description:
                              'Waiting on partners to accept their invitations.',
                          emptyText:
                              'No pending invites. Send a new invitation to collaborate.',
                          partners: pending,
                        ),
                        const SizedBox(height: 16),
                        _PartnerSection(
                          title: 'Contacts only',
                          description:
                              'Saved contacts that you can upgrade to full collaborators.',
                          emptyText:
                              'No contact-only partners yet. Add someone during onboarding.',
                          partners: contactOnly,
                        ),
                        const SizedBox(height: 32),
                        _ActionsCard(onInviteTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text(
                                'Inviting new partners will be available soon.',
                              ),
                            ),
                          );
                        }),
                      ]),
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

  Widget _buildSummaryRow({
    required int connected,
    required int pending,
    required int contactOnly,
  }) {
    return Row(
      children: [
        Expanded(
          child: _SummaryPill(
            label: 'Connected',
            value: '$connected',
            background: const Color(0xFFDEF3E8),
            foreground: const Color(0xFF0F8A54),
            icon: Icons.verified_user_outlined,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _SummaryPill(
            label: 'Pending',
            value: '$pending',
            background: const Color(0xFFFFF3D7),
            foreground: const Color(0xFFC47018),
            icon: Icons.hourglass_top_outlined,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _SummaryPill(
            label: 'Contacts',
            value: '$contactOnly',
            background: const Color(0xFFE1E6F7),
            foreground: const Color(0xFF3D4E92),
            icon: Icons.account_circle_outlined,
          ),
        ),
      ],
    );
  }
}

class _ScreenHeader extends StatelessWidget {
  const _ScreenHeader();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFB8E6F5), Color(0xFFE8D4F2)],
        ),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
      ),
      child: Row(
        children: [
          IconButton(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.arrow_back_ios_new_rounded),
            color: Colors.black87,
          ),
          const SizedBox(width: 8),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'People & Groups',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    color: Colors.black87,
                  ),
                ),
                SizedBox(height: 6),
                Text(
                  'Manage collaborators, invites, and contact-only profiles.',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.black54,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SummaryPill extends StatelessWidget {
  const _SummaryPill({
    required this.label,
    required this.value,
    required this.background,
    required this.foreground,
    required this.icon,
  });

  final String label;
  final String value;
  final Color background;
  final Color foreground;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          Icon(icon, color: foreground, size: 22),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  color: foreground.withOpacity(0.9),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: foreground,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _PartnerSection extends StatelessWidget {
  const _PartnerSection({
    required this.title,
    required this.description,
    required this.emptyText,
    required this.partners,
  });

  final String title;
  final String description;
  final String emptyText;
  final List<PartnerProfile> partners;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          description,
          style: const TextStyle(
            fontSize: 14,
            color: Colors.black54,
          ),
        ),
        const SizedBox(height: 12),
        if (partners.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
            ),
            child: Text(
              emptyText,
              style: const TextStyle(
                fontSize: 14,
                color: Colors.black54,
              ),
            ),
          )
        else
          Column(
            children: partners
                .map((partner) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _PartnerTile(partner: partner),
                    ))
                .toList(),
          ),
      ],
    );
  }
}

class _PartnerTile extends StatelessWidget {
  const _PartnerTile({required this.partner});

  final PartnerProfile partner;

  @override
  Widget build(BuildContext context) {
    final statusStyle = _statusStyle(partner.status);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        leading: CircleAvatar(
          radius: 24,
          backgroundColor: statusStyle.badgeBackground,
          child: Icon(statusStyle.icon, color: statusStyle.badgeForeground),
        ),
        title: Text(
          partner.name,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.black87,
          ),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                partner.relationship,
                style: const TextStyle(
                  fontSize: 14,
                  color: Colors.black54,
                ),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusStyle.badgeBackground,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Text(
                      statusStyle.label,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: statusStyle.badgeForeground,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    _permissionLabel(partner.permission),
                    style: const TextStyle(
                      fontSize: 12,
                      color: Colors.black45,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        trailing: IconButton(
          icon: const Icon(Icons.more_horiz),
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Manage options for ${partner.name} coming soon.'),
              ),
            );
          },
        ),
      ),
    );
  }

  _PartnerStatusStyle _statusStyle(ConnectionStatus status) {
    switch (status) {
      case ConnectionStatus.connected:
        return const _PartnerStatusStyle(
          label: 'Connected',
          icon: Icons.link_rounded,
          badgeBackground: Color(0xFFDEF3E8),
          badgeForeground: Color(0xFF0F8A54),
        );
      case ConnectionStatus.pendingInvite:
        return const _PartnerStatusStyle(
          label: 'Pending invite',
          icon: Icons.hourglass_top_rounded,
          badgeBackground: Color(0xFFFFF3D7),
          badgeForeground: Color(0xFFC47018),
        );
      case ConnectionStatus.contactOnly:
        return const _PartnerStatusStyle(
          label: 'Contact only',
          icon: Icons.person_outline,
          badgeBackground: Color(0xFFE1E6F7),
          badgeForeground: Color(0xFF3D4E92),
        );
    }
  }

  String _permissionLabel(ConnectionPermission permission) {
    switch (permission) {
      case ConnectionPermission.private:
        return 'Sees private availability only';
      case ConnectionPermission.semiVisible:
        return 'Sees limited event details';
      case ConnectionPermission.visible:
        return 'Sees full event details';
    }
  }
}

class _PartnerStatusStyle {
  const _PartnerStatusStyle({
    required this.label,
    required this.icon,
    required this.badgeBackground,
    required this.badgeForeground,
  });

  final String label;
  final IconData icon;
  final Color badgeBackground;
  final Color badgeForeground;
}

class _ActionsCard extends StatelessWidget {
  const _ActionsCard({required this.onInviteTap});

  final VoidCallback onInviteTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Bring more people in',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Invite partners to view availability, share events, and stay in sync.',
            style: TextStyle(
              fontSize: 14,
              color: Colors.black54,
            ),
          ),
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: onInviteTap,
              icon: const Icon(Icons.person_add_alt_1_rounded),
              label: const Text('Invite a partner'),
              style: FilledButton.styleFrom(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
