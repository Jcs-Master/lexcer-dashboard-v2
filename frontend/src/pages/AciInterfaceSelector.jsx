import { useState } from 'react'
import { aciAPI } from '../services/api'
import { Upload, FileSpreadsheet, Download, AlertTriangle, XCircle, Network, FileDown } from 'lucide-react'

export default function AciInterfaceSelector() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [activeTab, setActiveTab] = useState('create')

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (f) { setFile(f); setResult(null); setError('') }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && /\.xlsx?$/.test(f.name)) { setFile(f); setResult(null); setError('') }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) { setError('Selecciona un archivo Excel'); return }
    const fd = new FormData()
    fd.append('file', file)
    try {
      setLoading(true); setError('')
      const res = await aciAPI.generateInterfaceSelector(fd)
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Error generando XML')
    } finally { setLoading(false) }
  }

  const download = (filename, content) => {
    const blob = new Blob([content], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadTemplate = async () => {
    try {
      const res = await aciAPI.downloadInterfaceSelectorTemplate()
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'plantilla_interface_selector.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error descargando plantilla:', err)
      alert('Error al descargar la plantilla')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Network className="w-6 h-6 text-emerald-400" />
          Interface Selector
        </h1>
        <p className="text-sm text-slate-500 mt-1">Genera XML para asociar selectores de interfaz a Leaf Profiles en ACI</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer
                ${file ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-700 hover:border-cyan-400/40 hover:bg-cyan-500/5'}`}>
              <input type="file" accept=".xls,.xlsx" onChange={handleFile} className="hidden" id="intf-sel-file" />
              <label htmlFor="intf-sel-file" className="cursor-pointer">
                <FileSpreadsheet className={`w-10 h-10 mx-auto mb-3 ${file ? 'text-emerald-400' : 'text-slate-500'}`} />
                <p className="text-sm font-medium text-slate-300">
                  {file ? file.name : 'Arrastra un Excel o haz clic para seleccionar'}
                </p>
                <p className="text-xs text-slate-600 mt-1">.xls, .xlsx</p>
              </label>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2">
                <XCircle className="w-4 h-4" /> {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              <Upload className="w-4 h-4" />
              {loading ? 'Generando...' : 'Generar XML'}
            </button>
          </form>
        </div>

        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Columnas requeridas</h3>
            <button onClick={downloadTemplate} className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition">
              <FileDown className="w-3.5 h-3.5" />
              Descargar plantilla
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {['LEAF_PROFILE', 'TYPE', 'SELECTOR_NAME', 'DESCRIPTION', 'FROM_CARD', 'FROM_PORT', 'TO_CARD', 'TO_PORT', 'POLICY_GROUP_DN'].map(c => (
              <span key={c} className="px-2 py-1 rounded-md bg-slate-800 text-xs font-mono text-cyan-400 border border-slate-700">
                {c}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-500">TYPE: ACCESS | PC | VPC. El nombre del bloque se genera automáticamente: Blk_{'{'}LEAF_PROFILE{'}'}_{'{'}FROM_CARD{'}'}{'{'}FROM_PORT{'}'}{'{'}TO_CARD{'}'}{'{'}TO_PORT{'}'}</p>
        </div>
      </div>

      {result && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card p-4 text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Filas</p>
              <p className="text-2xl font-mono font-bold text-cyan-400 mt-1">{result.summary.rows}</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Procesadas</p>
              <p className="text-2xl font-mono font-bold text-emerald-400 mt-1">{result.summary.processed}</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Omitidas</p>
              <p className="text-2xl font-mono font-bold text-amber-400 mt-1">{result.summary.skipped}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card p-4">
              <p className="text-xs text-slate-500">Leaf Profiles</p>
              <p className="text-sm text-slate-200 mt-1 font-mono">{result.summary.profiles?.join(', ') || '-'}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-slate-500">Selectores</p>
              <p className="text-sm text-slate-200 mt-1 font-mono">{result.summary.selectors?.join(', ') || '-'}</p>
            </div>
          </div>

          {result.summary.warnings.length > 0 && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Advertencias
              </p>
              <ul className="mt-2 space-y-1 text-xs text-amber-300/80 font-mono">
                {result.summary.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          <div className="card">
            <div className="flex border-b border-slate-800">
              {['create', 'delete'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-sm font-medium transition ${activeTab === tab ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>
                  {tab === 'create' ? 'XML Creacion (Esmeralda)' : 'XML Borrado (Ambar)'}
                </button>
              ))}
            </div>
            <div className="p-4 bg-black rounded-b-xl overflow-auto max-h-96">
              <pre className={`text-xs font-mono leading-relaxed whitespace-pre ${activeTab === 'create' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {activeTab === 'create' ? result.create_xml : result.delete_xml}
              </pre>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <button onClick={() => download(`${result.filename.replace(/\.[^.]+$/, '')}_creacion.xml`, result.create_xml)}
              className="btn-primary flex items-center justify-center gap-2">
              <Download className="w-4 h-4" /> Descargar XML de Creacion
            </button>
            <button onClick={() => download(`${result.filename.replace(/\.[^.]+$/, '')}_borrado.xml`, result.delete_xml)}
              className="btn-secondary flex items-center justify-center gap-2">
              <Download className="w-4 h-4" /> Descargar XML de Borrado
            </button>
          </div>
        </div>
      )}
    </div>
  )
}