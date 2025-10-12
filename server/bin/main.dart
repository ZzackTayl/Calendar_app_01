import 'dart:io';

import 'package:calendar_server/calendar_server.dart';

void main(List<String> args) async {
  // Initialize Serverpod and start the server.
  final pod = Serverpod(
    args,
    Protocol(),
    Endpoints(),
  );
  await pod.start();
}