import { useState } from 'react'
import { commandsAPI } from '../services/api'
import {
  GitCompare, Upload, FileText, XCircle, AlertTriangle,
  RotateCcw, Columns, LayoutTemplate, ChevronDown, ChevronUp
} from 'lucide-react'
import DiffViewer from '../components/diff/DiffViewer'

export default function ConfigCompare() {
  const [oldText, setOldText] = useState('')
  const [newText, setNewText] = useState('')
  const [oldFileName, setOldFileName] = useState('')
  const [newFileName, setNewFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [viewMode, setViewMode] = useState('split')
  const [showInputs, setShowInputs] = useState(true)

  const handleFile = (side) => (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      if (side === 'old') {
        setOldText(ev.target.result)
        setOldFileName(f.name)
      } else {
        setNewText(ev.target.result)
        setNewFileName(f.name)
      }
    }
    reader.readAsText(f)
  }

  const handleDrop = (side) => (e) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      if (side === 'old') {
        setOldText(ev.target.result)
        setOldFileName(f.name)
      } else {
        setNewText(ev.target.result)
        setNewFileName(f.name)
      }
    }
    reader.readAsText(f)
  }

  const handleCompare = async () => {
    if (!oldText.trim() && !newText.trim()) {
      setError('Ambos textos están vacíos')
      return
    }
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await commandsAPI.compare(oldText, newText)
      setResult(res.data)
      setShowInputs(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Error en la comparación')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setOldText('')
    setNewText('')
    setOldFileName('')
    setNewFileName('')
    setResult(null)
    setError('')
    setShowInputs(true)
  }

  const SummaryBadge = ({ label, count, colorClass }) => (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 border border-slate-700 ${colorClass}`}>
      <span className="text-xs font-medium text-slate-400">{label}</span>
      <span className="text-sm font-mono font-bold">{count}</span>
    </div>
  )

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 mb-4">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-cyan-400" />
          Comparador de Configuraciones
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Compara archivos de configuración Cisco (.txt, .cfg) línea por línea
        </p>
      </div>

      {/* Zona de carga */}
      {showInputs && (
        <div className="shrink-0 grid gap-3 lg:grid-cols-2 mb-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                Configuración Original
              </h3>
              {oldFileName && (
                <span className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">
                  {oldFileName}
                </span>
              )}
            </div>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop('old')}
              className={`border-2 border-dashed rounded-lg p-3 transition
                ${oldText ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-700 hover:border-cyan-400/40'}`}
            >
              <textarea
                value={oldText}
                onChange={(e) => setOldText(e.target.value)}
                placeholder="Pega la configuración original o arrastra un archivo..."
                className="w-full h-28 bg-transparent text-[11px] font-mono text-slate-300 resize-none focus:outline-none placeholder:text-slate-600"
              />
              <div className="flex items-center justify-between mt-1.5">
                <input
                  type="file"
                  accept=".txt,.cfg"
                  onChange={handleFile('old')}
                  className="hidden"
                  id="old-file"
                />
                <label
                  htmlFor="old-file"
                  className="cursor-pointer flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 transition"
                >
                  <Upload className="w-3 h-3" />
                  Cargar archivo
                </label>
                <span className="text-[9px] text-slate-600">
                  {oldText.split('\n').length} líneas
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                Configuración Propuesta
              </h3>
              {newFileName && (
                <span className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">
                  {newFileName}
                </span>
              )}
            </div>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop('new')}
              className={`border-2 border-dashed rounded-lg p-3 transition
                ${newText ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-700 hover:border-cyan-400/40'}`}
            >
              <textarea
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Pega la configuración propuesta o arrastra un archivo..."
                className="w-full h-28 bg-transparent text-[11px] font-mono text-slate-300 resize-none focus:outline-none placeholder:text-slate-600"
              />
              <div className="flex items-center justify-between mt-1.5">
                <input
                  type="file"
                  accept=".txt,.cfg"
                  onChange={handleFile('new')}
                  className="hidden"
                  id="new-file"
                />
                <label
                  htmlFor="new-file"
                  className="cursor-pointer flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 transition"
                >
                  <Upload className="w-3 h-3" />
                  Cargar archivo
                </label>
                <span className="text-[9px] text-slate-600">
                  {newText.split('\n').length} líneas
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botones */}
      <div className="shrink-0 flex items-center gap-2 mb-2">
        <button
          onClick={handleCompare}
          disabled={loading}
          className="btn-primary flex items-center gap-1.5 px-4 py-1.5 text-xs"
        >
          <GitCompare className="w-3.5 h-3.5" />
          {loading ? 'Comparando...' : 'Comparar'}
        </button>
        {result && (
          <>
            <button
              onClick={handleReset}
              className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Nueva
            </button>
            <button
              onClick={() => setShowInputs(!showInputs)}
              className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs"
            >
              {showInputs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Inputs
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="shrink-0 p-2 rounded-md bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-1.5 mb-2">
          <XCircle className="w-3.5 h-3.5" /> {error}
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Resumen */}
          <div className="shrink-0 flex flex-wrap items-center gap-2 mb-1.5">
            <SummaryBadge label="Total" count={result.summary.total_lines} colorClass="text-slate-300" />
            <SummaryBadge label="Igual" count={result.summary.unchanged} colorClass="text-slate-400" />
            <SummaryBadge label="Añadido" count={result.summary.added} colorClass="text-emerald-400" />
            <SummaryBadge label="Eliminado" count={result.summary.deleted} colorClass="text-amber-400" />
            <SummaryBadge label="Modificado" count={result.summary.modified} colorClass="text-cyan-400" />

            <div className="ml-auto flex bg-slate-800 rounded-md p-0.5 border border-slate-700">
              <button
                onClick={() => setViewMode('split')}
                className={`flex items-center gap-1 px-2 py-1 rounded-sm text-[10px] transition
                  ${viewMode === 'split' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Columns className="w-3 h-3" />
                Split
              </button>
              <button
                onClick={() => setViewMode('unified')}
                className={`flex items-center gap-1 px-2 py-1 rounded-sm text-[10px] transition
                  ${viewMode === 'unified' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <LayoutTemplate className="w-3 h-3" />
                Unified
              </button>
            </div>
          </div>

          {result.summary.total_lines > 5000 && (
            <div className="shrink-0 p-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 flex items-center gap-1.5 mb-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Archivo grande ({result.summary.total_lines} líneas). El renderizado puede ser lento.
            </div>
          )}

          {/* Visor de diff - ocupa todo el espacio restante */}
          <div className="flex-1 min-h-0">
            <DiffViewer diff={result.diff} viewMode={viewMode} />
          </div>
        </div>
      )}
    </div>
  )
}