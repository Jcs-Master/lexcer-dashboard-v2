import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para agregar token JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Interceptor para manejar errores 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  register: (username, email, password) => api.post('/auth/register', { username, email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
  // Admin users CRUD
  listUsers: (params) => api.get('/auth/users', { params }),
  createUser: (data) => api.post('/auth/users', data),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
  updateUserPermissions: (id, permissions) => api.put(`/auth/users/${id}/permissions`, { permissions }),
}

// Templates API
export const templatesAPI = {
  list: (params) => api.get('/templates', { params }),
  get: (id) => api.get(`/templates/${id}`),
  create: (data) => api.post('/templates', data),
  update: (id, data) => api.put(`/templates/${id}`, data),
  delete: (id) => api.delete(`/templates/${id}`),
  types: () => api.get('/templates/types'),
}

// Commands API
export const commandsAPI = {
  upload: (formData) => api.post('/commands/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  listLogs: (params) => api.get('/commands/logs', { params }),
  getLog: (id) => api.get(`/commands/logs/${id}`),
  deleteLog: (id) => api.delete(`/commands/logs/${id}`),
  parsePreview: (content) => api.post('/commands/parse-preview', { content }),
}

// ACI API
export const aciAPI = {
  generatePaths: (formData) => api.post('/aci-paths/generate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  generateInterfaces: (formData) => api.post('/aci-interfaces/generate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  listGenerations: (params) => api.get('/auth/aci-generations', { params }),
  downloadFile: (genId, fileType) => api.get(`/auth/aci-generations/${genId}/download/${fileType}`),
}

export default api
