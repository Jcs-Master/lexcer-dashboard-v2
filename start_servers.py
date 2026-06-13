import subprocess
import os
import sys
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def start_backend():
    backend_dir = os.path.join(BASE_DIR, 'backend')
    env = os.environ.copy()
    env['PYTHONUNBUFFERED'] = '1'
    return subprocess.Popen(
        [sys.executable, 'run.py'],
        cwd=backend_dir,
        env=env,
        creationflags=subprocess.CREATE_NEW_CONSOLE
    )

def start_frontend():
    frontend_dir = os.path.join(BASE_DIR, 'frontend')
    return subprocess.Popen(
        ['cmd', '/c', 'npm run dev'],
        cwd=frontend_dir,
        creationflags=subprocess.CREATE_NEW_CONSOLE
    )

if __name__ == '__main__':
    print("Iniciando servidores LexCer Dashboard...")
    be = start_backend()
    time.sleep(2)
    fe = start_frontend()
    print(f"Backend PID: {be.pid}")
    print(f"Frontend PID: {fe.pid}")
    print("Servidores iniciados. Puedes cerrar esta ventana.")
    print("URLs: http://localhost:5173 (frontend), http://127.0.0.1:5000 (backend)")
    input("Presiona Enter para salir...")