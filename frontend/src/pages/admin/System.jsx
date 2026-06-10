import { useEffect, useState } from 'react'
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import api from '../../api/client'
import { PageLoader } from '../../components/ui/LoadingSpinner'

const STATUS = {
  healthy:  { color: 'var(--ok)',   label: 'All systems operational' },
  degraded: { color: 'var(--warn)', label: 'Operational — with warnings' },
  down:     { color: 'var(--err)',  label: 'Service disruption' },
}

export default function AdminSystem() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = (initial = false) => {
    if (!initial) setRefreshing(true)
    api.get('/admin/health')
      .then(r => setData(r.data))
      .catch(() => setData({ status: 'down', checks: [], logs: [] }))
      .finally(() => { setLoading(false); setRefreshing(false) })
  }

  useEffect(() => {
    load(true)
    const t = setInterval(() => load(), 15000)
    return () => clearInterval(t)
  }, [])

  if (loading) return <PageLoader />

  const st = STATUS[data.status] || { color: 'var(--t4)', label: data.status }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="h1">System health</h1>
          <p className="section-sub mt-1">Live status of backend services &amp; dependencies, with recent logs.</p>
        </div>
        <button className="btn-secondary btn-sm" onClick={() => load()}>
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Overall status */}
      <div className="card flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: st.color }} />
        <span className="font-serif font-semibold text-[18px]" style={{ color: st.color }}>{st.label}</span>
        <span className="text-t4 text-[12px] ml-auto">auto-refreshes every 15s</span>
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

      {/* Recent logs */}
      <div className="card">
        <h3 className="h3 mb-3">Recent logs <span className="text-[12px] text-t4 font-sans font-normal">· warnings &amp; errors</span></h3>
        {data.logs.length === 0 ? (
          <p className="text-t4 text-[13px]">No warnings or errors logged.</p>
        ) : (
          <div className="surface-inset border border-line rounded-lg max-h-[42vh] overflow-auto font-mono text-[12px]">
            {data.logs.map((l, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-1.5 border-b border-[color:var(--beige-rule)] last:border-0">
                <span className="text-t4 tabular flex-shrink-0">{l.time}</span>
                <span className="font-semibold flex-shrink-0 w-14" style={{ color: (l.level === 'ERROR' || l.level === 'CRITICAL') ? 'var(--err)' : 'var(--warn)' }}>{l.level}</span>
                <span className="text-t4 flex-shrink-0 truncate max-w-[120px]">{l.logger}</span>
                <span className="text-t2 break-words flex-1">{l.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
