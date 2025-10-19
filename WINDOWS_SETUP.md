# Windows Developer Setup Guide

## Welcome! 👋

This is a Flutter app that runs on multiple platforms. You're on Windows, and everything has been set up to make your workflow identical to the Mac developers.

---

## Your First Time Running the App

### **Super Easy Way (Recommended)**
1. Open File Explorer
2. Go to: `Documents\GitHub\calendar_app`
3. **Double-click:** `launcher.bat`
4. Choose option `1` (Chrome - fastest) or `2` (Windows app)
5. The app opens automatically! 🎉

### **Or From Terminal (if you prefer)**
```bash
cd Documents\GitHub\calendar_app
flutter run -d chrome --web-port 3000
```

---

## How to Use Once It's Running

When the app is running in Terminal, you can use these keys:

| Key | What it does |
|-----|--------------|
| `r` | **Hot Reload** - Refresh to see your code changes instantly |
| `R` | **Hot Restart** - Full app restart |
| `q` | **Quit** - Stop the app |

---

## Where to Make Changes

### ✅ **You CAN modify these:**
- **`lib/` folder** - This is shared code that runs on all platforms (Mac, Windows, Web)
  - This is where 99% of your changes go
  - Changes here work on Mac AND Windows

### ⚠️ **DO NOT modify these:**
- **`ios/` folder** - This is Mac/iPhone specific code
  - It won't work on Windows at all
  - If you see it, ignore it
  - Leave it alone

### ℹ️ **Reference only:**
- **`windows/` folder** - Windows specific configuration (you probably won't need to touch this)
- **`android/` folder** - Android specific configuration (leave it alone)

---

## Common Tasks

### Running the App
```bash
# Web (Chrome) - fastest for development
flutter run -d chrome --web-port 3000

# Windows desktop app
flutter run -d windows
```

### Running Tests
```bash
# All tests
flutter test

# Quick test (fast subset)
make test-quick

# With coverage report
make coverage
```

### Checking Your Setup
```bash
# Verify Flutter is installed correctly
flutter doctor

# See available devices/platforms
flutter devices
```

---

## Troubleshooting

### "Flutter command not found"
→ You need to install Flutter: https://flutter.dev/docs/get-started/install

### "Port 3000 already in use"
→ The launcher handles this automatically
→ Or manually: Close Chrome/PowerShell running Flutter and try again

### "Changes aren't showing up"
→ Press `r` in Terminal to hot reload
→ If that doesn't work, press `R` (capital R) for full restart

### "Something is broken"
→ In Terminal: Press `q` to stop the app
→ Run: `flutter clean`
→ Then run the app again

---

## Key Difference: Windows vs Mac

**You have Windows (more powerful):**
- Use `launcher.bat` to start
- Run `flutter run -d windows` for Windows app
- Run `flutter run -d chrome` for web (works on both)
- **Don't touch the `ios/` folder**

**Your Mac colleague has a Mac (portable):**
- Uses `launch_flutter.command` to start
- Can also use web version
- Has access to iOS build (you don't need it)

**Both of you:**
- Edit the same code in `lib/` folder
- Run the same tests
- Push/pull from same Git repository
- Everything "just works"

---

## That's It! 🚀

You're all set. The hard part is already done. Just:
1. Double-click `launcher.bat`
2. Make changes in `lib/` folder
3. Press `r` to see changes
4. Don't touch `ios/` folder

Questions? Check `HOW_TO_RUN.md` for more detailed info.
