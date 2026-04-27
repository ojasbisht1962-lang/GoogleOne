@echo off
echo ========================================
echo TRUSTEDHANDS - START SCRIPT
echo ========================================

REM Stop all existing processes
echo [1/4] Stopping all processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM python.exe 2>nul
timeout /t 2 /nobreak >nul

REM Start Backend
echo [2/4] Starting Backend...
cd /d "d:\computerlangs\Arya\localrepo\backend"
start "TrustedHands Backend" cmd /k "python main.py"
timeout /t 5 /nobreak >nul

REM Clear Frontend Cache
echo [3/4] Clearing Frontend Cache...
cd /d "d:\computerlangs\Arya\localrepo\frontend"
if exist "build" rmdir /s /q "build"
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"

REM Start Frontend
echo [4/4] Starting Frontend...
start "TrustedHands Frontend" cmd /k "set GENERATE_SOURCEMAP=false && npm start"

echo.
echo ========================================
echo ALL SERVICES STARTED!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo ========================================
echo.
echo Press Ctrl+C to stop this script
pause
