import React, { createContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

export const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setLoading(false)
        return
      }
      try {
        const response = await authAPI.me()
        setUser(response.data.user)
        setAuthenticated(true)
      } catch (error) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [])

  const login = async (username, password) => {
    const response = await authAPI.login(username, password)
    const { access_token, refresh_token, user: userData } = response.data
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
    setUser(userData)
    setAuthenticated(true)
    return response.data
  }

  const logout = async () => {
    try {
      await authAPI.logout()
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
    setAuthenticated(false)
  }

  const register = async (username, email, password) => {
    const response = await authAPI.register(username, email, password)
    const { access_token, refresh_token, user: userData } = response.data
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
    setUser(userData)
    setAuthenticated(true)
    return response.data
  }

  // Helper para verificar permisos
  const hasPermission = (key) => {
    if (!user) return false
    if (user.role === 'admin') return true
    return user.permissions?.[key] === true
  }

  const isAdmin = () => user?.role === 'admin'

  return (
    <AuthContext.Provider value={{
      user, authenticated, loading,
      login, logout, register,
      hasPermission, isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}