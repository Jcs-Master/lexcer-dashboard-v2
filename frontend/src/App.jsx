import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import PrivateRoute from './components/PrivateRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Templates from './pages/Templates'
import CommandReader from './pages/CommandReader'
import Settings from './pages/Settings'
import UsersPage from './pages/Users'
import AciPaths from './pages/AciPaths'
import AciInterfaces from './pages/AciInterfaces'
import AciHistory from './pages/AciHistory'

export default function App() {
  const { authenticated } = useAuth()

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={authenticated ? <Navigate to="/" replace /> : <Login />}
      />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="templates" element={<Templates />} />
        <Route path="commands" element={<CommandReader />} />
        <Route path="aci-paths" element={<AciPaths />} />
        <Route path="aci-interfaces" element={<AciInterfaces />} />
        <Route path="aci-history" element={<AciHistory />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}