# 🚀 How to Run Your Flutter Calendar App

## Quick Start (Easiest Way!)

### **Double-Click to Launch:**
1. Open Finder
2. Go to: `Documents → GitHub → calendar_app`
3. **Double-click:** `launch_flutter.command`
4. Choose option 1 (Chrome) or 2 (macOS)
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
- Contact Permission: http://localhost:3000/#/contact-permission
- Add Method: http://localhost:3000/#/add-contacts-method

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

## 🎯 Quick Commands Cheat Sheet

```bash
# Navigate to project
cd /Users/zackstewart/Documents/GitHub/calendar_app

# Install dependencies (if needed)
flutter pub get

# Run on Chrome
flutter run -d chrome --web-port 3000

# Run on macOS
flutter run -d macos

# Check what devices are available
flutter devices

# Check Flutter setup
flutter doctor

# Run tests
flutter test

# Build for production
flutter build web
flutter build macos
```

