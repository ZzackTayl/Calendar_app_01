# How to Complete Localization Migration

## ✅ Current Status
- **4 screens migrated** (auth, calendar, dashboard, notifications)
- **46 strings** in ARB files
- **All migrated screens compile successfully**
- **2 screens remaining** (onboarding, settings)

---

## 🔧 Fix onboarding_screen.dart (Priority: HIGH)

### The Problem
Contains Unicode curly quote (') instead of straight apostrophe (')

### The Solution (5 minutes)

**Step 1: Fix the Unicode quote**
```bash
cd /Users/zackstewart/Documents/GitHub/calendar_app

python3 << 'EOF'
with open('lib/ui/screens/onboarding_screen.dart', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Unicode curly quote with straight apostrophe
content = content.replace('\u2019', "'")

with open('lib/ui/screens/onboarding_screen.dart', 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ Fixed Unicode quote")
EOF
```

**Step 2: Add the import** (in your IDE)
After line 6 (`import '../../core/theme_constants.dart';`), add:
```dart
import '../../l10n/app_localizations.dart';
```

**Step 3: Replace the 7 hard-coded strings**

The ARB keys are already created. Just replace these:

| Line | Old Code | New Code |
|------|----------|----------|
| 250 | `Text('Back', style: textStyle)` | `Text(AppLocalizations.of(context).onboardingBackButton, style: textStyle)` |
| 255 | `Text('Skip', style: secondaryStyle)` | `Text(AppLocalizations.of(context).onboardingSkipButton, style: secondaryStyle)` |
| 503 | `const Text('Invite connections now')` | `Text(AppLocalizations.of(context).onboardingInviteNow)` |
| 510 | `const Text('I'll do this later')` | `Text(AppLocalizations.of(context).onboardingInviteLater)` |
| 621 | `const Text('Continue')` | `Text(AppLocalizations.of(context).onboardingContinueButton)` |
| 720 | `const Text('Skip invites for now')` | `Text(AppLocalizations.of(context).onboardingSkipInvites)` |
| 748 | `const Text('Continue')` | `Text(AppLocalizations.of(context).onboardingContinueButton)` |

**Step 4: Verify**
```bash
flutter analyze lib/ui/screens/onboarding_screen.dart
```

---

## 🔧 Migrate settings_screen.dart (Priority: MEDIUM)

### The Strings (13 total)

**Step 1: Add strings to ARB files**

Add these to both `lib/l10n/app_en.arb` and `lib/l10n/app_en_US.arb`:

```json
  "settingsDataExportPlaceholder": "Data export options will be available later.",
  "@settingsDataExportPlaceholder": {
    "description": "Placeholder message for data export feature."
  },
  "settingsDiscordPlaceholder": "Discord invite link will be added soon.",
  "@settingsDiscordPlaceholder": {
    "description": "Placeholder message for Discord integration."
  },
  "settingsSupportPlaceholder": "Support messaging will be wired up next.",
  "@settingsSupportPlaceholder": {
    "description": "Placeholder message for support messaging."
  },
  "settingsLoadingCalendars": "Loading calendars...",
  "@settingsLoadingCalendars": {
    "description": "Message shown while loading calendars."
  },
  "settingsFailedLoadCalendars": "Failed to load calendars",
  "@settingsFailedLoadCalendars": {
    "description": "Error message when calendars fail to load."
  },
  "settingsDeleteAccountTitle": "Delete account?",
  "@settingsDeleteAccountTitle": {
    "description": "Dialog title for account deletion confirmation."
  },
  "settingsCancelButton": "Cancel",
  "@settingsCancelButton": {
    "description": "Generic cancel button label."
  },
  "settingsDeleteAccountButton": "Delete account",
  "@settingsDeleteAccountButton": {
    "description": "Button label to confirm account deletion."
  },
  "settingsDoneButton": "Done",
  "@settingsDoneButton": {
    "description": "Done button label."
  },
  "settingsCalendarVisibilityTitle": "Calendar Visibility",
  "@settingsCalendarVisibilityTitle": {
    "description": "Dialog title for calendar visibility settings."
  },
  "settingsApplyButton": "Apply",
  "@settingsApplyButton": {
    "description": "Button label to apply changes."
  }
```

**Step 2: Regenerate**
```bash
flutter gen-l10n
```

**Step 3: Add import to settings_screen.dart**

Check if it already has:
```dart
import '../../l10n/app_localizations.dart';
```

If not, add it.

**Step 4: Replace hard-coded strings**

