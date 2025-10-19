@echo off
REM Flutter Calendar App Launcher for Windows
REM Double-click this file to run your app

echo.
echo 🚀 Starting Flutter Calendar App...
echo.

REM Navigate to project directory
cd /d "%~dp0"

REM Check if Flutter is installed
where flutter >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Flutter is not installed or not in PATH
    echo Please install Flutter first: https://flutter.dev/docs/get-started/install
    echo.
    pause
    exit /b 1
)

REM Show Flutter version
echo ✅ Flutter found!
flutter --version
echo.

REM Ask user which platform to run
echo Choose where to run your app:
echo 1) Chrome (Web) - Fastest for testing
echo 2) Windows Desktop App
echo.
set /p choice="Enter choice (1 or 2): "

if "%choice%"=="1" (
    echo.
    echo 🌐 Launching in Chrome...
    echo 📍 URL will be: http://localhost:3000
    echo.
    
    REM Check if port 3000 is in use and kill it
    for /f "tokens=5" %%a in ('netstat -ano ^| find ":3000"') do taskkill /pid %%a /f 2>nul
    timeout /t 1 /nobreak
    echo ✅ Port 3000 is ready!
    echo.
    
    echo 💡 Tip: Press 'r' to hot reload, 'q' to quit
    echo.
    flutter run -d chrome --web-port 3000
) else if "%choice%"=="2" (
    echo.
    echo 🖥️  Launching Windows Desktop App...
    echo.
    echo 💡 Tip: Press 'r' to hot reload, 'q' to quit
    echo.
    flutter run -d windows
) else (
    echo Invalid choice. Exiting...
    timeout /t 2 /nobreak
    exit /b 1
)

echo.
echo 👋 App closed. Thanks for using Flutter Calendar App!
pause
