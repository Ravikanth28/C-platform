import { useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Search, Pause, Play } from 'lucide-react'
import api from '../../api/client'
import { PageLoader } from '../../components/ui/LoadingSpinner'

const STATUS = {
  healthy:  { color: 'var(--ok)',   label: 'All systems operational' },
  degraded: { color: 'var(--warn)', label: 'Operational — with warnings' },
  down:     { color: 'var(--err)',  label: 'Service disruption' },
}

const INTERVALS = [['Off', 0], ['2s', 2000], ['5s', 5000], ['15s', 15000]]

const methodColor = (m) => ({
  GET: 'var(--info)', POST: 'var(--ok)', PUT: 'var(--warn)',
  PATCH: 'var(--warn)', DELETE: 'var(--err)',
}[m] || 'var(--t3)')

const statusColor = (s) =>
  s >= 500 ? 'var(--err)' : s >= 400 ? 'var(--warn)' : s >= 300 ? 'var(--info)' : 'var(--ok)'

const levelColor = (l) =>
  (l === 'ERROR' || l === 'CRITICAL') ? 'var(--err)' : l === 'WARNING' ? 'var(--warn)' : 'var(--t3)'

export default function AdminSystem() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [interval_, setInterval_] = useState(5000)
  const [kind, setKind]   = useState('all')   // all | http | log
  const [query, setQuery] = useState('')
  const scrollRef = useRef(null)

  const load = (initial = false) => {
    if (!initial) setRefreshing(true)
    api.get('/admin/health')
      .then(r => setData(r.data))
      .catch(() => setData({ status: 'down', checks: [], logs: [] }))
      .finally(() => { setLoading(false); setRefreshing(false) })
  }

  useEffect(() => { load(true) }, [])

  useEffect(() => {
    if (!interval_) return
    const t = setInterval(() => load(), interval_)
    return () => clearInterval(t)
  }, [interval_])

  const logs = data?.logs || []
  const counts = useMemo(() => ({
    http: logs.filter(l => l.kind === 'http').length,
    log:  logs.filter(l => l.kind !== 'http').length,
    err:  logs.filter(l => (l.kind === 'http' && l.status >= 400) ||
                           (l.kind !== 'http' && (l.level === 'ERROR' || l.level === 'CRITICAL'))).length,
  }), [logs])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return logs.filter(l => {
      if (kind === 'http' && l.kind !== 'http') return false
      if (kind === 'log'  && l.kind === 'http') return false
      if (!q) return true
      const hay = l.kind === 'http'
        ? `${l.method} ${l.path} ${l.status}`
        : `${l.level} ${l.logger} ${l.message}`
      return hay.toLowerCase().includes(q)
    })
  }, [logs, kind, query])

  if (loading) return <PageLoader />

  const st = STATUS[data.status] || { color: 'var(--t4)', label: data.status }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="h1">System health</h1>
          <p className="section-sub mt-1">Live status of backend services &amp; dependencies, with a real-time request log.</p>
        </div>
        <button className="btn-secondary btn-sm" onClick={() => load()}>
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Overall status */}
      <div className="card flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: st.color }} />
        <span className="font-serif font-semibold text-[18px]" style={{ color: st.color }}>{st.label}</span>
      </div>

      {/* Service checks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.checks.map(c => (
          <div key={c.name} className="card">
            <div className="flex items-center gap-2">
              {c.ok
                ? <CheckCircle2 size={16} style={{ color: 'var(--ok)' }} />
                : (c.critical ? <XCircle size={16} style={{ color: 'var(--err)' }} /> : <AlertTriangle size={16} style={{ color: 'var(--warn)' }} />)}
              <span className="text-[13px] font-semibold text-t">{c.name}</span>
              {!c.critical && <span className="text-[10px] text-t4 border border-line rounded px-1 ml-auto">optional</span>}
            </div>
            <p className="text-[12px] text-t3 mt-1.5 font-mono break-words">{c.detail}</p>
          </div>
        ))}
      </div>

      {/* Live console */}
      <div className="card">
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <h3 className="h3">Live activity</h3>

          {/* kind filter */}
          <div className="flex gap-1 ml-1">
            {[['All', 'all', logs.length], ['HTTP', 'http', counts.http], ['Logs', 'log', counts.log]].map(([label, val, n]) => (
              <button key={val} onClick={() => setKind(val)}
                className={`text-[12px] px-2.5 py-1 rounded-md border ${kind === val ? 'tab-active' : 'tab-inactive'}`}>
                {label} <span className="tabular opacity-70">{n}</span>
              </button>
            ))}
            {counts.err > 0 && (
              <span className="text-[12px] px-2.5 py-1 rounded-md self-center"
                style={{ color: 'var(--err)', background: 'color-mix(in srgb, var(--err) 12%, transparent)' }}>
                {counts.err} error{counts.err > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* search */}
          <div className="relative ml-auto min-w-[180px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-t4" />
            <input className="input pl-8 py-1 text-[12px]" placeholder="Filter…"
              value={query} onChange={e => setQuery(e.target.value)} />
          </div>

          {/* live-tail interval */}
          <div className="flex items-center gap-1">
            {interval_ ? <Play size={13} className="text-ok" /> : <Pause size={13} className="text-t4" />}
            <select className="input py-1 text-[12px] max-w-[78px]" value={interval_}
              onChange={e => setInterval_(Number(e.target.value))}>
              {INTERVALS.map(([l, v]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-t4 text-[13px]">{logs.length === 0 ? 'No activity captured yet — interact with the app and it will stream here.' : 'No entries match the current filter.'}</p>
        ) : (
          <div ref={scrollRef} className="surface-inset border border-line rounded-lg max-h-[46vh] overflow-auto font-mono text-[12px]">
            {filtered.map((l) => (
              <div key={l.seq} className="flex items-start gap-2.5 px-3 py-1.5 border-b border-[color:var(--beige-rule)] last:border-0 hover:bg-[color:var(--surface)]">
                <span className="text-t4 tabular flex-shrink-0">{l.time}</span>
                {l.kind === 'http' ? (
                  <>
                    <span className="font-bold flex-shrink-0 w-[52px]" style={{ color: methodColor(l.method) }}>{l.method}</span>
                    <span className="font-bold tabular flex-shrink-0 w-9" style={{ color: statusColor(l.status) }}>{l.status}</span>
                    <span className="text-t2 break-all flex-1">{l.path}</span>
                    <span className="text-t4 tabular flex-shrink-0">{l.ms}ms</span>
                  </>
                ) : (
                  <>
                    <span className="font-semibold flex-shrink-0 w-[52px]" style={{ color: levelColor(l.level) }}>{l.level}</span>
                    <span className="text-t4 flex-shrink-0 truncate max-w-[130px]">{l.logger}</span>
                    <span className="text-t2 break-words flex-1">{l.message}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
