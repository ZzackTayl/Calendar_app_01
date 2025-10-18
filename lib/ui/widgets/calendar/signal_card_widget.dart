import 'package:flutter/material.dart';

/// Placeholder card representing availability signals.
class SignalCardWidget extends StatelessWidget {
  const SignalCardWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: const [
            Icon(Icons.wifi_tethering),
            SizedBox(width: 12),
            Expanded(child: Text('Signal placeholder')),
          ],
        ),
      ),
    );
  }
}
