import 'package:flutter/material.dart';
import 'package:myorbit_calender/core/theme/theme.dart';

class CustomScaffold extends StatelessWidget {
  final Widget body;
  final PreferredSizeWidget? appBar;

  const CustomScaffold({super.key, required this.body, this.appBar});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surfaceDark, // Solid light gray background
      appBar: appBar,
      body: body,
    );
  }
}
