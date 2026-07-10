import { useEffect, useRef, useState } from 'react'
import { RefreshCw, FlaskConical, AlertTriangle, Clock, Play, Users } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import api from '../../api/client'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { DifficultyBadge } from '../../components/ui/Badge'

const STATUS = {
  attending:   { label: 'In test', color: 'var(--ok)' },
  done:        { label: 'Done',    color: 'var(--brand)' },
  not_started: { label: 'Not started', color: 'var(--t4)' },
}

const fmtLeft = (s) => {
  if (s == null) return '—'
  if (s <= 0) return 'time up'
  const m = Math.floor(s / 60), sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

export default function AdminLiveTests() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [live, setLive] = useState(true)
  const [selectedTestId, setSelectedTestId] = useState(null)
  const timer = useRef(null)

  const load = (initial = false) => {
    if (!initial) setRefreshing(true)
    api.get('/admin/test-live').then(r => setData(r.data)).catch(() => setData({ tests: [] }))
      .finally(() => { setLoading(false); setRefreshing(false) })
  }
  useEffect(() => { load(true) }, [])
  useEffect(() => {
    if (!live) return
    timer.current = setInterval(() => load(), 8000)
    return () => clearInterval(timer.current)
  }, [live])

  if (loading) return <PageLoader />
  const tests = data?.tests || []
  const totalAttending = tests.reduce((s, t) => s + t.attending, 0)
  
  if (selectedTestId) {
    const t = tests.find(x => x.id === selectedTestId)
    if (!t) {
      setSelectedTestId(null)
      return null
    }
    return (
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-start gap-3 flex-wrap">
          <button onClick={() => setSelectedTestId(null)} className="btn-secondary h-9 px-3 flex items-center justify-center gap-2">
            <span className="text-[16px] leading-none mb-0.5">←</span> Back
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="h1 truncate">{t.title}</h1>
            <p className="section-sub mt-0.5">Live monitoring for this test.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[12px]"
              style={{ borderColor: 'color-mix(in srgb, var(--ok) 35%, transparent)', background: 'color-mix(in srgb, var(--ok) 10%, transparent)' }}>
              <span className="relative flex h-2 w-2">
                {t.attending > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: 'var(--ok)' }} />}
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--ok)' }} />
              </span>
              {t.attending} in test now
            </span>
            <button onClick={() => setLive(l => !l)} className={live ? 'tab-active' : 'tab-inactive'}>{live ? 'Live · 8s' : 'Paused'}</button>
            <button className="btn-secondary btn-sm h-9" onClick={() => load()}><RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh</button>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <DifficultyBadge level={t.difficulty} />
              {t.duration ? <span className="text-[12px] text-t4 tabular flex items-center gap-1"><Clock size={11} />{t.duration}m</span> : null}
              <span className="text-[12px] text-t4 flex items-center gap-1"><Users size={11} />{t.total}</span>
            </div>
            <div className="flex items-center gap-2 text-[12px]">
              <Pill label="In test" n={t.attending} color="var(--ok)" pulse={t.attending > 0} />
              <Pill label="Done" n={t.done} color="var(--brand)" />
              <Pill label="Not started" n={t.not_done} color="var(--t3)" />
            </div>
          </div>

          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-left whitespace-nowrap text-[13px]">
              <thead>
                <tr className="table-header">
                  <th className="table-cell">Student</th>
                  <th className="table-cell">Status</th>
                  <th className="table-cell">Time left</th>
                  <th className="table-cell">Violations</th>
                  <th className="table-cell">Runs</th>
                  <th className="table-cell">Passed</th>
                  <th className="table-cell">Last active</th>
                </tr>
              </thead>
              <tbody>
                {t.students.map(s => {
                  const st = STATUS[s.status] || STATUS.not_started
                  const low = s.time_left != null && s.time_left <= 120 && s.time_left > 0
                  return (
                    <tr key={s.id} className="table-row hover:bg-t-[rgba(255,255,255,0.02)] transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-semibold font-serif flex-shrink-0"
                            style={{ background: s.avatar_color || 'var(--brand-solid)' }}>{(s.name || '?')[0].toUpperCase()}</div>
                          <span className="text-t font-medium">{s.name}</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: st.color }}>
                          {s.status === 'attending' && <span className="animate-pulse w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />}
                          {st.label}
                        </span>
                      </td>
                      <td className="table-cell tabular" style={low ? { color: 'var(--err)', fontWeight: 600 } : { color: 'var(--t3)' }}>
                        {s.status === 'done' ? '—' : fmtLeft(s.time_left)}
                      </td>
                      <td className="table-cell tabular">
                        {s.violations > 0
                          ? <span className="inline-flex items-center gap-1" style={{ color: 'var(--err)', fontWeight: 600 }}><AlertTriangle size={12} />{s.violations}</span>
                          : <span className="text-t4">0</span>}
                      </td>
                      <td className="table-cell tabular text-t3"><span className="inline-flex items-center gap-1"><Play size={11} />{s.runs}</span></td>
                      <td className="table-cell tabular">
                        {s.total_cases > 0
                          ? <span style={{ color: s.passed === s.total_cases ? 'var(--ok)' : s.passed > 0 ? 'var(--warn)' : 'var(--t3)' }}>{s.passed}/{s.total_cases}</span>
                          : <span className="text-t4">—</span>}
                      </td>
                      <td className="table-cell text-t4 text-xs tabular">
                        {s.last_active ? formatDistanceToNow(new Date(s.last_active), { addSuffix: true }) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="h1">Live Tests</h1>
          <p className="section-sub mt-0.5">Real-time proctoring — status, time left, violations, runs and score per student.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[12px]"
            style={{ borderColor: 'color-mix(in srgb, var(--ok) 35%, transparent)', background: 'color-mix(in srgb, var(--ok) 10%, transparent)' }}>
            <span className="relative flex h-2 w-2">
              {totalAttending > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: 'var(--ok)' }} />}
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--ok)' }} />
            </span>
            {totalAttending} in a test now
          </span>
          <button onClick={() => setLive(l => !l)} className={live ? 'tab-active' : 'tab-inactive'}>{live ? 'Live · 8s' : 'Paused'}</button>
          <button className="btn-secondary btn-sm h-9" onClick={() => load()}><RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh</button>
        </div>
      </div>

      {tests.length === 0 ? (
        <div className="card text-center py-16">
          <FlaskConical size={40} className="mx-auto text-t4 mb-3" />
          <p className="text-t3">No active tests with assigned students. Create one in Test Mode to monitor it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map(t => (
            <div key={t.id} onClick={() => setSelectedTestId(t.id)} className="card cursor-pointer hover:border-line-strong transition-colors duration-200">
              <div className="flex items-start justify-between mb-2">
                <h3 className="h3 text-sm line-clamp-2 flex-1 pr-2">{t.title}</h3>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <DifficultyBadge level={t.difficulty} />
                {t.duration && <span className="badge-gray badge"><Clock size={11} className="mr-1 inline" />{t.duration}m</span>}
                <span className="badge-gray badge"><Users size={11} className="mr-1 inline" />{t.total} Students</span>
              </div>
              
              <div className="mt-4 pt-3 border-t border-line grid grid-cols-3 gap-2">
                <div className="flex flex-col">
                  <span className="text-[10px] text-t4 font-semibold uppercase tracking-wider mb-1">In Test</span>
                  <div className="flex items-center gap-1.5">
                    {t.attending > 0 && <span className="animate-pulse w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ok)' }} />}
                    <span className="tabular font-semibold text-[14px]" style={{ color: 'var(--ok)' }}>{t.attending}</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-t4 font-semibold uppercase tracking-wider mb-1">Done</span>
                  <span className="tabular font-semibold text-[14px]" style={{ color: 'var(--brand)' }}>{t.done}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-t4 font-semibold uppercase tracking-wider mb-1">Not Started</span>
                  <span className="tabular font-semibold text-[14px]" style={{ color: 'var(--t3)' }}>{t.not_done}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Pill({ label, n, color, pulse }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-line">
      {pulse && <span className="animate-pulse w-1.5 h-1.5 rounded-full" style={{ background: color }} />}
      <span className="tabular font-semibold" style={{ color }}>{n}</span>
      <span className="text-t4">{label}</span>
    </span>
  )
}
