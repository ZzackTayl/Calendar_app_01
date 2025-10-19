import 'package:flutter_test/flutter_test.dart';

import 'package:myorbit_calendar/domain/notification.dart' as app_notification;
import 'package:myorbit_calendar/logic/services/api_service.dart';

void main() {
  group('NotificationApi._mapNotificationType', () {
    test('maps supabase invite types to eventInvite', () {
      expect(
        NotificationApi.debugMapNotificationType('event-invite'),
        app_notification.NotificationType.eventInvite,
      );
      expect(
        NotificationApi.debugMapNotificationType('contact-request'),
        app_notification.NotificationType.partnerRequest,
      );
    });

    test('maps signal events to signal categories', () {
      expect(
        NotificationApi.debugMapNotificationType('signal-shared'),
        app_notification.NotificationType.signalShared,
      );
      expect(
        NotificationApi.debugMapNotificationType('signal-expired'),
        app_notification.NotificationType.signalReceived,
      );
    });

    test('defaults unknown values to system', () {
      expect(
        NotificationApi.debugMapNotificationType('unknown-type'),
        app_notification.NotificationType.system,
      );
    });
  });
}
