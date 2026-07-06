@echo off
echo.
echo  PrepUp — Placement Intelligence Platform
echo  ======================================
echo.

set ROOT=%~dp0
set BACKEND=%ROOT%backend
set FRONTEND=%ROOT%frontend

echo  [1/2] Starting Node API on http://localhost:5000 ...
start "PrepUp API" cmd /k "cd /d "%BACKEND%" && npm run dev"

timeout /t 3 /nobreak > nul

echo  [2/3] Starting PrepUp frontend on http://localhost:5173 ...
start "PrepUp Frontend" cmd /k "cd /d "%FRONTEND%" && npm install --legacy-peer-deps -q && npm run dev"

timeout /t 2 /nobreak > nul

echo  [3/3] Starting Python AI/ML API on http://localhost:8000 ...
start "PrepUp AI API" cmd /k "cd /d "%ROOT%" && .venv\Scripts\python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --app-dir backend"

echo.
echo  All servers starting in separate windows.
echo.
echo    Frontend : http://localhost:5173
echo    Node API : http://localhost:5000
echo    AI/ML API: http://localhost:8000  (scikit-learn + optional Gemini)
echo.
pause
