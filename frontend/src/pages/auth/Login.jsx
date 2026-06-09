import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Terminal, Eye, EyeOff, LogIn } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate   = useNavigate()
  const [form, setForm]       = useState({ username: '', password: '' })
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      login(data.access_token, data.user)
      toast.success(`Welcome back, ${data.user.full_name || data.user.username}!`)
      navigate(data.user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#060b14] flex items-center justify-center px-4">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-violet/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow mb-4">
            <Terminal size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">CodeForge</h1>
          <p className="text-slate-400 text-sm mt-1">C Programming Learning Platform</p>
        </div>

        {/* Card */}
        <div className="card glow-border">
          <h2 className="text-lg font-semibold text-white mb-1">Sign In</h2>
          <p className="text-slate-400 text-sm mb-6">Enter your credentials to continue</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Username</label>
              <input
                className="input"
                placeholder="your_username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 mt-2"
            >
              <LogIn size={16} />
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-5">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary font-medium transition-colors">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
