import { useState } from 'react'
import { aciAPI } from '../services/api'
import { Upload, FileSpreadsheet, Download, AlertTriangle, XCircle, Activity } from 'lucide-react'

export default function AciInterfaces() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [activeTab, setActiveTab] = useState('up')

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
      const res = await aciAPI.generateInterfaces(fd)
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


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Activity className="w-6 h-6 text-emerald-400" />
          Interfaces Up/Down
        </h1>
        <p className="text-sm text-slate-500 mt-1">Genera XML para apagar/encender interfaces de leafs ACI</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer
                ${file ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-700 hover:border-cyan-400/40 hover:bg-cyan-500/5'}`}>
              <input type="file" accept=".xls,.xlsx" onChange={handleFile} className="hidden" id="intf-file" />
              <label htmlFor="intf-file" className="cursor-pointer">
                <FileSpreadsheet className={`w-10 h-10 mx-auto mb-3 ${file ? 'text-emerald-400' : 'text-slate-500'}`} />
                <p className="text-sm font-medium text-slate-300">{file ? file.name : 'Arrastra Excel o haz clic'}</p>
                <p className="text-xs text-slate-600 mt-1">.xls, .xlsx</p>
              </label>
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2">
                <XCircle className="w-4 h-4" /> {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              <Upload className="w-4 h-4" /> {loading ? 'Generando...' : 'Generar XML'}
            </button>
          </form>
        </div>

        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200">Columnas requeridas</h3>
          <div className="flex flex-wrap gap-2">
            {['POD', 'LEAF', 'INTERFACE', 'DESCRIPTION'].map(c => (
              <span key={c} className={`px-2 py-1 rounded-md bg-slate-800 text-xs font-mono border border-slate-700 ${c === 'DESCRIPTION' ? 'text-slate-400' : 'text-cyan-400'}`}>
                {c}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-500">DESCRIPTION es opcional. LEAF acepta: 101, leaf101, node-101</p>
        </div>
      </div>

      {result && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Filas', val: result.summary.rows, color: 'text-cyan-400' },
              { label: 'Procesadas', val: result.summary.processed, color: 'text-emerald-400' },
              { label: 'Omitidas', val: result.summary.skipped, color: 'text-amber-400' },
            ].map(s => (
              <div key={s.label} className="card p-4 text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider">{s.label}</p>
                <p className={`text-2xl font-mono font-bold ${s.color} mt-1`}>{s.val}</p>
              </div>
            ))}
          </div>

          {result.summary.entries.length > 0 && (
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-slate-800">
                <h3 className="text-sm font-semibold text-slate-200">Interfaces procesadas</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800/50">
                    <tr>
                      {['POD', 'Leaf', 'Puerto', 'Descripcion'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {result.summary.entries.map((e, i) => (
                      <tr key={i} className="hover:bg-slate-800/20">
                        <td className="px-4 py-3 font-mono text-slate-300">{e.pod}</td>
                        <td className="px-4 py-3 font-mono text-slate-300">{e.leaf}</td>
                        <td className="px-4 py-3 font-mono text-emerald-400">{e.interface}</td>
                        <td className="px-4 py-3 text-slate-400">{e.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
              {['up', 'down'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-sm font-medium transition ${activeTab === tab ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>
                  {tab === 'up' ? 'XML Up (rollback)' : 'XML Down (blacklist)'}
                </button>
              ))}
            </div>
            <div className="p-4 bg-black rounded-b-xl overflow-auto max-h-96">
              <pre className="text-xs font-mono leading-relaxed whitespace-pre text-slate-300">
                {activeTab === 'up' ? result.rollback_xml : result.main_xml}
              </pre>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <button onClick={() => download(`${result.filename.replace(/\.[^.]+$/, '')}_up.xml`, result.rollback_xml)}
              className="btn-primary flex items-center justify-center gap-2">
              <Download className="w-4 h-4" /> Descargar XML Up
            </button>
            <button onClick={() => download(`${result.filename.replace(/\.[^.]+$/, '')}_down.xml`, result.main_xml)}
              className="btn-secondary flex items-center justify-center gap-2">
              <Download className="w-4 h-4" /> Descargar XML Down
            </button>
          </div>
        </div>
      )}
    </div>
  )
}