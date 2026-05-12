@echo off
echo ============================================================
echo  LMS Server Launcher
echo ============================================================
echo.

:: ── Step 1: Kill anything holding ports 3000, 8001, 8002 ─────

echo [1/3] Stopping existing processes on ports 3000, 8001, 8002...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    echo     Killing PID %%a on port 3000
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8001 " ^| findstr "LISTENING"') do (
    echo     Killing PID %%a on port 8001
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8002 " ^| findstr "LISTENING"') do (
    echo     Killing PID %%a on port 8002
    taskkill /F /PID %%a >nul 2>&1
)

:: ── Step 2: Kill the PM2 daemon so it stops auto-restarting ──

echo [2/3] Stopping PM2 daemon...
for /f "tokens=1" %%a in ('wmic process where "CommandLine like '%%pm2%%Daemon%%'" get ProcessId ^| findstr /r "[0-9]"') do (
    echo     Killing PM2 daemon PID %%a
    taskkill /F /PID %%a >nul 2>&1
)

:: ── Step 3: Wait for ports to fully release ───────────────────

echo [3/3] Waiting 4 seconds for ports to clear...
timeout /t 4 /nobreak >nul

echo.
echo ============================================================
echo  Starting servers...
echo ============================================================
echo.

:: ── LMS Backend (FastAPI, port 8001) ─────────────────────────
echo Starting LMS Backend on port 8001...
start "LMS Backend" cmd /k "cd /d C:\Erp_Systems\HRMS_LMS_APP\GIT_NEW\LMS-Backend && call .venv\Scripts\activate.bat && uvicorn main:app --host 0.0.0.0 --port 8001 --reload"

:: ── Face Recognition Backend (FastAPI, port 8002) ────────────
echo Starting Face Backend on port 8002...
start "Face Backend" cmd /k "cd /d C:\Erp_Systems\HRMS_LMS_APP\GIT_NEW\LMS-Face-Backend\face_rec && call C:\Erp_Systems\HRMS_LMS_APP\GIT_NEW\LMS-Backend\.venv\Scripts\activate.bat && uvicorn api:app --host 0.0.0.0 --port 8002 --reload"

:: ── Next.js Frontend (port 3000) ─────────────────────────────
echo Starting Frontend on port 3000...
start "LMS Frontend" cmd /k "cd /d C:\Erp_Systems\HRMS_LMS_APP\GIT_NEW\LMS-Web && npm run start"

echo.
echo All servers started in separate windows.
echo.
echo  Backend:  http://localhost:8001
echo  Face API: http://localhost:8002
echo  Frontend: http://localhost:3000
echo.
pause
