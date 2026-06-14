@echo off
cd /d "d:\PYTHON_CLASES\LexCer-Dashboard _v2_kimi"
echo Limpiando cache compilado Python...
if exist "backend\app\__pycache__" rmdir /s /q "backend\app\__pycache__"
if exist "backend\app\routes\__pycache__" rmdir /s /q "backend\app\routes\__pycache__"
if exist "backend\app\utils\__pycache__" rmdir /s /q "backend\app\utils\__pycache__"
echo Cache limpiada.
echo Iniciando PM2...
pm2 start ecosystem.config.js
echo Servidores reiniciados.
pause