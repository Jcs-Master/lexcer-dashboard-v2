import { useState, useCallback } from 'react'
import { commandsAPI } from '../services/api'
import {
  Upload, X, AlertTriangle,
  Terminal, Copy, Activity
} from 'lucide-react'

export default function CommandReader() {
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState(null)
  const [content, setContent] = useState('')
  const [parsed, setParsed] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) processFile(droppedFile)
  }, [])

  const handleFileInput = (e) => {
    const selected = e.target.files?.[0]
    if (selected) processFile(selected)
  }

  const processFile = async (selectedFile) => {
    if (!selectedFile.name.match(/\.(txt|cfg)$/i)) {
      setError('Solo archivos .txt o .cfg')
      return
    }
    setFile(selectedFile)
    setError('')

    const reader = new FileReader()
    reader.onload = (e) => setContent(e.target.result)
    reader.readAsText(selectedFile)

    setLoading(true)
    const formData = new FormData()
    formData.append('file', selectedFile)
    try {
      const res = await commandsAPI.upload(formData)
      setParsed(res.data.log.parsed_data)
    } catch (err) {
      setError(err.response?.data?.error || 'Error procesando archivo')
    } finally {
      setLoading(false)
    }
  }

  const handlePaste = async (e) => {
    const text = e.clipboardData.getData('text')
    if (!text) return
    setContent(text)
    setFile(null)
    setLoading(true)
    try {
      const res = await commandsAPI.parsePreview(text)
      setParsed(res.data.parsed_data)
    } catch (err) {
      setError('Error en parseo')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => navigator.clipboard.writeText(content)

  const clearAll = () => {
    setFile(null)
    setContent('')
    setParsed(null)
    setError('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Lector de Comandos</h1>
        <p className="text-sm text-slate-500 mt-1">Arrastra archivos Cisco o pega contenido para analizar</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Drop Zone + Terminal */}
        <div className="space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onPaste={handlePaste}
            className={`
              relative border-2 border-dashed rounded-xl p-8 text-center transition
              ${dragActive
                ? 'border-cyan-400 bg-cyan-500/5'
                : 'border-slate-700 hover:border-slate-600 bg-slate-900/50'
              }
            `}
          >
            <input
              type="file"
              accept=".txt,.cfg"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Upload className={`w-10 h-10 mx-auto mb-3 ${dragActive ? 'text-cyan-400' : 'text-slate-600'}`} />
            <p className="text-sm text-slate-300 font-medium">
              {dragActive ? 'Suelta el archivo aqui' : 'Arrastra un archivo .txt o .cfg'}
            </p>
            <p className="text-xs text-slate-500 mt-1">O haz clic para seleccionar · Tambien puedes pegar texto (Ctrl+V)</p>
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-black border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono text-slate-400">
                  {file ? file.name : 'terminal'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={copyToClipboard} className="p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button onClick={clearAll} className="p-1.5 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400 transition">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="terminal min-h-[300px] max-h-[500px]" onPaste={handlePaste}>
              {content ? (
                <pre className="whitespace-pre-wrap break-all">{content}</pre>
              ) : (
                <span className="text-slate-600 italic">Esperando contenido...</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Parsed Data */}
        <div className="space-y-4">
          {error && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-sm text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          {loading && (
            <div className="card p-8 text-center">
              <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
              <p className="text-sm text-slate-500 mt-3">Procesando archivo...</p>
            </div>
          )}

          {parsed && !loading && (
            <div className="space-y-4">
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Informacion del Dispositivo
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2.5 rounded-lg bg-slate-800/50">
                    <p className="text-xs text-slate-500">Hostname</p>
                    <p className="font-mono text-slate-200">{parsed.hostname || 'N/A'}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/50">
                    <p className="text-xs text-slate-500">Version</p>
                    <p className="font-mono text-slate-200">{parsed.version || 'N/A'}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/50">
                    <p className="text-xs text-slate-500">Modelo</p>
                    <p className="font-mono text-slate-200">{parsed.model || 'N/A'}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/50">
                    <p className="text-xs text-slate-500">Protocolos</p>
                    <p className="font-mono text-slate-200">{parsed.routing_protocols?.join(', ') || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="card p-4">
                <h3 className="text-sm font-semibold text-slate-200 mb-3">Interfaces</h3>
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-xs text-slate-400">Up: {parsed.interfaces_up}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span className="text-xs text-slate-400">Down: {parsed.interfaces_down}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                    <span className="text-xs text-slate-400">Total: {parsed.interfaces?.length || 0}</span>
                  </div>
                </div>
                <div className="max-h-32 overflow-auto space-y-1">
                  {parsed.interfaces?.slice(0, 20).map((intf, i) => (
                    <p key={i} className="text-xs font-mono text-slate-400">{intf}</p>
                  ))}
                </div>
              </div>

              {parsed.vlans_detail?.length > 0 && (
                <div className="card p-4">
                  <h3 className="text-sm font-semibold text-slate-200 mb-3">VLANs</h3>
                  <div className="max-h-32 overflow-auto space-y-1">
                    {parsed.vlans_detail.map((v, i) => (
                      <div key={i} className="flex items-center gap-3 text-xs font-mono">
                        <span className="text-cyan-400 w-8">{v.id}</span>
                        <span className="text-slate-400">{v.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {parsed.ip_addresses?.length > 0 && (
                <div className="card p-4">
                  <h3 className="text-sm font-semibold text-slate-200 mb-3">Direcciones IP</h3>
                  <div className="flex flex-wrap gap-2">
                    {parsed.ip_addresses.slice(0, 20).map((ip, i) => (
                      <span key={i} className="px-2 py-1 rounded bg-slate-800 text-xs font-mono text-cyan-400">
                        {ip}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}