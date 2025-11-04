import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Gatekeeper widget that reacts to Firebase auth state changes and ensures
/// users land on the appropriate flow without manual navigation.
class AuthenticationFlowScreen extends StatefulWidget {
  AuthenticationFlowScreen({
    super.key,
    required this.hasCompletedOnboarding,
    required this.router,
    required this.child,
    FirebaseAuth? auth,
  }) : auth = auth ?? _resolveDefaultAuth();

  final bool hasCompletedOnboarding;
  final GoRouter router;
  final Widget child;
  final FirebaseAuth? auth;

  static FirebaseAuth? _resolveDefaultAuth() {
    if (Firebase.apps.isEmpty) {
      return null;
    }
    try {
      return FirebaseAuth.instance;
    } catch (_) {
      return null;
    }
  }

  @override
  State<AuthenticationFlowScreen> createState() =>
      _AuthenticationFlowScreenState();
}

class _AuthenticationFlowScreenState extends State<AuthenticationFlowScreen> {
  String? _pendingRedirect;

  @override
  Widget build(BuildContext context) {
    final auth = widget.auth;

    if (auth == null) {
      // Firebase may not be configured yet (development builds, tests).
      // Without Firebase auth we simply render the child as-is.
      return widget.child;
    }

    return StreamBuilder<User?>(
      stream: auth.authStateChanges(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return _buildLoadingScaffold();
        }

        final currentLocation = _currentLocation(widget.router);
        final user = snapshot.data;

        final targetLocation = _resolveTargetLocation(
          isAuthenticated: user != null,
          currentLocation: currentLocation,
        );

        final shouldRedirect = targetLocation != null &&
            targetLocation != _pendingRedirect &&
            targetLocation != currentLocation;

        if (shouldRedirect) {
          _pendingRedirect = targetLocation;
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (!mounted) {
              return;
            }
            if (_currentLocation(widget.router) != targetLocation) {
              widget.router.go(targetLocation);
            }
            _pendingRedirect = null;
          });
        }

        _pendingRedirect = null;
        return widget.child;
      },
    );
  }

  String _currentLocation(GoRouter router) {
    return router.routeInformationProvider.value.uri.toString();
  }

  String? _resolveTargetLocation({
    required bool isAuthenticated,
    required String currentLocation,
  }) {
    if (isAuthenticated) {
      const restrictedPrefixes = <String>[
        '/',
        '/auth',
        '/onboarding',
        '/landing',
        '/account-recovery',
      ];

      final shouldRouteToDashboard = restrictedPrefixes.any(
        (prefix) =>
            currentLocation == prefix ||
            currentLocation.startsWith('$prefix/'),
      );

      return shouldRouteToDashboard ? '/dashboard' : null;
    }

    const allowedUnauthenticated = <String>[
      '/',
      '/auth',
      '/onboarding',
      '/landing',
      '/account-recovery',
    ];

    final onAllowedScreen = allowedUnauthenticated.any(
      (prefix) =>
          currentLocation == prefix || currentLocation.startsWith('$prefix/'),
    );

    if (onAllowedScreen) {
      return null;
    }

    return widget.hasCompletedOnboarding ? '/auth' : '/onboarding';
  }

  Widget _buildLoadingScaffold() {
    return const Scaffold(
      body: Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}
