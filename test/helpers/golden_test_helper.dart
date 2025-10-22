import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> loadAppFontsForGoldens() async {
  try {
    final fontData = await rootBundle.load('assets/fonts/Roboto-Regular.ttf');
    final fontLoader = FontLoader('Roboto')
      ..addFont(Future.value(fontData.buffer.asByteData()));
    await fontLoader.load();
  } catch (_) {
    // If the font asset is absent, rely on default test fonts.
  }
}

Widget wrapForGolden(Widget child, {Size? surfaceSize, ThemeData? theme}) {
  return MaterialApp(
    theme: theme ?? ThemeData.light(),
    home: MediaQuery(
      data: MediaQueryData(
        size: surfaceSize ?? const Size(800, 1200),
        devicePixelRatio: 1.0,
        textScaler: const TextScaler.linear(1.0),
      ),
      child: child,
    ),
  );
}
