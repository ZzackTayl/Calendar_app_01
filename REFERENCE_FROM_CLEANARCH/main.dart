import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:myorbit_calender/core/di/di.dart';

import 'app.dart';

void main() async {
  // Ensure Flutter bindings are initialized
  WidgetsFlutterBinding.ensureInitialized();

  // Lock orientation to portrait mode for consistency
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Initialize dependency injection
  await initializeDependencies();

  // Set system UI overlay style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ),
  );

  // Run the application
  runApp(const MyOrbitApp());
}
