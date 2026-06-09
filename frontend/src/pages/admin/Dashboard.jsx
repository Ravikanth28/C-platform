import { useEffect, useState } from 'react'
import {
  Users, FileText, Code2, FlaskConical,
  CheckCircle, TrendingUp, Activity, Clock,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import api from '../../api/client'
import StatCard      from '../../components/ui/StatCard'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { StatusBadge } from '../../components/ui/Badge'
import { formatDistanceToNow } from 'date-fns'

const COLORS = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#06b6d4']

const mockActivity = [
  { day: 'Mon', submissions: 12, students: 5 },
  { day: 'Tue', submissions: 18, students: 8 },
  { day: 'Wed', submissions: 9,  students: 4 },
  { day: 'Thu', submissions: 25, students: 11 },
  { day: 'Fri', submissions: 31, students: 15 },
  { day: 'Sat', submissions: 14, students: 7 },
  { day: 'Sun', submissions: 8,  students: 3 },
]

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/dashboard').then((r) => setData(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />
  if (!data)   return <p className="text-slate-400">Failed to load dashboard.</p>

  const { stats, recent_submissions, students } = data

  const pieData = [
    { name: 'Accepted',    value: stats.accepted_submissions },
    { name: 'Other',       value: Math.max(0, stats.total_submissions - stats.accepted_submissions) },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Platform overview and analytics</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}       label="Total Students"   value={stats.total_students}   color="#6366f1" />
        <StatCard icon={FileText}    label="Notes Uploaded"   value={stats.total_notes}      color="#06b6d4" />
        <StatCard icon={Code2}       label="Practice Sets"    value={stats.total_practice}   color="#10b981" />
        <StatCard icon={FlaskConical} label="Tests Created"   value={stats.total_tests}      color="#8b5cf6" />
        <StatCard icon={Activity}    label="Total Submissions" value={stats.total_submissions} color="#f59e0b" />
        <StatCard icon={CheckCircle} label="Accepted"         value={stats.accepted_submissions} color="#10b981" />
        <StatCard
          icon={TrendingUp}
          label="Acceptance Rate"
          value={stats.total_submissions ? `${Math.round((stats.accepted_submissions / stats.total_submissions) * 100)}%` : '0%'}
          color="#06b6d4"
        />
        <StatCard icon={Users} label="Admins" value={stats.total_admins} color="#f43f5e" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity area chart */}
        <div className="card lg:col-span-2">
          <h3 className="section-title mb-4">Weekly Activity</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={mockActivity} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="gradSub" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradStu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#0f1628', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Area type="monotone" dataKey="submissions" stroke="#6366f1" strokeWidth={2} fill="url(#gradSub)" name="Submissions" />
              <Area type="monotone" dataKey="students"    stroke="#10b981" strokeWidth={2} fill="url(#gradStu)" name="Active Students" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="card flex flex-col">
          <h3 className="section-title mb-4">Submission Status</h3>
          <div className="flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
                />
                <Tooltip
                  contentStyle={{ background: '#0f1628', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent submissions */}
        <div className="card">
          <h3 className="section-title mb-4">Recent Submissions</h3>
          {recent_submissions.length === 0 ? (
            <p className="text-slate-500 text-sm">No submissions yet.</p>
          ) : (
            <div className="space-y-2">
              {recent_submissions.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.02] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{s.problem}</p>
                    <p className="text-xs text-slate-500">{s.student}</p>
                  </div>
                  <StatusBadge status={s.status} />
                  <span className="text-xs text-slate-500 hidden sm:block">
                    {formatDistanceToNow(new Date(s.submitted_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent students */}
        <div className="card">
          <h3 className="section-title mb-4">Recent Students</h3>
          {students.length === 0 ? (
            <p className="text-slate-500 text-sm">No students registered yet.</p>
          ) : (
            <div className="space-y-2">
              {students.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.02] transition-colors">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: s.avatar_color || '#6366f1' }}
                  >
                    {(s.full_name || s.username || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{s.full_name || s.username}</p>
                    <p className="text-xs text-slate-500 truncate">{s.email}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock size={11} />
                    {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
