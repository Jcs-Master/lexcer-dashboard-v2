import { useEffect, useState } from 'react'
import { authAPI } from '../services/api'
import {
  Users, Plus, Pencil, Trash2, X, Save, Shield,
  Check, XCircle, UserCog, Lock, Mail
} from 'lucide-react'

const ALL_PERMISSIONS = [
  { key: 'dashboard', label: 'Dashboard', desc: 'Ver inicio y estadisticas' },
  { key: 'templates', label: 'Plantillas ACI', desc: 'Gestionar plantillas' },
  { key: 'commands', label: 'Lector de Comandos', desc: 'Subir y analizar archivos' },
  { key: 'settings', label: 'Configuracion', desc: 'Ver preferencias del sistema' },
  { key: 'users', label: 'Gestion de Usuarios', desc: 'Administrar usuarios y permisos' },
]

const DEFAULT_PERMISSIONS = {
  dashboard: true,
  templates: true,
  commands: true,
  settings: true,
  users: false,
}

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    is_active: true,
    permissions: { ...DEFAULT_PERMISSIONS },
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await authAPI.listUsers({ per_page: 100 })
      setUsers(res.data.items || [])
    } catch (e) {
      setError(e.response?.data?.error || 'Error cargando usuarios')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'user',
      is_active: true,
      permissions: { ...DEFAULT_PERMISSIONS },
    })
    setError('')
  }

  const handleOpenCreate = () => {
    setEditing(null)
    resetForm()
    setShowModal(true)
  }

  const handleOpenEdit = (user) => {
    setEditing(user.id)
    setForm({
      username: user.username,
      email: user.email,
      password: '',
      confirmPassword: '',
      role: user.role,
      is_active: user.is_active,
      permissions: { ...DEFAULT_PERMISSIONS, ...(user.permissions || {}) },
    })
    setError('')
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.username || !form.email) {
      setError('Usuario y email son requeridos')
      return
    }

    if (!editing && !form.password) {
      setError('La contraseña es requerida para nuevos usuarios')
      return
    }

    if (form.password && form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (form.password && form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    const payload = {
      username: form.username,
      email: form.email,
      role: form.role,
      is_active: form.is_active,
      permissions: form.permissions,
    }

    if (form.password) {
      payload.password = form.password
    }

    try {
      if (editing) {
        await authAPI.updateUser(editing, payload)
      } else {
        await authAPI.createUser(payload)
      }
      setShowModal(false)
      resetForm()
      fetchUsers()
    } catch (err) {
      setError(err.response?.data?.error || 'Error guardando usuario')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este usuario?')) return
    try {
      await authAPI.deleteUser(id)
      fetchUsers()
    } catch (e) {
      alert(e.response?.data?.error || 'Error eliminando usuario')
    }
  }

  const togglePermission = (key) => {
    setForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      }
    }))
  }

  const setAllPermissions = (value) => {
    const perms = {}
    ALL_PERMISSIONS.forEach(p => perms[p.key] = value)
    setForm(prev => ({ ...prev, permissions: perms }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Gestion de Usuarios</h1>
          <p className="text-sm text-slate-500 mt-1">Crear, editar y controlar accesos al menu</p>
        </div>
        <button onClick={handleOpenCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Usuario
        </button>
      </div>

      {error && !showModal && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2">
          <XCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="card">
        <div className="p-4 border-b border-slate-800 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-medium text-slate-200">{users.length} usuarios</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Cargando...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No hay usuarios registrados</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {users.map((u) => (
              <div key={u.id} className="p-4 flex items-center justify-between hover:bg-slate-800/20 transition">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${u.role === 'admin' ? 'bg-indigo-500/10' : 'bg-slate-800'}`}>
                    <UserCog className={`w-5 h-5 ${u.role === 'admin' ? 'text-indigo-400' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-200">{u.username}</p>
                      {u.role === 'admin' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 uppercase tracking-wider">
                          Admin
                        </span>
                      )}
                      {!u.is_active && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 uppercase tracking-wider">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{u.email}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {ALL_PERMISSIONS.map(p => {
                        const hasPerm = u.role === 'admin' || u.permissions?.[p.key]
                        return (
                          <span
                            key={p.key}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${hasPerm ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-600'}`}
                          >
                            {hasPerm ? '✓' : '✗'} {p.label}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(u)}
                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-slate-100">
                {editing ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Usuario</label>
                  <input
                    type="text"
                    required
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    {editing ? 'Nueva Contraseña (opcional)' : 'Contraseña'}
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Confirmar</label>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Rol</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="input-field w-full"
                  >
                    <option value="user">Usuario</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="is_active" className="text-sm text-slate-300">Usuario activo</label>
                </div>
              </div>

              {/* Permisos */}
              <div className="border-t border-slate-800 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-400" />
                    Permisos de Menu
                  </h4>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAllPermissions(true)}
                      className="text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition"
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllPermissions(false)}
                      className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400 hover:bg-slate-700 transition"
                    >
                      Ninguno
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {ALL_PERMISSIONS.map((perm) => (
                    <div
                      key={perm.key}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-800 hover:border-slate-700 transition"
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={!!form.permissions[perm.key]}
                          onChange={() => togglePermission(perm.key)}
                          className="w-4 h-4 mt-0.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-200">{perm.label}</p>
                          <p className="text-xs text-slate-500">{perm.desc}</p>
                        </div>
                      </div>
                      {form.permissions[perm.key] ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <X className="w-4 h-4 text-slate-600" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  {editing ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}