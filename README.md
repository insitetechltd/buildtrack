# BuildTrack

A comprehensive construction project management application built with React Native and Expo.

## Documentation

All project documentation has been organized in the `/documentation` folder:

- [README.md](./documentation/README.md) - Main project documentation
- [BUILD_SCRIPTS.md](./documentation/BUILD_SCRIPTS.md) - **Build scripts reference (START HERE)**
- [BUILD_ERRORS_SOLUTIONS.md](./documentation/BUILD_ERRORS_SOLUTIONS.md) - **Troubleshooting build errors**
- [PERFORMANCE_BACKEND.md](./documentation/PERFORMANCE_BACKEND.md) - **Backend performance fixes**
- [VERSION_NUMBERS_EXPLAINED.md](./documentation/VERSION_NUMBERS_EXPLAINED.md) - Understanding version numbers
- [ICON_CONFIGURATION.md](./documentation/ICON_CONFIGURATION.md) - App icon setup and troubleshooting
- [BUILD_CONFIGURATION.md](./documentation/BUILD_CONFIGURATION.md) - Build configuration details
- [DEPENDENCY_STATUS.md](./documentation/DEPENDENCY_STATUS.md) - Package dependencies and known issues
- [PERFORMANCE_OPTIMIZATION.md](./documentation/PERFORMANCE_OPTIMIZATION.md) - Performance tips
- [QUICK_BUILD_GUIDE.md](./documentation/QUICK_BUILD_GUIDE.md) - Quick reference for building the app
- [LOCAL_BUILD_GUIDE.md](./documentation/LOCAL_BUILD_GUIDE.md) - Detailed local build instructions
- [MIGRATION_SUMMARY.md](./documentation/MIGRATION_SUMMARY.md) - Migration notes and history

## Quick Start

```bash
# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm start

# Run on iOS
npx expo run:ios

# Build for production (locally)
./build-local.sh production ios

# Build and submit to TestFlight (auto-increments version!)
./build-and-submit.sh ios production

# Or just increment build number
./increment-build.sh
```

## Project Info

- **Bundle ID**: com.buildtrack.app.local
- **Expo SDK**: 54.0.0
- **React Native**: 0.81.5
- **React**: 19.1.0

For detailed documentation, please refer to the `/documentation` folder.

