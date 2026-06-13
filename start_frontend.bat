@echo off
cd frontend
powershell -ExecutionPolicy Bypass -Command "npx vite --host"
pause