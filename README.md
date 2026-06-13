# LexCer Dashboard v2

Dashboard de pruebas moderno y robusto enfocado en leer archivos de comandos y gestionar plantillas de Cisco ACI.

## Arquitectura

- **Backend**: Python Flask + SQLAlchemy + JWT + PostgreSQL/SQLite
- **Frontend**: React 18 + Vite + TailwindCSS + Lucide React

## Estructura del Proyecto

```
LexCer-Dashboard_v2/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # App factory
│   │   ├── models.py            # User, Template, CommandLog
│   │   └── routes/
│   │       ├── auth.py          # /api/auth (JWT)
│   │       ├── templates.py     # /api/templates (CRUD ACI)
│   │       └── commands.py      # /api/commands (upload, parse)
│   ├── config.py                # Configuracion por entorno
│   ├── run.py                   # Punto de entrada
│   ├── requirements.txt
│   └── .env                     # Variables de entorno
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Router principal
│   │   ├── main.jsx             # Entry point
│   │   ├── index.css            # Tailwind + tema oscuro
│   │   ├── services/api.js      # Axios + interceptores JWT
│   │   ├── context/AuthContext.jsx
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Footer.jsx
│   │   │   └── PrivateRoute.jsx
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Dashboard.jsx
│   │       ├── Templates.jsx
│   │       ├── CommandReader.jsx
│   │       └── Settings.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── start_backend.bat
└── start_frontend.bat
```

## Inicio Rapido

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
python run.py
```

- API: http://127.0.0.1:5000
- Health check: `GET /api/health`

### 2. Frontend

En Windows (PowerShell con scripts deshabilitados):
```bash
cd frontend
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
npx vite --host
```

- App: http://localhost:5173

### Scripts .bat

- `start_backend.bat` - Inicia el servidor Flask
- `start_frontend.bat` - Inicia el servidor Vite

## API Endpoints

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| POST | /api/auth/register | Registrar usuario |
| POST | /api/auth/login | Login JWT |
| POST | /api/auth/logout | Logout (revoca token) |
| GET | /api/auth/me | Usuario actual |
| GET | /api/templates | Listar plantillas |
| POST | /api/templates | Crear plantilla |
| PUT | /api/templates/:id | Actualizar plantilla |
| DELETE | /api/templates/:id | Eliminar plantilla |
| GET | /api/templates/types | Tipos de plantilla |
| POST | /api/commands/upload | Subir archivo .txt/.cfg |
| GET | /api/commands/logs | Listar logs |
| POST | /api/commands/parse-preview | Parsear texto sin guardar |

## Autenticacion JWT

Los tokens se almacenan en `localStorage`:
- `access_token` - Valido por 1 hora
- `refresh_token` - Valido por 24 horas

## Base de Datos

Por defecto usa **SQLite** para desarrollo rapido. Cambiar `DB_TYPE=postgresql` en `backend/.env` para usar PostgreSQL.

## Estilo Visual

- **Fondos**: `bg-slate-950` (body), `bg-slate-900` (tarjetas)
- **Acentos**: Indigo (`indigo-500`), Cyan (`cyan-400`)
- **Estados**: Emerald (`emerald-500` = up/ok), Amber (`amber-500` = warning)
- **Terminal**: `bg-black`, `font-mono`, alto contraste