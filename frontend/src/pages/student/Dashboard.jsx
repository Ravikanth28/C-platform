import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Code2, CheckCircle, TrendingUp, BookOpen,
  FlaskConical, Clock, ArrowRight,
} from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import api from '../../api/client'
import StatCard      from '../../components/ui/StatCard'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { StatusBadge, ModeBadge } from '../../components/ui/Badge'
import { formatDistanceToNow } from 'date-fns'

const radarData = [
  { skill: 'Arrays',   score: 80 },
  { skill: 'Pointers', score: 65 },
  { skill: 'Strings',  score: 70 },
  { skill: 'Loops',    score: 90 },
  { skill: 'Functions', score: 75 },
  { skill: 'Structs',  score: 55 },
]

export default function StudentDashboard() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/students/dashboard').then((r) => setData(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />
  if (!data) return <p className="text-slate-400">Failed to load.</p>

  const { stats, recent_submissions, upcoming_tests } = data

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">My Dashboard</h1>
        <p className="text-slate-400 text-sm mt-0.5">Your progress and activity at a glance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Code2}       label="Total Submissions" value={stats.total_submissions}   color="#6366f1" />
        <StatCard icon={CheckCircle} label="Accepted"          value={stats.accepted}             color="#10b981" />
        <StatCard icon={TrendingUp}  label="Average Score"     value={`${stats.avg_score}%`}      color="#f59e0b" />
        <StatCard icon={BookOpen}    label="Notes Available"   value={stats.notes_available}      color="#06b6d4" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Radar */}
        <div className="card">
          <h3 className="section-title mb-4">Skill Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.06)" />
              <PolarAngleAxis dataKey="skill" tick={{ fill: '#64748b', fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9 }} />
              <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Upcoming tests */}
        <div className="card">
          <h3 className="section-title mb-4 flex items-center gap-2">
            <FlaskConical size={16} className="text-violet-400" /> Upcoming Tests
          </h3>
          {upcoming_tests.length === 0 ? (
            <p className="text-slate-500 text-sm">No upcoming tests.</p>
          ) : (
            <div className="space-y-2">
              {upcoming_tests.map((t) => (
                <div key={t.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-dark-300 border border-[rgba(255,255,255,0.04)] hover:border-primary/20 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-white">{t.title}</p>
                    {t.start_time && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock size={10} />
                        {formatDistanceToNow(new Date(t.start_time), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                  <Link to={`/code/${t.id}`} className="btn-secondary text-xs py-1 px-3">
                    Enter <ArrowRight size={12} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent submissions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title">Recent Submissions</h3>
          <Link to="/student/reports" className="text-xs text-primary-400 hover:text-primary">View all →</Link>
        </div>
        {recent_submissions.length === 0 ? (
          <p className="text-slate-500 text-sm">No submissions yet. Start coding!</p>
        ) : (
          <div className="table-container">
            <table className="w-full text-left">
              <thead>
                <tr className="table-header">
                  <th className="table-cell">Problem</th>
                  <th className="table-cell">Mode</th>
                  <th className="table-cell">Status</th>
                  <th className="table-cell">Score</th>
                  <th className="table-cell">When</th>
                </tr>
              </thead>
              <tbody>
                {recent_submissions.map((s) => (
                  <tr key={s.id} className="table-row">
                    <td className="table-cell text-white font-medium">{s.problem_title}</td>
                    <td className="table-cell"><ModeBadge mode={s.mode} /></td>
                    <td className="table-cell"><StatusBadge status={s.status} /></td>
                    <td className="table-cell">
                      <span className={s.score >= 100 ? 'text-emerald-400' : s.score > 0 ? 'text-amber-400' : 'text-rose-400'}>
                        {s.score}%
                      </span>
                    </td>
                    <td className="table-cell text-slate-500 text-xs">
                      {formatDistanceToNow(new Date(s.submitted_at), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
