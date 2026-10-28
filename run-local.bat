@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"

echo ============================================
echo  JJCETD2P - Local Development Launcher
echo ============================================

REM 1. Check Node.js
where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not on PATH.
  echo Install Node.js 20+ from https://nodejs.org and re-run.
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODEVER=%%v
echo [OK] Node.js %NODEVER%

REM 2. Install dependencies if needed
if not exist "node_modules" (
  echo [INFO] Installing dependencies...
  call npm install
  if errorlevel 1 ( echo [ERROR] npm install failed. & pause & exit /b 1 )
) else (
  echo [OK] Dependencies present
)

REM 3. Ensure .env.local exists (local pglite defaults)
if not exist ".env.local" (
  echo [INFO] Creating .env.local with local defaults...
  (
    echo # Local development (pglite - no external DB needed)
    echo DATABASE_URL=./data/jjcetd2p.db
    echo.
    echo # Auth
    echo NEXTAUTH_SECRET=dev-secret-change-in-production
    echo NEXTAUTH_URL=http://localhost:3000
    echo.
    echo # Seed
    echo SEED_SECRET=dev-seed-secret
  ) > .env.local
)

REM 4. Ensure data directory exists
if not exist "data" mkdir data

REM 5. Run database migrations (errors are usually harmless on re-runs)
echo [INFO] Applying database migrations...
call npm run db:setup
echo [OK] Migrations done.

REM 6. Prepare seed request bodies
echo {"secret":"dev-seed-secret"} > "%TEMP%\jjcet_seed.json"

REM 7. Start dev server in background
echo [INFO] Starting dev server...
start "JJCETD2P Dev Server" cmd /c "npm run dev"

REM Wait for server to be ready
echo [INFO] Waiting for server to be ready...
:waitloop
ping -n 3 127.0.0.1 >nul
curl -s http://localhost:3000/api/v1/health >nul 2>&1
if errorlevel 1 goto waitloop
echo [OK] Server is ready at http://localhost:3000

REM 8. Seed demo data (idempotent)
echo [INFO] Seeding demo data (users + categories)...
curl -s -X POST http://localhost:3000/api/v1/seed -H "Content-Type: application/json" -d "@%TEMP%\jjcet_seed.json"
echo.
echo [INFO] Importing component inventory...
curl -s -X POST http://localhost:3000/api/v1/seed/import -H "Content-Type: application/json" -d "@%TEMP%\jjcet_seed.json"
echo.

echo ============================================
echo  App running at: http://localhost:3000
echo  Demo login: plicentring9876@gmail.com / Ayyu@123
echo  Press any key to stop the server...
echo ============================================
pause

REM Stop the dev server
taskkill /FI "WINDOWTITLE eq JJCETD2P Dev Server*" /T /F >nul 2>&1
del "%TEMP%\jjcet_seed.json" >nul 2>&1
echo [INFO] Server stopped.
endlocal