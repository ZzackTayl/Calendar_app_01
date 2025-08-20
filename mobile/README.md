# PolyHarmony Mobile App

This directory contains the React Native mobile application for PolyHarmony, providing a native mobile experience for the calendar application.

## 📱 **Overview**

The PolyHarmony mobile app is built with React Native and provides:
- **Native mobile experience** for iOS and Android
- **Offline-first architecture** with local data persistence
- **Synchronization** with the web application when connected
- **Touch-optimized interface** for mobile users
- **Push notifications** for event reminders

## 🏗️ **Architecture**

### Tech Stack
- **React Native** - Cross-platform mobile development
- **Expo** - Development and build tools
- **Supabase** - Backend services (authentication, database)
- **AsyncStorage** - Local data persistence
- **React Navigation** - Screen navigation
- **React Native Elements** - UI components

### Project Structure
```
mobile/
├── App.tsx                 # Main application component
├── app.json               # Expo configuration
├── assets/                # Images, icons, and static files
├── lib/                   # Core utilities and configurations
│   ├── AuthContext.tsx    # Authentication context
│   ├── supabase.ts        # Supabase client configuration
│   └── types.ts           # TypeScript type definitions
├── components/            # Reusable UI components
├── screens/               # Application screens
├── navigation/            # Navigation configuration
└── utils/                 # Utility functions
```

## 🚀 **Quick Start**

### Prerequisites
- **Node.js** 18+ and npm
- **Expo CLI**: `npm install -g @expo/cli`
- **iOS Simulator** (macOS) or **Android Emulator**
- **Expo Go** app on your mobile device (for testing)

### Installation
```bash
cd mobile
npm install
```

### Development
```bash
# Start Expo development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web (for testing)
npm run web
```

### Building
```bash
# Build for iOS
npm run build:ios

# Build for Android
npm run build:android

# Build for both platforms
npm run build
```

## 🔧 **Configuration**

### Environment Variables
Create `.env.local` in the mobile directory:
```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Expo Configuration
The `app.json` file contains:
- **App metadata** (name, version, description)
- **Platform-specific settings** for iOS and Android
- **Permissions** required by the app
- **Build configuration** for different environments

## 📱 **Features**

### Core Functionality
- **Calendar View** - Month, week, and day views
- **Event Management** - Create, edit, and delete events
- **Relationship Management** - Manage partner relationships
- **Privacy Controls** - Granular privacy settings
- **Offline Support** - Work without internet connection

### Mobile-Specific Features
- **Touch Gestures** - Swipe, pinch, and tap interactions
- **Push Notifications** - Event reminders and updates
- **Background Sync** - Data synchronization when app is backgrounded
- **Deep Linking** - Direct navigation to specific content
- **Biometric Authentication** - Fingerprint and face ID support

## 🔄 **Synchronization**

### Data Flow
1. **Local Changes** - Stored in AsyncStorage
2. **Sync Queue** - Changes queued for synchronization
3. **Background Sync** - Automatic sync when online
4. **Conflict Resolution** - Handle conflicting changes
5. **Data Consistency** - Ensure data integrity

### Offline Strategy
- **Local First** - All operations work offline
- **Queue Changes** - Store changes for later sync
- **Smart Sync** - Sync only changed data
- **Conflict Detection** - Identify and resolve conflicts
- **Data Validation** - Ensure data integrity

## 🧪 **Testing**

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

### Manual Testing
- **iOS Simulator** - Test iOS-specific features
- **Android Emulator** - Test Android-specific features
- **Physical Devices** - Test on real devices
- **Expo Go** - Quick testing without building

## 📦 **Deployment**

### App Store (iOS)
1. **Build Production** - `npm run build:ios`
2. **Upload to App Store Connect**
3. **Submit for Review**
4. **Release to Users**

### Google Play Store (Android)
1. **Build Production** - `npm run build:android`
2. **Upload to Google Play Console**
3. **Submit for Review**
4. **Release to Users**

### Over-the-Air Updates
- **Expo Updates** - Push updates without app store approval
- **Staging Channel** - Test updates before production
- **Rollback Support** - Quickly revert problematic updates

## 🔍 **Troubleshooting**

### Common Issues

#### Build Failures
```bash
# Clear cache
expo r -c

# Reset Metro bundler
npm start -- --reset-cache
```

#### Runtime Errors
- Check console logs in Expo DevTools
- Verify environment variables
- Check Supabase connection
- Validate data formats

#### Performance Issues
- Enable performance monitoring
- Check bundle size
- Optimize images and assets
- Review component rendering

### Debug Tools
- **Expo DevTools** - Development and debugging
- **React Native Debugger** - Advanced debugging
- **Flipper** - Platform-specific debugging
- **Performance Monitor** - Performance analysis

## 📚 **Documentation**

### Related Documentation
- [Main README](../README.md) - Project overview
- [Setup Guide](../docs/SETUP_GUIDE.md) - Development setup
- [Technical Stack](../docs/TECH_STACK.md) - Technology decisions
- [Mobile Migration Guide](../docs/MOBILE_MIGRATION_GUIDE.md) - Migration details

### External Resources
- [React Native Documentation](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [Supabase Documentation](https://supabase.com/docs)

## 🤝 **Contributing**

### Development Workflow
1. **Create Feature Branch** - `git checkout -b feature/mobile-feature`
2. **Make Changes** - Follow React Native best practices
3. **Test Thoroughly** - On both iOS and Android
4. **Submit PR** - Include screenshots and testing notes

### Code Standards
- **TypeScript** - Use strict typing
- **ESLint** - Follow linting rules
- **Prettier** - Consistent code formatting
- **Component Structure** - Follow established patterns

## 🗓️ **Roadmap**

### Planned Features
- [ ] **Offline Calendar Sync** - Full offline support
- [ ] **Push Notifications** - Event reminders
- [ ] **Widgets** - Home screen calendar widget
- [ ] **Apple Watch** - Watch app integration
- [ ] **Android Wear** - Wear OS support

### Performance Improvements
- [ ] **Bundle Optimization** - Reduce app size
- [ ] **Lazy Loading** - Load components on demand
- [ ] **Image Optimization** - Compress and cache images
- [ ] **Memory Management** - Optimize memory usage

---

**Last Updated**: December 2024  
**Maintained by**: PolyHarmony Mobile Team
