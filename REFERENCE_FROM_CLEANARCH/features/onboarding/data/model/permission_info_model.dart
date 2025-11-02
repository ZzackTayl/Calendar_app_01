part of 'model.dart';

class PermissionInfoModel {
  final PermissionLevel level;
  final String title;
  final String description;
  final String icon;

  const PermissionInfoModel({
    required this.level,
    required this.title,
    required this.description,
    required this.icon,
  });

  static List<PermissionInfoModel> get defaultPermissions => [
    const PermissionInfoModel(
      level: PermissionLevel.fullVisibility,
      title: 'Full Visibility',
      description:
          'Connections can see when you have events and all event details.',
      icon: '👁️',
    ),
    const PermissionInfoModel(
      level: PermissionLevel.partialVisibility,
      title: 'Partial Visibility',
      description: 'Connections only see that you\'re "busy" at certain times.',
      icon: '👀',
    ),
    const PermissionInfoModel(
      level: PermissionLevel.private,
      title: 'Private',
      description: 'Connections can\'t see what\'s on your calendar at all.',
      icon: '🔒',
    ),
  ];
}
