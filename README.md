# Calendar_Mobile

Mobile-first Calendar app (PolyCalendar) built with Flutter and Dart.

## Features

- 📱 Mobile-first design with touch-friendly interactions
- 🎨 Modern UI with clean components and smooth animations
- 📅 Month, Week, and Day toggle above the calendar
- 🧭 Onboarding flow with Google Calendar connect, invites, and summary
- 💾 Local storage for events via shared_preferences
- 🌐 Web dev target for quick iteration

## Getting Started

### Prerequisites
- Flutter SDK (3.35.x recommended)
- Dart SDK (3.9.x)
- **For macOS/iOS development:** Xcode + CocoaPods (`brew install cocoapods`)
- **For Android development:** Android Studio
- **For web development:** Chrome browser (recommended for testing)
- **For Windows development:** Visual Studio with C++ tools

### Install and run
```bash
# Install dependencies
flutter pub get

# For macOS/iOS: Install CocoaPods dependencies
cd macos && pod install && cd ..

# Run on your preferred platform
flutter run -d chrome      # Web (Chrome)
flutter run -d macos        # macOS desktop
flutter run -d windows      # Windows desktop
flutter run                 # Auto-select available device
```

## Project Structure
```
lib/
├── main.dart                 # App entry
├── providers/
│   └── event_provider.dart   # State for events
├── screens/
│   ├── landing_screen.dart   # Marketing/landing
│   ├── onboarding_screen.dart# Onboarding flow
│   └── calendar_screen.dart  # Calendar UI
└── widgets/
    ├── event_list.dart       # Schedule list
    └── add_event_dialog.dart # Create/edit event
```

## Notable UX
- Landing page uses your icon at icons/Calendar_Icon_wood.png
- Onboarding steps are scroll-safe on small screens
- Invite flow advances correctly and uses the global footer wisely
- Calendar view toggle is centered; double-tap a date to open full-day details

## Build
```bash
# Web
flutter build web --release

# macOS
flutter build macos --release

# Windows
flutter build windows --release

# Android
flutter build apk --release

# iOS
flutter build ios --release
```

## Cross-Platform Development (Windows & macOS)

This project is designed to work seamlessly on both Windows and macOS development environments:

### Shared Configuration
- ✅ All source code in `lib/` works identically on both platforms
- ✅ Dependencies in `pubspec.yaml` are cross-platform compatible
- ✅ `.gitignore` configured to exclude platform-specific build artifacts
- ✅ Git-friendly: Safe to push/pull between Windows and macOS machines

### Platform-Specific Setup

**On macOS:**
```bash
brew install cocoapods
cd macos && pod install && cd ..
flutter run -d macos  # or -d chrome
```

**On Windows:**
```bash
# Ensure Visual Studio with C++ tools is installed
flutter run -d windows  # or -d chrome
```

### Development Tips
- Use `flutter run -d chrome` for fastest cross-platform testing
- Hot reload (`r` key) works on all platforms
- Run `flutter doctor` to verify your platform setup
- All team members can work on the same codebase regardless of OS

## Testing
```bash
flutter test              # Run all tests
flutter analyze           # Check code quality
```

## License
MIT
