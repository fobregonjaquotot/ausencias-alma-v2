import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import './App.css'

export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export default function App() {
  const [session, setSession] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [empId, setEmpId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchRole(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchRole(session.user.id)
      else { setUserRole(null); setEmpId(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchRole(userId) {
    const { data } = await supabase
      .from('ausencias_roles')
      .select('role, emp_id')
      .eq('user_id', userId)
      .single()
    setUserRole(data?.role || 'comercial')
    setEmpId(data?.emp_id || null)
    setLoading(false)
  }

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-logo">GA</div>
      <div className="loading-text">Cargando...</div>
    </div>
  )

  return (
    <AuthContext.Provider value={{ session, userRole, empId }}>
      {!session ? <Login /> : <Dashboard />}
    </AuthContext.Provider>
  )
}
