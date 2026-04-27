@echo off
echo ========================================
echo COMPLETE CACHE CLEAR AND RESTART
echo ========================================

cd /d "d:\computerlangs\Arya\localrepo\frontend"

echo.
echo [1/7] Stopping all node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/7] Deleting build cache...
if exist "build" rmdir /s /q "build"
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"

echo [3/7] Clearing npm cache...
call npm cache clean --force

echo [4/7] Removing package-lock...
if exist "package-lock.json" del /f "package-lock.json"

echo [5/7] Reinstalling dependencies...
call npm install

echo [6/7] Setting environment variables...
set GENERATE_SOURCEMAP=false
set FAST_REFRESH=true
set DISABLE_ESLINT_PLUGIN=true

echo [7/7] Starting React development server...
echo.
echo ==========================================
echo READY! Open browser with Ctrl+Shift+R
echo ==========================================
echo.

call npm start
