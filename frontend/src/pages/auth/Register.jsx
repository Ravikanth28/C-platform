import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Terminal, Eye, EyeOff, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'

export default function Register() {
  const { login } = useAuth()
  const navigate   = useNavigate()
  const [form, setForm] = useState({
    username: '', email: '', full_name: '', password: '', confirm: '', role: 'student',
  })
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return }
    if (form.password.length < 6)       { toast.error('Password must be ≥ 6 characters'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', {
        username: form.username,
        email:    form.email,
        full_name: form.full_name,
        password: form.password,
        role:     form.role,
      })
      login(data.access_token, data.user)
      toast.success('Account created!')
      navigate(data.user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <div className="min-h-screen bg-[#060b14] flex items-center justify-center px-4 py-8">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-violet/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow mb-4">
            <Terminal size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">CodeForge</h1>
          <p className="text-slate-400 text-sm mt-1">Create your account</p>
        </div>

        <div className="card glow-border">
          <h2 className="text-lg font-semibold text-white mb-1">Register</h2>
          <p className="text-slate-400 text-sm mb-6">Join the platform today</p>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Username *</label>
                <input className="input" placeholder="username" value={form.username} onChange={set('username')} required />
              </div>
              <div>
                <label className="label">Full Name</label>
                <input className="input" placeholder="John Doe" value={form.full_name} onChange={set('full_name')} />
              </div>
            </div>

            <div>
              <label className="label">Email *</label>
              <input className="input" type="email" placeholder="you@email.com" value={form.email} onChange={set('email')} required />
            </div>

            <div>
              <label className="label">Role</label>
              <select
                className="input"
                value={form.role}
                onChange={set('role')}
              >
                <option value="student">Student</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="label">Password *</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={set('password')}
                  required
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">Confirm Password *</label>
              <input
                className="input"
                type="password"
                placeholder="Re-enter password"
                value={form.confirm}
                onChange={set('confirm')}
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-2">
              <UserPlus size={16} />
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary font-medium transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
