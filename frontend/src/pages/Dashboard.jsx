import { useEffect, useState } from 'react'
import { templatesAPI, commandsAPI } from '../services/api'
import {
  FileCode, Terminal, Activity, TrendingUp,
  Network, Clock, ArrowUpRight, Shield
} from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState({
    templates: 0,
    commands: 0,
    interfacesUp: 0,
    interfacesDown: 0
  })
  const [recentLogs, setRecentLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [templatesRes, logsRes] = await Promise.all([
          templatesAPI.list({ per_page: 1 }),
          commandsAPI.listLogs({ per_page: 5 })
        ])
        setStats(prev => ({
          ...prev,
          templates: templatesRes.data.total || 0,
          commands: logsRes.data.total || 0
        }))
        setRecentLogs(logsRes.data.items || [])
      } catch (e) {
        console.error('Error cargando dashboard:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const statCards = [
    {
      label: 'Plantillas ACI',
      value: stats.templates,
      icon: FileCode,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20'
    },
    {
      label: 'Comandos Procesados',
      value: stats.commands,
      icon: Terminal,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20'
    },
    {
      label: 'Interfaces Up',
      value: stats.interfacesUp,
      icon: Network,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20'
    },
    {
      label: 'Interfaces Down',
      value: stats.interfacesDown,
      icon: Activity,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20'
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Resumen del sistema y actividad reciente</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`card p-5 border ${card.border} hover:border-opacity-50 transition`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="text-3xl font-bold text-slate-100 mt-2">
                  {loading ? '-' : card.value}
                </p>
              </div>
              <div className={`p-2.5 rounded-lg ${card.bg}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Logs */}
        <div className="card">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h2 className="font-semibold text-slate-100">Archivos Recientes</h2>
            </div>
            <span className="text-xs text-slate-500">{recentLogs.length} items</span>
          </div>
          <div className="divide-y divide-slate-800">
            {recentLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No hay archivos procesados aún
              </div>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${log.status === 'processed' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{log.filename}</p>
                      <p className="text-xs text-slate-500 font-mono">
                        {log.device_info?.hostname || 'Unknown'} · {log.file_type?.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-600 font-mono">
                    {new Date(log.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="p-5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <h2 className="font-semibold text-slate-100">Acciones Rápidas</h2>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <button
              onClick={() => window.location.href = '/templates'}
              className="w-full flex items-center justify-between p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-indigo-500/30 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10">
                  <FileCode className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-200">Nueva Plantilla ACI</p>
                  <p className="text-xs text-slate-500">Crear configuración de red</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition" />
            </button>

            <button
              onClick={() => window.location.href = '/commands'}
              className="w-full flex items-center justify-between p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-cyan-500/30 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-200">Cargar Comandos</p>
                  <p className="text-xs text-slate-500">Analizar archivo Cisco</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition" />
            </button>

            <button
              onClick={() => window.location.href = '/templates?type=aci_contract'}
              className="w-full flex items-center justify-between p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-emerald-500/30 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Shield className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-200">Contract Security</p>
                  <p className="text-xs text-slate-500">Políticas de acceso ACI</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}