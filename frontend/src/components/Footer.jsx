import { Database, Activity } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 py-3 px-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span>LexCer Dashboard v2.0.0</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline"> 2024 LexCer Networks</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-emerald-500" />
            <span>PostgreSQL</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span>API Conectada</span>
          </div>
        </div>
      </div>
    </footer>
  )
}