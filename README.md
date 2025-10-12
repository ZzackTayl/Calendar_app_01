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
- Xcode for iOS, Android Studio for Android (optional if running web only)

### Install and run
```bash
flutter pub get
flutter run          # choose a device or -d chrome for web
```

To run on web explicitly:
```bash
flutter run -d chrome
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
# Android
flutter build apk --release

# iOS
flutter build ios --release

# Web
flutter build web
```

## License
MIT
