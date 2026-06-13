import { useEffect, useState } from 'react'
import { templatesAPI } from '../services/api'
import {
  FileCode, Plus, Pencil, Trash2, X, Save,
  Layers, Shield, Server, Filter, Network, Globe
} from 'lucide-react'

const typeIcons = {
  aci_bridge_domain: Layers,
  aci_contract: Shield,
  aci_epg: Server,
  aci_vrf: Globe,
  aci_tenant: Network,
  aci_ap: Network,
  aci_filter: Filter,
  aci_l3out: Network,
  general_config: FileCode,
}

export default function Templates() {
  const [templates, setTemplates] = useState([])
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('')

  const [form, setForm] = useState({
    name: '',
    template_type: 'aci_bridge_domain',
    description: '',
    content: '',
    variables: '',
    version: '1.0',
    status: 'active'
  })

  useEffect(() => {
    fetchTemplates()
    fetchTypes()
  }, [])

  const fetchTemplates = async () => {
    try {
      const res = await templatesAPI.list({ per_page: 100 })
      setTemplates(res.data.items || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchTypes = async () => {
    try {
      const res = await templatesAPI.types()
      setTypes(res.data.types || [])
    } catch (e) {
      console.error(e)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = {
      ...form,
      variables: form.variables ? JSON.parse(form.variables) : null
    }
    try {
      if (editing) {
        await templatesAPI.update(editing, data)
      } else {
        await templatesAPI.create(data)
      }
      setShowModal(false)
      setEditing(null)
      resetForm()
      fetchTemplates()
    } catch (e) {
      alert(e.response?.data?.error || 'Error guardando plantilla')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta plantilla?')) return
    try {
      await templatesAPI.delete(id)
      fetchTemplates()
    } catch (e) {
      alert('Error eliminando plantilla')
    }
  }

  const handleEdit = (t) => {
    setEditing(t.id)
    setForm({
      name: t.name,
      template_type: t.template_type,
      description: t.description || '',
      content: t.content,
      variables: t.variables ? JSON.stringify(t.variables, null, 2) : '',
      version: t.version,
      status: t.status
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setForm({
      name: '',
      template_type: 'aci_bridge_domain',
      description: '',
      content: '',
      variables: '',
      version: '1.0',
      status: 'active'
    })
  }

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(filter.toLowerCase()) ||
    t.template_type.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Plantillas ACI</h1>
          <p className="text-sm text-slate-500 mt-1">Gestión de configuraciones Cisco ACI</p>
        </div>
        <button
          onClick={() => { setEditing(null); resetForm(); setShowModal(true) }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva Plantilla
        </button>
      </div>

      <div className="card">
        <div className="p-4 border-b border-slate-800 flex items-center gap-4">
          <input
            type="text"
            placeholder="Buscar plantillas..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input-field flex-1 max-w-sm"
          />
          <span className="text-xs text-slate-500">{filtered.length} plantillas</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No hay plantillas</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filtered.map((t) => {
              const Icon = typeIcons[t.template_type] || FileCode
              return (
                <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-800/20 transition">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-500/10">
                      <Icon className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{t.name}</p>
                      <p className="text-xs text-slate-500 font-mono">
                        {t.template_type} · v{t.version} · {t.status}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(t)}
                      className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-slate-100">
                {editing ? 'Editar Plantilla' : 'Nueva Plantilla'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Tipo</label>
                  <select
                    value={form.template_type}
                    onChange={(e) => setForm({ ...form, template_type: e.target.value })}
                    className="input-field w-full"
                  >
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Descripción</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Contenido</label>
                <textarea
                  required
                  rows={10}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="input-field w-full font-mono text-xs"
                  placeholder="## Configuración ACI..."
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Variables (JSON)</label>
                <textarea
                  rows={3}
                  value={form.variables}
                  onChange={(e) => setForm({ ...form, variables: e.target.value })}
                  className="input-field w-full font-mono text-xs"
                  placeholder='{"tenant": "TENANT1", "bd_name": "BD_PROD"}'
                />
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
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}