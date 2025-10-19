## 🚀 How to Run Your Sophisticated Privacy-First Calendar App

## Quick Start (Easiest Way!)

### **On Mac - Double-Click to Launch:**
1. Open Finder
2. Go to: `Documents → GitHub → calendar_app`
3. **Double-click:** `launch_flutter.command`
4. Choose option 1 (Chrome) or 2 (macOS)
5. Your app will open automatically! 🎉

### **On Windows - Double-Click to Launch:**
1. Open File Explorer
2. Go to: `Documents → GitHub → calendar_app`
3. **Double-click:** `launcher.bat`
4. Choose option 1 (Chrome) or 2 (Windows)
5. Your app will open automatically! 🎉

---

## Manual Way (Terminal)

### **For Web (Chrome):**
```bash
cd /Users/zackstewart/Documents/GitHub/calendar_app
flutter run -d chrome --web-port 3000
```
Then open: http://localhost:3000

### **For macOS Desktop:**
```bash
cd /Users/zackstewart/Documents/GitHub/calendar_app
flutter run -d macos
```

---

## 🎮 Controls While Running

Once Flutter is running, use these keys in Terminal:

| Key | Action |
|-----|--------|
| `r` | **Hot Reload** - Refresh to see code changes instantly |
| `R` | **Hot Restart** - Full app restart |
| `q` | **Quit** - Stop the app |
| `h` | **Help** - See all available commands |
| `c` | **Clear** - Clear the terminal screen |

---

## 🔧 Common Issues & Fixes

### ❌ "Flutter command not found"
→ Make sure Flutter is installed: https://flutter.dev/docs/get-started/install

### ❌ "Port 3000 already in use"
→ The launcher now handles this automatically!
→ Or manually: Find Chrome/Terminal with Flutter running and press `q`
→ Or run: `lsof -ti:3000 | xargs kill -9`

### ❌ Changes not showing
→ Press `r` in Terminal to hot reload

### ❌ App looks broken
→ Press `R` (capital R) for a full restart

---

## 📁 Project URLs

**Web (Chrome):**
- Main: http://localhost:3000
- Landing: http://localhost:3000/#/landing
- Onboarding: http://localhost:3000/#/onboarding

> **Note:** The legacy contact-permission demo screens are no longer wired into `createAppRouter`. If you still need to preview them, temporarily add routes for `/contact-permission` and `/add-contacts-method` in `lib/main.dart` or push the widgets manually from a debug button.

---

## 💡 Development Tips

1. **Keep Terminal open** while developing
2. **Save your files** in VS Code/Cursor → Changes auto-reload
3. **Press `r`** if changes don't show immediately
4. **Use Chrome** for fastest development iteration
5. **Test on macOS** for final native experience

---

## 🆘 Need Help?

- Check README.md for full documentation
- See CONTACTS_FLOW.md for contact feature details
- All code is in the `lib/` folder

---

## 🌟 Key Features to Explore

Once running, you can explore these sophisticated features:
- **Availability Signals**: Share your availability with different contacts at different permission levels
- **Privacy Controls**: 3-tier contact permissions (Private/Semi-Visible/Visible) with 3-tier event privacy (Normal/Exclusive/Super Exclusive)
- **Smart Recurrence**: Events with intelligent recurrence patterns and AI suggestions
- **Conflict Resolution**: Automatic detection and resolution of conflicts between events and availability signals
- **Multi-calendar Support**: Manage multiple calendars with visibility toggling
- **Timezone Management**: Full timezone support with user-configurable settings
- **Buffer Management**: Configurable buffers around events to protect availability signals

## 📌 Platform-Specific Information

### **Mac Developers**
- Use the `launch_flutter.command` file to run the app
- The `ios/` folder contains Mac/iPhone specific code
- You have full access to all project folders

### **Windows Developers**
- Use the `launcher.bat` file to run the app
- **⚠️ Important:** Do NOT modify the `ios/` folder - it contains Mac-only code and will not work on Windows
- The `windows/` folder contains Windows specific code
- You can modify shared code in the `lib/` folder without any issues

## 🎯 Quick Commands Cheat Sheet

```bash
# Navigate to project
cd /Users/zackstewart/Documents/GitHub/calendar_app

# Install dependencies (if needed)
flutter pub get

# Run on Chrome (works on Mac and Windows)
flutter run -d chrome --web-port 3000

# Run on macOS (Mac only)
flutter run -d macos

# Run on Windows (Windows only)
flutter run -d windows

# Check what devices are available
flutter devices

# Check Flutter setup
flutter doctor

# Run tests (works on both Mac and Windows)
flutter test

# Build for production (Mac)
flutter build web
flutter build macos

# Build for production (Windows)
flutter build web
flutter build windows
```
