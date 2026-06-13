@echo off
echo ==========================================
echo   LexCer Dashboard v2 - Iniciar Servidores
echo ==========================================
echo.
echo Se abriran 2 ventanas de consola:
echo   [1] Backend Flask (Python)
echo   [2] Frontend Vite  (Node.js)
echo.
echo Para detener los servidores, cierra cada ventana.
echo.

REM Iniciar Backend en una ventana nueva independiente
start "LexCer Backend" cmd /k "cd /d %~dp0backend && python run.py"

REM Esperar 3 segundos para que el backend arranque
timeout /t 3 /nobreak >nul

REM Iniciar Frontend en otra ventana nueva independiente
start "LexCer Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Servidores iniciados.
echo.
echo URLs:
echo   Frontend: http://localhost:5173
echo   Backend:  http://127.0.0.1:5000
echo.
pause