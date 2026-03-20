@echo off
cd /d "%~dp0"

if not exist ".env" goto noenv

echo Running npm install...
call npm install
if errorlevel 1 goto installfail

start "" http://localhost:5173
call npm run dev
pause
exit /b 0

:noenv
echo .env not found.
echo Copy .env.example to .env
echo Then set:
echo VITE_SUPABASE_URL
echo VITE_SUPABASE_ANON_KEY
pause
exit /b 1

:installfail
echo npm install failed.
pause
exit /b 1