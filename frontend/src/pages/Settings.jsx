import { useAuth } from '../context/AuthContext'
import {
  User, Shield, Database, Key, Info,
  Check
} from 'lucide-react'

export default function Settings() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Configuracion</h1>
        <p className="text-sm text-slate-500 mt-1">Preferencias del sistema y perfil</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-indigo-500/10">
              <User className="w-5 h-5 text-indigo-400" />
            </div>
            <h2 className="font-semibold text-slate-100">Perfil</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider">Usuario</label>
              <p className="text-sm font-medium text-slate-200 mt-1">{user?.username}</p>
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider">Email</label>
              <p className="text-sm font-medium text-slate-200 mt-1">{user?.email}</p>
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider">Estado</label>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-sm text-slate-200">Activo</span>
              </div>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <Database className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="font-semibold text-slate-100">Informacion del Sistema</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-slate-200">Autenticacion</span>
              </div>
              <p className="text-xs text-slate-500">JWT con tokens de acceso y refresh</p>
              <div className="mt-2 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs text-emerald-400">Proteccion activa</span>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-slate-200">Base de Datos</span>
              </div>
              <p className="text-xs text-slate-500">PostgreSQL / SQLite (fallback)</p>
              <div className="mt-2 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs text-emerald-400">Conectada</span>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-medium text-slate-200">API Version</span>
              </div>
              <p className="text-xs text-slate-500">LexCer Dashboard API v2.0.0</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-slate-200">Frontend</span>
              </div>
              <p className="text-xs text-slate-500">React 18 + Vite + TailwindCSS</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}