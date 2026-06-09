import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'

const DIFF_STYLE = {
  easy:   'text-green-400  bg-green-400/10  border-green-400/20',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  hard:   'text-red-400    bg-red-400/10    border-red-400/20',
}

export default function ProblemList() {
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    client.get('/problems/')
      .then((res) => setProblems(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const visible = problems.filter((p) => {
    const matchDiff = filter === 'all' || p.difficulty === filter
    const q = search.toLowerCase()
    const matchSearch = p.title.toLowerCase().includes(q) || p.tags.toLowerCase().includes(q)
    return matchDiff && matchSearch
  })

  if (loading) {
    return <div className="text-center text-slate-400 py-20">Loading problems…</div>
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-white mb-8">Problems</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or tag…"
          className="flex-1 min-w-48 bg-slate-800 text-white px-4 py-2.5 rounded-lg border border-slate-600 focus:border-indigo-500 focus:outline-none"
        />
        <div className="flex gap-2">
          {['all', 'easy', 'medium', 'hard'].map((d) => (
            <button
              key={d}
              onClick={() => setFilter(d)}
              className={`px-4 py-2 rounded-lg text-sm capitalize transition ${
                filter === d
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <p className="text-slate-500 text-sm mb-4">
        Showing {visible.length} of {problems.length} problems
      </p>

      {/* List */}
      <div className="space-y-2">
        {visible.length === 0 ? (
          <div className="text-slate-500 text-center py-16">No problems match your filter.</div>
        ) : (
          visible.map((p, idx) => (
            <Link
              key={p.id}
              to={`/problems/${p.id}`}
              className="flex items-center justify-between bg-slate-800 border border-slate-700 hover:border-indigo-500/50 rounded-xl px-5 py-4 transition group"
            >
              <div className="flex items-center gap-4">
                <span className="text-slate-600 text-sm w-7 shrink-0">{idx + 1}.</span>
                <span className="text-white font-medium group-hover:text-indigo-400 transition">
                  {p.title}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {p.tags &&
                  p.tags
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .slice(0, 3)
                    .map((tag) => (
                      <span
                        key={tag}
                        className="hidden sm:inline-block bg-slate-700 text-slate-400 text-xs px-2 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full capitalize border font-medium ${DIFF_STYLE[p.difficulty]}`}
                >
                  {p.difficulty}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
