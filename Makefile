# React Native WiFi P2P Example Makefile
# Provides convenient commands for building and running the app

# Set the default shell to bash
SHELL := /bin/bash

# Default target platform (can be overridden with PLATFORM=ios)
PLATFORM ?= android

# NVM setup
NVM_DIR ?= $(HOME)/.nvm
NVM_LOAD := . "$(NVM_DIR)/nvm.sh" && nvm use

# Android paths
ANDROID_APK := android/app/build/outputs/apk/debug/app-debug.apk

# iOS paths
IOS_APP := ios/build/Build/Products/Debug-iphonesimulator/wifip2pexample.app

.PHONY: clean_all deps build_app run_app deploy_app help clean_android clean_ios build_android build_ios run_android run_ios deploy_android deploy_ios

help:
	@echo "React Native WiFi P2P Example Makefile"
	@echo ""
	@echo "Available commands:"
	@echo "  make clean_all        - Clean all build artifacts"
	@echo "  make deps             - Install dependencies"
	@echo "  make build_app        - Build the app (default: android, use PLATFORM=ios for iOS)"
	@echo "  make run_app          - Run the app (default: android, use PLATFORM=ios for iOS)"
	@echo "  make deploy_app       - Deploy the app (default: android, use PLATFORM=ios for iOS)"
	@echo ""
	@echo "Platform-specific commands:"
	@echo "  make clean_android    - Clean Android build artifacts"
	@echo "  make clean_ios        - Clean iOS build artifacts"
	@echo "  make build_android    - Build Android app"
	@echo "  make build_ios        - Build iOS app"
	@echo "  make run_android      - Run Android app"
	@echo "  make run_ios          - Run iOS app"
	@echo "  make deploy_android   - Deploy Android app to connected device"
	@echo "  make deploy_ios       - Deploy iOS app to simulator/device"
	@echo ""
	@echo "Examples:"
	@echo "  make build_app PLATFORM=ios  - Build for iOS"
	@echo "  make run_app                 - Run on Android"

# Clean targets
clean_android:
	@echo "Cleaning Android build artifacts..."
	@cd android && ./gradlew clean
	@rm -rf android/app/build

clean_ios:
	@echo "Cleaning iOS build artifacts..."
	@rm -rf ios/build
	@cd ios && xcodebuild clean -workspace wifip2pexample.xcworkspace -scheme wifip2pexample -configuration Debug
	@rm -rf ios/bundle

clean_all: clean_android clean_ios
	@echo "Cleaning node_modules..."
	@rm -rf node_modules
	@rm -rf yarn.lock
	@echo "All build artifacts cleaned."

# Install dependencies
deps:
	@echo "Installing dependencies..."
	@$(NVM_LOAD) && yarn install
	@cd ios && pod install

# Build targets
build_android:
	@echo "Building Android app..."
	@mkdir -p android/app/src/main/assets
	@$(NVM_LOAD) && react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/
	@cd android && ./gradlew assembleDebug

build_ios:
	@echo "Building iOS app..."
	@mkdir -p ios/bundle
	@$(NVM_LOAD) && react-native bundle --platform ios --dev false --entry-file index.js --bundle-output ios/bundle/main.jsbundle --assets-dest ios/bundle
	@cd ios && xcodebuild -workspace wifip2pexample.xcworkspace -scheme wifip2pexample -configuration Debug -sdk iphonesimulator

build_app:
	@if [ "$(PLATFORM)" = "ios" ]; then \
		$(MAKE) build_ios; \
	else \
		$(MAKE) build_android; \
	fi

# Run targets
run_android:
	@echo "Running Android app..."
	@$(NVM_LOAD) && ENVFILE=.env.development react-native run-android --no-packager

run_ios:
	@echo "Running iOS app..."
	@$(NVM_LOAD) && ENVFILE=.env.development react-native run-ios --no-packager

run_app:
	@if [ "$(PLATFORM)" = "ios" ]; then \
		$(MAKE) run_ios; \
	else \
		$(MAKE) run_android; \
	fi

# Deploy targets
deploy_android: build_android
	@echo "Deploying Android app to device..."
	@adb install -r $(ANDROID_APK)
	@echo "App successfully deployed to Android device!"

deploy_ios: build_ios
	@echo "Deploying iOS app to simulator..."
	@xcrun simctl install booted $(IOS_APP)
	@echo "App successfully deployed to iOS simulator!"

deploy_app:
	@if [ "$(PLATFORM)" = "ios" ]; then \
		$(MAKE) deploy_ios; \
	else \
		$(MAKE) deploy_android; \
	fi

logs:
	@echo "Fetching logs..."
	@if [ "$(PLATFORM)" = "ios" ]; then \
		xcrun simctl spawn booted log stream --predicate 'eventMessage contains "wifip2pexample"'; \
	else \
		adb logcat -v time | grep -E 'React|WiFi|wifi|p2p|WIFI|P2P'; \
	fi

clear_logs:
	@echo "Clearing logs..."
	@if [ "$(PLATFORM)" = "ios" ]; then \
		xcrun simctl spawn booted log clear; \
	else \
		adb logcat -c; \
	fi
	@echo "Logs cleared."
