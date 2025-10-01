import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'models/contact.dart';
import 'providers/event_provider.dart';
import 'providers/user_provider.dart';
import 'screens/add_contacts_method_screen.dart';
import 'screens/calendar_screen.dart';
import 'screens/contact_permission_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/landing_screen.dart';
import 'screens/onboarding_screen.dart';
import 'screens/people_groups_screen.dart';
import 'screens/settings_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  final hasOnboarded = prefs.getBool('hasOnboarded') ?? false;

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => EventProvider()),
        ChangeNotifierProvider(create: (_) => UserProfileProvider()),
      ],
      child: CalendarApp(hasOnboarded: hasOnboarded),
    ),
  );
}

class CalendarApp extends StatelessWidget {
  final bool hasOnboarded;

  const CalendarApp({super.key, required this.hasOnboarded});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Calendar App',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        visualDensity: VisualDensity.adaptivePlatformDensity,
        fontFamily: 'Roboto',
      ),
      home: hasOnboarded ? const DashboardScreen() : const LandingScreen(),
      routes: {
        '/landing': (context) => const LandingScreen(),
        '/onboarding': (context) => const OnboardingScreen(),
        '/dashboard': (context) => const DashboardScreen(),
        '/calendar': (context) => const CalendarScreen(),
        '/contact-permission': (context) => ContactPermissionScreen(
              currentStep: 5,
              totalSteps: 8,
              onPermissionGranted: () {
                Navigator.pushReplacementNamed(context, '/add-contacts-method');
              },
              onBack: () {
                Navigator.pop(context);
              },
            ),
        '/add-contacts-method': (context) => AddContactsMethodScreen(
              currentStep: 7,
              totalSteps: 8,
              selectedContacts: [
                Contact(
                  id: '5',
                  name: 'Riley Chen',
                  email: 'riley.chen@email.com',
                  phone: '+1 (555) 567-8901',
                ),
              ],
              onMethodSelected: (method) {
                Navigator.pushReplacementNamed(context, '/dashboard');
              },
              onBack: () {
                Navigator.pop(context);
              },
            ),
        '/people-groups': (context) => const PeopleGroupsScreen(),
        '/settings': (context) => const SettingsScreen(),
      },
    );
  }
}
