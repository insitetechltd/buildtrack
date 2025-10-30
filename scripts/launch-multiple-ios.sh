#!/bin/bash

# Launch Multiple iOS Simulators with Expo Go
# Usage: ./scripts/launch-multiple-ios.sh [number_of_simulators]

set -e

# Configuration
EXPO_GO_APP="/Users/tristan/Desktop/BuildTrack/ExpoGo-SDK54.app"
DEFAULT_COUNT=2

# Get number of simulators to launch (default 2)
COUNT=${1:-$DEFAULT_COUNT}

echo "🚀 Launching $COUNT iOS simulators with Expo Go..."
echo ""

# Get list of available iPhone simulators
SIMULATORS=($(xcrun simctl list devices available | grep "iPhone" | grep -v "Network" | awk -F '[()]' '{print $2}'))

if [ ${#SIMULATORS[@]} -lt $COUNT ]; then
    echo "⚠️  Only ${#SIMULATORS[@]} simulators available, but you requested $COUNT"
    COUNT=${#SIMULATORS[@]}
fi

# Boot and setup simulators
BOOTED_SIMULATORS=()
for ((i=0; i<$COUNT; i++)); do
    DEVICE_ID="${SIMULATORS[$i]}"
    DEVICE_NAME=$(xcrun simctl list devices | grep "$DEVICE_ID" | awk -F '[()]' '{print $1}' | xargs)
    
    echo "📱 Setting up: $DEVICE_NAME ($DEVICE_ID)"
    
    # Boot the simulator if not already booted
    STATUS=$(xcrun simctl list devices | grep "$DEVICE_ID" | grep -o "(Booted)\|(Shutdown)")
    if [ "$STATUS" == "(Shutdown)" ]; then
        echo "   ⏳ Booting simulator..."
        xcrun simctl boot "$DEVICE_ID" 2>/dev/null || true
        sleep 2
    else
        echo "   ✅ Already booted"
    fi
    
    # Install Expo Go if not already installed
    if ! xcrun simctl listapps "$DEVICE_ID" | grep -q "host.exp.Exponent"; then
        echo "   📦 Installing Expo Go..."
        xcrun simctl install "$DEVICE_ID" "$EXPO_GO_APP"
    else
        echo "   ✅ Expo Go already installed"
    fi
    
    BOOTED_SIMULATORS+=("$DEVICE_ID")
done

# Open Simulator app
echo ""
echo "🖥️  Opening Simulator app..."
open -a Simulator

sleep 3

# Launch Expo Go on all simulators
echo ""
echo "📲 Launching Expo Go on all simulators..."
for DEVICE_ID in "${BOOTED_SIMULATORS[@]}"; do
    xcrun simctl launch "$DEVICE_ID" host.exp.Exponent > /dev/null 2>&1 || true
done

sleep 2

# Start Expo dev server if not already running
if ! lsof -i :8081 > /dev/null 2>&1; then
    echo ""
    echo "🔧 Starting Expo dev server..."
    echo "   Run: npx expo start"
    echo ""
    echo "   Then connect each simulator using:"
    
    # Get local IP
    LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
    echo "   URL: exp://${LOCAL_IP}:8081"
    echo ""
    
    # Optionally auto-connect
    read -p "Would you like to auto-connect all simulators now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        for DEVICE_ID in "${BOOTED_SIMULATORS[@]}"; do
            xcrun simctl openurl "$DEVICE_ID" "exp://${LOCAL_IP}:8081" || true
        done
        echo "✅ Connected all simulators to Expo dev server"
    fi
else
    echo ""
    echo "✅ Expo dev server is already running"
    LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
    
    # Auto-connect all simulators
    echo "🔗 Connecting all simulators to exp://${LOCAL_IP}:8081"
    for DEVICE_ID in "${BOOTED_SIMULATORS[@]}"; do
        xcrun simctl openurl "$DEVICE_ID" "exp://${LOCAL_IP}:8081" || true
    done
    echo "✅ All simulators connected"
fi

echo ""
echo "🎉 Done! You now have $COUNT iOS simulators running with Expo Go"
echo ""
echo "Simulators launched:"
for ((i=0; i<${#BOOTED_SIMULATORS[@]}; i++)); do
    DEVICE_ID="${BOOTED_SIMULATORS[$i]}"
    DEVICE_NAME=$(xcrun simctl list devices | grep "$DEVICE_ID" | awk -F '[()]' '{print $1}' | xargs)
    echo "  $((i+1)). $DEVICE_NAME"
done

