import 'package:flutter/foundation.dart';

enum InvitationMode { contactOnly, inviteToApp }

enum ConnectionPermission { private, semiVisible, visible }

enum ConnectionStatus { contactOnly, pendingInvite, connected }

class PartnerProfile {
  PartnerProfile({
    required this.id,
    required this.name,
    required this.relationship,
    required this.invitationMode,
    required this.permission,
    ConnectionStatus? status,
  }) : status = status ?? _deriveStatus(invitationMode);

  final String id;
  final String name;
  final String relationship;
  final InvitationMode invitationMode;
  final ConnectionPermission permission;
  final ConnectionStatus status;

  static ConnectionStatus _deriveStatus(InvitationMode mode) {
    switch (mode) {
      case InvitationMode.contactOnly:
        return ConnectionStatus.contactOnly;
      case InvitationMode.inviteToApp:
        return ConnectionStatus.pendingInvite;
    }
  }

  PartnerProfile copyWith({
    InvitationMode? invitationMode,
    ConnectionPermission? permission,
    ConnectionStatus? status,
  }) {
    final newMode = invitationMode ?? this.invitationMode;
    return PartnerProfile(
      id: id,
      name: name,
      relationship: relationship,
      invitationMode: newMode,
      permission: permission ?? this.permission,
      status: status ??
          (invitationMode != null
              ? _deriveStatus(newMode)
              : this.status),
    );
  }
}

class UserProfileProvider extends ChangeNotifier {
  bool _googleConnected = false;
  List<PartnerProfile> _partners = [];

  bool get googleConnected => _googleConnected;
  List<PartnerProfile> get partners => List.unmodifiable(_partners);

  int get connectedPartnersCount => _partners
      .where((p) => p.status == ConnectionStatus.connected)
      .length;

  int get pendingInviteCount => _partners
      .where((p) => p.status == ConnectionStatus.pendingInvite)
      .length;

  int get contactOnlyCount => _partners
      .where((p) => p.status == ConnectionStatus.contactOnly)
      .length;

  void setGoogleConnected(bool value) {
    if (_googleConnected == value) return;
    _googleConnected = value;
    notifyListeners();
  }

  void replacePartners(List<PartnerProfile> partners) {
    _partners = partners;
    notifyListeners();
  }

  void updatePartner({required String id, PartnerProfile? profile}) {
    final index = _partners.indexWhere((p) => p.id == id);
    if (index == -1 || profile == null) return;
    _partners[index] = profile;
    notifyListeners();
  }

  PartnerProfile? getPartner(String id) {
    try {
      return _partners.firstWhere((p) => p.id == id);
    } catch (_) {
      return null;
    }
  }

  void setPartnerStatus({required String id, required ConnectionStatus status}) {
    final index = _partners.indexWhere((p) => p.id == id);
    if (index == -1) return;
    _partners[index] = _partners[index].copyWith(status: status);
    notifyListeners();
  }
}
