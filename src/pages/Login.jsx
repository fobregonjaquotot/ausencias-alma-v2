import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Email o contraseña incorrectos')
    setLoading(false)
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">GA</div>
        <div className="login-brand">Grupo Alma Iberia</div>
        <div className="login-title">Gestión de Ausencias</div>
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button className="btn btn-primary login-btn" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <div className="login-footer">Uso interno · Grupo Alma Iberia</div>
      </div>
    </div>
  )
}
