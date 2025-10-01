#!/bin/bash

# Flutter Calendar App Launcher
# Double-click this file to run your app

echo "🚀 Starting Flutter Calendar App..."
echo ""

# Navigate to project directory
cd "$(dirname "$0")"

# Check if Flutter is installed
if ! command -v flutter &> /dev/null; then
    echo "❌ Flutter is not installed or not in PATH"
    echo "Please install Flutter first: https://flutter.dev/docs/get-started/install"
    read -p "Press Enter to exit..."
    exit 1
fi

# Show Flutter version
echo "✅ Flutter found!"
flutter --version | head -1
echo ""

# Ask user which platform to run
echo "Choose where to run your app:"
echo "1) Chrome (Web) - Fastest for testing"
echo "2) macOS Desktop App"
echo ""
read -p "Enter choice (1 or 2): " choice

case $choice in
    1)
        echo ""
        echo "🌐 Launching in Chrome..."
        echo "📍 URL will be: http://localhost:3000"
        echo ""
        
        # Check if port 3000 is in use and free it
        if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
            echo "⚠️  Port 3000 is already in use. Stopping existing app..."
            lsof -ti:3000 | xargs kill -9 2>/dev/null
            sleep 1
            echo "✅ Port freed!"
            echo ""
        fi
        
        echo "💡 Tip: Press 'r' to hot reload, 'q' to quit"
        echo ""
        flutter run -d chrome --web-port 3000
        ;;
    2)
        echo ""
        echo "🖥️  Launching macOS Desktop App..."
        echo ""
        echo "💡 Tip: Press 'r' to hot reload, 'q' to quit"
        echo ""
        flutter run -d macos
        ;;
    *)
        echo "Invalid choice. Exiting..."
        sleep 2
        exit 1
        ;;
esac

echo ""
echo "👋 App closed. Thanks for using Flutter Calendar App!"
read -p "Press Enter to close this window..."

