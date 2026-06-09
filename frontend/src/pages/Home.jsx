import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const features = [
  {
    icon: '🧩',
    title: 'Curated Problems',
    desc: 'Easy, medium, and hard problems across algorithms, data structures, and more.',
  },
  {
    icon: '⚡',
    title: 'Instant Code Runner',
    desc: 'Python runs in-process, JavaScript via Node — results in under a second.',
  },
  {
    icon: '📊',
    title: 'Track Your Progress',
    desc: 'Every submission is saved. See accepted, wrong, or error verdicts at a glance.',
  },
]

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="max-w-5xl mx-auto px-6 py-20 text-center">
      <h1 className="text-5xl font-extrabold text-white mb-4 leading-tight">
        Learn to code,{' '}
        <span className="text-indigo-400">one problem at a time</span>
      </h1>
      <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
        A platform for students to practise coding problems with an instant, in-process execution engine.
      </p>

      <div className="flex gap-4 justify-center">
        {user ? (
          <Link
            to="/problems"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl text-lg font-medium transition"
          >
            Browse Problems →
          </Link>
        ) : (
          <>
            <Link
              to="/register"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl text-lg font-medium transition"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white px-8 py-3 rounded-xl text-lg font-medium transition"
            >
              Login
            </Link>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
        {features.map((f) => (
          <div
            key={f.title}
            className="bg-slate-800 border border-slate-700 rounded-2xl p-6 text-left hover:border-indigo-500/40 transition"
          >
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="text-white font-semibold mb-2">{f.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
