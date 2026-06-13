import { useEffect, useState } from 'react'
import { aciAPI } from '../services/api'
import { History, FileCode, Route, Activity, Calendar } from 'lucide-react'

export default function AciHistory() {
  const [generations, setGenerations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchGenerations()
  }, [])

  const fetchGenerations = async () => {
    try {
      const res = await aciAPI.listGenerations({ per_page: 100 })
      setGenerations(res.data.items || [])
    } catch (e) {
      setError(e.response?.data?.error || 'Error cargando historial')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (iso) => {
    if (!iso) return '-'
    const d = new Date(iso)
    return d.toLocaleString('es-PE')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <History className="w-6 h-6 text-cyan-400" />
          Historial de Generaciones ACI
        </h1>
        <p className="text-sm text-slate-500 mt-1">XML generados y archivos Excel procesados</p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-200">{generations.length} generaciones</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Cargando...</div>
        ) : generations.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No hay generaciones registradas</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Archivo Excel</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Resumen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {generations.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-800/20">
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {formatDate(g.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${
                        g.generation_type === 'paths'
                          ? 'bg-cyan-500/10 text-cyan-400'
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {g.generation_type === 'paths' ? <Route className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                        {g.generation_type === 'paths' ? 'ACI Paths' : 'Interfaces'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300">{g.filename}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {g.summary ? (
                        <div className="text-xs space-y-0.5">
                          {g.summary.rows !== undefined && <p>Filas: <span className="text-cyan-400 font-mono">{g.summary.rows}</span></p>}
                          {g.summary.processed !== undefined && <p>Procesadas: <span className="text-emerald-400 font-mono">{g.summary.processed}</span></p>}
                          {g.summary.skipped !== undefined && <p>Omitidas: <span className="text-amber-400 font-mono">{g.summary.skipped}</span></p>}
                        </div>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}