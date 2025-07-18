#!/bin/bash

# Export NVM directory
export NVM_DIR="$HOME/.nvm"
# Load NVM
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use the Node.js version specified in .nvmrc
nvm use

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  yarn install
fi

# Set environment variables to skip Metro bundler
export RCT_NO_BUNDLE=true
export RCT_NO_LAUNCH_PACKAGER=true

# Generate a bundle manually for Android
echo "Generating bundle for Android..."
mkdir -p android/app/src/main/assets
react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/

# Build the Android APK
echo "Building Android APK..."
cd android && ./gradlew assembleDebug

echo "Build completed! APK available at android/app/build/outputs/apk/debug/app-debug.apk"
