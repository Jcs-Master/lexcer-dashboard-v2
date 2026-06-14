import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
  import {
  Home, Terminal, Settings, ChevronDown,
  Network, Users, Route, Activity, History, GitCompare
} from 'lucide-react'

export default function Sidebar({ open, onClose }) {
  const { hasPermission, isAdmin } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [expandedGroups, setExpandedGroups] = useState({ aci: true })

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path.split('?')[0])
  }

  // Items del menu filtrados por permisos
  const menuItems = [
    { id: 'dashboard', label: 'Inicio', icon: Home, path: '/', permission: 'dashboard' },
    {
      id: 'aci',
      label: 'Plantillas ACI',
      icon: Network,
      permission: 'templates',
      children: [
        { id: 'aci-paths', label: 'Static Ports', icon: Route, path: '/aci-paths', permission: 'templates' },
        { id: 'aci-interfaces', label: 'Interface Status', icon: Activity, path: '/aci-interfaces', permission: 'templates' },
        { id: 'aci-history', label: 'Historial', icon: History, path: '/aci-history', permission: 'templates' },
        { id: 'aci-policy-groups', label: 'Policy Groups', icon: Server, path: '/aci-policy-groups', permission: 'templates' },
      ]
    },
        { id: 'commands', label: 'Lector de Comandos', icon: Terminal, path: '/commands', permission: 'commands' },
        { id: 'compare', label: 'Comparador', icon: GitCompare, path: '/commands/compare', permission: 'commands' },
    { id: 'users', label: 'Usuarios', icon: Users, path: '/users', permission: 'users', adminOnly: true },
    { id: 'settings', label: 'Configuracion', icon: Settings, path: '/settings', permission: 'settings' },
  ]

  // Filtrar items segun permisos
  const visibleItems = menuItems.filter(item => {
    if (item.adminOnly && !isAdmin()) return false
    return hasPermission(item.permission)
  })

  return (
    <>
      {!open && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed left-0 top-16 bottom-0 z-30
        bg-slate-900/95 backdrop-blur-xl border-r border-slate-800
        transition-all duration-300 ease-in-out
        ${open ? 'w-64' : 'w-0 lg:w-20'}
        overflow-hidden
      `}>
        <div className="h-full flex flex-col py-4 px-3">
          <div className={`mb-6 px-3 ${!open && 'lg:px-1'}`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
                <Network className="w-5 h-5 text-white" />
              </div>
              {open && (
                <div>
                  <h2 className="text-lg font-bold text-slate-100 tracking-tight">LexCer</h2>
                  <p className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest">Dashboard v2</p>
                </div>
              )}
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            {visibleItems.map((item) => (
              <div key={item.id}>
                {item.children ? (
                  <div>
                    <button
                      onClick={() => toggleGroup(item.id)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                        transition-colors text-left
                        ${expandedGroups[item.id] ? 'bg-slate-800/50 text-indigo-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}
                      `}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {open && (
                        <>
                          <span className="flex-1 text-sm font-medium">{item.label}</span>
                          <ChevronDown className={`
                            w-4 h-4 transition-transform
                            ${expandedGroups[item.id] ? 'rotate-180' : ''}
                          `} />
                        </>
                      )}
                    </button>
                    {open && expandedGroups[item.id] && (
                      <div className="mt-1 ml-4 pl-4 border-l border-slate-800 space-y-0.5">
                        {item.children
                          .filter(child => hasPermission(child.permission))
                          .map((child) => (
                          <button
                            key={child.id}
                            onClick={() => navigate(child.path)}
                            className={`
                              w-full flex items-center gap-2.5 px-3 py-2 rounded-lg
                              text-sm transition-colors
                              ${isActive(child.path)
                                ? 'bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500'
                                : 'text-slate-400 hover:bg-slate-800/30 hover:text-slate-200'
                              }
                            `}
                          >
                            <child.icon className="w-4 h-4" />
                            <span>{child.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => navigate(item.path)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                      text-sm font-medium transition-colors
                      ${isActive(item.path)
                        ? 'bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                      }
                    `}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {open && <span>{item.label}</span>}
                  </button>
                )}
              </div>
            ))}
          </nav>

          {open && (
            <div className="mt-auto pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2 px-3 py-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs text-slate-500">API Online</span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}