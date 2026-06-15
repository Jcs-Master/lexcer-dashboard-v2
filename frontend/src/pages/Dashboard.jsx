import { useEffect, useState } from 'react'
import { aciAPI } from '../services/api'
import {
  Network, Route, Activity, Server, FileCode, Terminal,
  ArrowUpRight, Clock
} from 'lucide-react'

export default function Dashboard() {
  const [generations, setGenerations] = useState([])
  const [stats, setStats] = useState({
    paths: 0,
    interfaces: 0,
    'policy-groups': 0,
    'vlan-pools': 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const res = await aciAPI.listGenerations({ per_page: 100 })
      const items = res.data.items || []
      setGenerations(items.slice(0, 10))

      // Contar por tipo
      const counts = { paths: 0, interfaces: 0, 'policy-groups': 0, 'vlan-pools': 0 }
      items.forEach(g => {
        if (counts[g.generation_type] !== undefined) {
          counts[g.generation_type]++
        }
      })
      setStats(counts)
    } catch (e) {
      console.error('Error cargando dashboard:', e)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      label: 'Static Ports',
      value: stats.paths,
      icon: Route,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      path: '/aci-paths'
    },
    {
      label: 'Interface Status',
      value: stats.interfaces,
      icon: Activity,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      path: '/aci-interfaces'
    },
    {
      label: 'Policy Groups',
      value: stats['policy-groups'],
      icon: Server,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      path: '/aci-policy-groups'
    },
    {
      label: 'VLAN Pools',
      value: stats['vlan-pools'],
      icon: Network,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      path: '/aci-vlan-pools'
    },
  ]

  const quickActions = [
    { label: 'Static Ports', desc: 'Generar XML de paths', icon: Route, color: 'cyan', path: '/aci-paths' },
    { label: 'Interface Status', desc: 'Up/Down interfaces', icon: Activity, color: 'emerald', path: '/aci-interfaces' },
    { label: 'VLAN Pools', desc: 'Agregar rangos VLAN', icon: Network, color: 'orange', path: '/aci-vlan-pools' },
    { label: 'Lector de Comandos', desc: 'Analizar configs', icon: Terminal, color: 'indigo', path: '/commands' },
  ]

  const formatDate = (iso) => {
    if (!iso) return '-'
    return new Date(iso).toLocaleString('es-PE')
  }

  const getTypeLabel = (type) => {
    const labels = {
      'paths': 'Static Ports',
      'interfaces': 'Interface Status',
      'policy-groups': 'Policy Groups',
      'vlan-pools': 'VLAN Pools'
    }
    return labels[type] || type
  }

  const getTypeColor = (type) => {
    const colors = {
      'paths': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      'interfaces': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      'policy-groups': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      'vlan-pools': 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    }
    return colors[type] || 'bg-slate-500/10 text-slate-400'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Resumen de generaciones ACI y actividad reciente
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`card p-5 border ${card.border} hover:border-opacity-50 transition cursor-pointer`}
            onClick={() => window.location.href = card.path}
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

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        {/* Recent Generations */}
        <div className="card">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h2 className="font-semibold text-slate-100">Últimas Generaciones ACI</h2>
            </div>
            <button
              onClick={() => window.location.href = '/aci-history'}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition"
            >
              Ver todo
            </button>
          </div>
          <div className="divide-y divide-slate-800">
            {loading ? (
              <div className="p-8 text-center text-slate-500 text-sm">Cargando...</div>
            ) : generations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No hay generaciones aún
              </div>
            ) : (
              generations.map((gen) => (
                <div key={gen.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      gen.generation_type === 'paths' ? 'bg-cyan-500' :
                      gen.generation_type === 'interfaces' ? 'bg-emerald-500' :
                      gen.generation_type === 'policy-groups' ? 'bg-purple-500' :
                      'bg-orange-500'
                    }`}></div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${getTypeColor(gen.generation_type)}`}>
                          {getTypeLabel(gen.generation_type)}
                        </span>
                        <p className="text-sm font-medium text-slate-200">{gen.filename}</p>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 font-mono">
                        {gen.summary?.rows || 0} filas · {gen.summary?.processed || 0} procesadas
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 font-mono">{formatDate(gen.created_at)}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">por {gen.user?.username || '—'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="p-5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-indigo-400" />
              <h2 className="font-semibold text-slate-100">Acciones Rápidas</h2>
            </div>
          </div>
          <div className="p-5 space-y-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => window.location.href = action.path}
                className={`w-full flex items-center justify-between p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-${action.color}-500/30 transition group`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-${action.color}-500/10`}>
                    <action.icon className={`w-4 h-4 text-${action.color}-400`} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-200">{action.label}</p>
                    <p className="text-xs text-slate-500">{action.desc}</p>
                  </div>
                </div>
                <ArrowUpRight className={`w-4 h-4 text-slate-600 group-hover:text-${action.color}-400 transition`} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}