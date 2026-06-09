import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, BookOpen, Code2, FlaskConical,
  BarChart3, LogOut, ChevronLeft, Terminal, X,
} from 'lucide-react'
import toast from 'react-hot-toast'

const adminNav = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/notes',     icon: BookOpen,         label: 'Notes' },
  { to: '/admin/practice',  icon: Code2,            label: 'Practice Mode' },
  { to: '/admin/tests',     icon: FlaskConical,     label: 'Test Mode' },
  { to: '/admin/reports',   icon: BarChart3,        label: 'Reports' },
]

const studentNav = [
  { to: '/student/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/student/notes',     icon: BookOpen,         label: 'Notes' },
  { to: '/student/practice',  icon: Code2,            label: 'Practice' },
  { to: '/student/tests',     icon: FlaskConical,     label: 'Tests' },
  { to: '/student/reports',   icon: BarChart3,        label: 'Reports' },
]

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const nav = user?.role === 'admin' ? adminNav : studentNav

  const handleLogout = () => {
    logout()
    toast.success('Logged out')
    navigate('/login')
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed lg:relative z-40 flex flex-col h-full
          transition-all duration-300 ease-in-out
          bg-gradient-to-b from-[#0a1020] to-[#060b14]
          border-r border-[rgba(255,255,255,0.05)]
          ${open ? 'w-64 translate-x-0' : 'w-0 lg:w-16 -translate-x-full lg:translate-x-0'}
          overflow-hidden
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-[rgba(255,255,255,0.05)]">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-sm">
            <Terminal size={18} className="text-white" />
          </div>
          {open && (
            <div className="min-w-0">
              <span className="font-bold text-white text-sm tracking-wide">CodeForge</span>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                {user?.role === 'admin' ? 'Admin Portal' : 'Student Portal'}
              </p>
            </div>
          )}
          <button
            onClick={onClose}
            className="ml-auto text-slate-500 hover:text-white transition-colors lg:hidden"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto overflow-x-hidden">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'
              }
              title={!open ? label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {open && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="px-2 py-4 border-t border-[rgba(255,255,255,0.05)] space-y-1">
          {open && user && (
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: user.avatar_color || '#6366f1' }}
              >
                {(user.full_name || user.username || '?')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.full_name || user.username}</p>
                <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="sidebar-item-inactive w-full"
            title={!open ? 'Logout' : undefined}
          >
            <LogOut size={18} className="flex-shrink-0 text-rose-400" />
            {open && <span className="text-rose-400">Logout</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
