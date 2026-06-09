import { Menu, Bell } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Topbar({ onMenuClick }) {
  const { user } = useAuth()

  return (
    <header className="flex items-center justify-between px-6 h-14 border-b border-[rgba(255,255,255,0.05)] bg-[#0a1020]/80 backdrop-blur-md flex-shrink-0">
      <button
        onClick={onMenuClick}
        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
      >
        <Menu size={20} />
      </button>

      <div className="flex items-center gap-3">
        <button className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors relative">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary rounded-full" />
        </button>

        {user && (
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: user.avatar_color || '#6366f1' }}
            >
              {(user.full_name || user.username || '?')[0].toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-medium text-white leading-tight">{user.full_name || user.username}</p>
              <p className="text-[10px] text-slate-500 capitalize">{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
