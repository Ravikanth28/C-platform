import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav className="bg-slate-800 border-b border-slate-700 px-6 py-3 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-indigo-400 hover:text-indigo-300 transition">
          <span className="text-xl">{'</>'}</span>
          <span>CodePlatform</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-6">
          {user ? (
            <>
              <Link
                to="/problems"
                className={`text-sm transition ${isActive('/problems') ? 'text-indigo-400' : 'text-slate-300 hover:text-white'}`}
              >
                Problems
              </Link>

              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  className={`text-sm transition ${isActive('/admin') ? 'text-indigo-400' : 'text-slate-300 hover:text-white'}`}
                >
                  Admin Panel
                </Link>
              )}

              <div className="flex items-center gap-2 pl-4 border-l border-slate-700">
                {user.role === 'admin' && (
                  <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full">Admin</span>
                )}
                <span className="text-slate-400 text-sm">{user.username}</span>
                <button
                  onClick={handleLogout}
                  className="text-slate-500 hover:text-red-400 text-sm transition ml-2"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="text-slate-300 hover:text-white text-sm transition">Login</Link>
              <Link
                to="/register"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-1.5 rounded-lg transition"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
