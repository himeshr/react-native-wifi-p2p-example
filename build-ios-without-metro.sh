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

# Generate a bundle manually for iOS
echo "Generating bundle for iOS..."
mkdir -p ios/bundle
react-native bundle --platform ios --dev false --entry-file index.js --bundle-output ios/bundle/main.jsbundle --assets-dest ios/bundle

# Build the iOS app
echo "Building iOS app..."
cd ios && pod install && cd ..
xcodebuild -workspace ios/wifip2pexample.xcworkspace -scheme wifip2pexample -configuration Release -sdk iphonesimulator

echo "iOS build completed!"
