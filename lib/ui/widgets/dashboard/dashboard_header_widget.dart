import 'package:flutter/material.dart';

/// Placeholder header that will eventually host branding and quick actions.
class DashboardHeaderWidget extends StatelessWidget {
  const DashboardHeaderWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: const [
          Text(
            'MyOrbit Dashboard',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
          ),
          Icon(Icons.notifications_none),
        ],
      ),
    );
  }
}
