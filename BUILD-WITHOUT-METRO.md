# Building without Metro Bundler using NVM

This document explains how to build the React Native WiFi P2P example app using NVM and without relying on Metro bundler.

## Prerequisites

- NVM (Node Version Manager) installed
- Yarn package manager
- Android SDK and tools for Android builds
- Xcode and CocoaPods for iOS builds

## Configuration

The app has been configured to use Node.js version 16.20.0 as specified in the `.nvmrc` file. This version is compatible with React Native 0.70.4 and the react-native-wifi-p2p library.

## Building the App

### For Android

1. Run the build script:
   ```
   ./build-without-metro.sh
   ```

This script will:
- Use NVM to switch to the correct Node.js version
- Install dependencies if needed
- Generate a bundle manually without using Metro's development server
- Build the Android APK

The final APK will be available at: `android/app/build/outputs/apk/debug/app-debug.apk`

### For iOS

1. Run the iOS build script:
   ```
   ./build-ios-without-metro.sh
   ```

This script will:
- Use NVM to switch to the correct Node.js version
- Install dependencies if needed
- Generate a bundle manually without using Metro's development server
- Build the iOS app using xcodebuild

## How It Works

Instead of relying on Metro's development server to bundle JavaScript files at runtime, these scripts:
1. Set environment variables to disable Metro (`RCT_NO_BUNDLE=true` and `RCT_NO_LAUNCH_PACKAGER=true`)
2. Pre-bundle all JavaScript files into a single bundle file
3. Include this bundle file directly in the native app build

This approach allows you to build and deploy the app without needing Metro running, which is useful for CI/CD pipelines and production builds.

## Troubleshooting

If you encounter any issues with the build scripts:

1. Ensure NVM is properly installed and accessible
2. Verify that you have the required Node.js version (16.20.0) available in NVM
3. Make sure all dependencies are installed with `yarn install`
4. Check that your Android SDK or Xcode installations are properly configured
