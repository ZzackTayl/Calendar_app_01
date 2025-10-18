import 'package:flutter/material.dart';

/// Minimal placeholder for a calendar day cell.
class DayCellWidget extends StatelessWidget {
  const DayCellWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 1,
      child: DecoratedBox(
        decoration: BoxDecoration(
          border: Border.all(color: Theme.of(context).dividerColor),
        ),
        child: const Center(child: Text('Day')),
      ),
    );
  }
}
