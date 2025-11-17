#!/bin/bash

# ============================================
# Start Taskr App in Expo Go
# ============================================
# This script starts the development server for Expo Go
# ============================================

set -e

echo "🚀 Starting Taskr in Expo Go..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Clear cache option
if [ "$1" == "--clear" ] || [ "$1" == "-c" ]; then
    echo "🧹 Clearing cache..."
    npx expo start --clear
else
    echo "▶️  Starting development server..."
    echo ""
    echo "📱 To run on your device:"
    echo "   1. Install Expo Go from App Store (iOS) or Play Store (Android)"
    echo "   2. Scan the QR code that appears below"
    echo "   3. The app will load on your device"
    echo ""
    echo "💻 To run on simulator:"
    echo "   Press 'i' for iOS simulator"
    echo "   Press 'a' for Android emulator"
    echo ""
    echo "🔄 To reload:"
    echo "   Press 'r' in this terminal"
    echo ""
    echo "---"
    echo ""
    
    npx expo start
fi

