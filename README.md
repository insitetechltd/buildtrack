# Insite App (BuildTrack)

This is a fresh copy of the BuildTrack application, migrated to resolve build and dependency issues.

## 🚀 Quick Start

### 1. Start the Development Server
```bash
npm start
```

This will start the Expo development server. You can then:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan the QR code with Expo Go app on your device

### 2. Run on iOS
```bash
npm run ios
```

### 3. Run on Android
```bash
npm run android
```

### 4. Run Tests
```bash
npm test
```

## 📋 Important Notes

### Environment Variables
Make sure to configure your `.env` file with the correct values:
- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- Other API keys as needed

### Known Issues
- Some duplicate dependencies detected (minor, won't affect functionality)
- Used `--legacy-peer-deps` during installation due to React version conflicts

### Project Structure
```
.
├── src/
│   ├── api/          # API services (Supabase, AI services)
│   ├── components/   # React components
│   ├── hooks/        # Custom hooks
│   ├── navigation/   # Navigation setup
│   ├── screens/      # Screen components
│   ├── services/     # Service modules
│   ├── state/        # Zustand state management
│   ├── types/        # TypeScript types
│   └── utils/        # Utility functions
├── assets/           # Static assets
├── App.tsx          # Root component
└── index.ts         # Entry point
```

## 📦 Tech Stack

- **Expo SDK 54** - React Native framework
- **React 19.1.0** - UI library
- **React Native 0.81.4** - Native mobile framework
- **TypeScript 5.8.3** - Type safety
- **Supabase** - Backend & database
- **Zustand** - State management
- **NativeWind** - Tailwind CSS for React Native
- **React Navigation** - Navigation
- **Jest** - Testing framework

## 🏗️ Building for Production

### Using EAS Build (Recommended)
```bash
# iOS
npx eas build --platform ios

# Android
npx eas build --platform android
```

### Local Build
```bash
# iOS
npx expo run:ios --configuration Release

# Android
npx expo run:android --variant release
```

## 📖 Documentation

For more detailed information, see `MIGRATION_SUMMARY.md`.

## 🆘 Troubleshooting

### Clear Cache
If you encounter issues:
```bash
# Clear Metro bundler cache
npx expo start --clear

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Clean Native Build
```bash
# iOS
cd ios && pod install && cd ..

# Android
cd android && ./gradlew clean && cd ..
```

## 📝 Available Scripts

- `npm start` - Start Expo development server
- `npm run ios` - Run on iOS
- `npm run android` - Run on Android
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run test:all` - Run all tests with coverage

---

**Note**: This is a clean installation with fresh dependencies. All source code has been preserved from the original BuildTrack project.

