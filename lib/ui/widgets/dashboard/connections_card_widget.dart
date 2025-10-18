import 'package:flutter/material.dart';

/// Placeholder showing connections status for the dashboard prototype.
class ConnectionsCardWidget extends StatelessWidget {
  const ConnectionsCardWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: ListTile(
        leading: const Icon(Icons.people),
        title: const Text('Connections summary'),
        subtitle: const Text('Placeholder content'),
        trailing: TextButton(
          onPressed: () {},
          child: const Text('View'),
        ),
      ),
    );
  }
}