Use find-replace in your IDE with these patterns:
- `'Data export options will be available later.'` → `AppLocalizations.of(context).settingsDataExportPlaceholder`
- `'Discord invite link will be added soon.'` → `AppLocalizations.of(context).settingsDiscordPlaceholder`
- `'Support messaging will be wired up next.'` → `AppLocalizations.of(context).settingsSupportPlaceholder`
- `'Loading calendars...'` → `AppLocalizations.of(context).settingsLoadingCalendars`
- `'Failed to load calendars'` → `AppLocalizations.of(context).settingsFailedLoadCalendars`
- `'Delete account?'` → `AppLocalizations.of(context).settingsDeleteAccountTitle`
- `'Delete account'` → `AppLocalizations.of(context).settingsDeleteAccountButton`
- `'Done'` → `AppLocalizations.of(context).settingsDoneButton`
- `"Calendar Visibility"` → `AppLocalizations.of(context).settingsCalendarVisibilityTitle`
- `"Apply"` → `AppLocalizations.of(context).settingsApplyButton`

For "Cancel", use: `AppLocalizations.of(context).settingsCancelButton`

**Step 5: Verify**
```bash
flutter analyze lib/ui/screens/settings_screen.dart
```

---

## 🎯 Testing Checklist

After completing both screens:

```bash
# 1. Regenerate localizations
flutter gen-l10n

# 2. Analyze all 6 Phase 1 screens
flutter analyze \
  lib/ui/screens/auth_screen.dart \
  lib/ui/screens/calendar_screen.dart \
  lib/ui/screens/dashboard_screen.dart \
  lib/ui/screens/notifications_screen.dart \
  lib/ui/screens/onboarding_screen.dart \
  lib/ui/screens/settings_screen.dart

# 3. Run tests
flutter test

# 4. Build and run app
flutter run
```

### Manual Testing
1. **Auth Flow**
   - Sign up form labels
   - Error messages
   - Button text

2. **Onboarding Flow**
   - All button labels
   - Choice chip text
   - Navigation buttons

3. **Calendar Screen**
   - "Today" button
   - "Cancel Signal" dialog
   - "Create event" menu

4. **Dashboard**
   - "Share availability" button

5. **Notifications**
   - "Notifications cleared" snackbar
   - "OK" button

6. **Settings**
   - All placeholder messages
   - Dialog titles
   - Button labels

---

## 🌍 Adding a New Language (After Phase 1)

Once all screens are migrated:

```bash
# 1. Copy English ARB
cp lib/l10n/app_en.arb lib/l10n/app_es.arb

# 2. Edit app_es.arb
# - Change @@locale from "en" to "es"
# - Translate all string values (keep keys unchanged)

# 3. Regenerate
flutter gen-l10n

# 4. Test
# Device language set to Spanish will automatically use Spanish strings
```

### Example Spanish Translations
```json
{
  "@@locale": "es",
  "appTitle": "MyOrbit",
  "authWelcomeTitle": "Bienvenido a MyOrbit",
  "authSignInButton": "Iniciar sesión",
  "authCreateAccountButton": "Crear cuenta",
  "calendarTodayButton": "Hoy",
  ...
}
```

---

## 📊 Progress Tracking

| Screen | Status | Strings | Notes |
|--------|--------|---------|-------|
| auth_screen.dart | ✅ | 30 | Done |
| calendar_screen.dart | ✅ | 11 | Done |
| dashboard_screen.dart | ✅ | 2 | Done |
| notifications_screen.dart | ✅ | 3 | Done |
| **onboarding_screen.dart** | ⚠️ | 7 | **Fix Unicode quote first** |
| **settings_screen.dart** | ⏳ | 13 | **Add ARB keys** |

**Total: 4/6 screens complete (67%)**

---

## 🚨 Common Issues

### "AppLocalizations not found"
```bash
# Solution: Regenerate localization files
flutter gen-l10n
```

### "The getter 'xxx' isn't defined"
```bash
# Solution: Check ARB file has the key, then regenerate
flutter gen-l10n
```

### Unicode Quote Errors
```python
# Fix with Python
python3 << 'EOF'
with open('path/to/file.dart', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('\u2019', "'")  # Right single quote
content = content.replace('\u2018', "'")  # Left single quote  
content = content.replace('\u201c', '"')  # Left double quote
content = content.replace('\u201d', '"')  # Right double quote
with open('path/to/file.dart', 'w', encoding='utf-8') as f:
    f.write(content)
EOF
```

### Locale Not Showing Up
Check `lib/l10n/app_localizations.dart`:
```dart
static const List<Locale> supportedLocales = <Locale>[
  Locale('en'),
  Locale('en', 'US'),  // Should be here
];
```

---

## 📞 Need Help?

Refer to the best practices guide:
```
/Users/zackstewart/Documents/GitHub/calendar_app/Resources_For_Agents/Localization/localization_best_practices.md
```

Or check Flutter's official documentation:
https://docs.flutter.dev/development/accessibility-and-localization/internationalization

---

**Last Updated:** $(date)
**Migration Status:** Phase 1 - 67% Complete (4/6 screens)
