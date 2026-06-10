import { useEffect, useState } from 'react'
import { Eye, CheckCircle, XCircle, Clock, Code2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import api from '../../api/client'
import Modal          from '../../components/ui/Modal'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { StatusBadge, ModeBadge } from '../../components/ui/Badge'

export default function StudentReports() {
  const [rows, setRows]     = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode]     = useState('')
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = () => {
    setLoading(true)
    const params = mode ? `?mode=${mode}` : ''
    api.get(`/reports/${params}`).then((r) => setRows(r.data)).finally(() => setLoading(false))
  }
  useEffect(load, [mode])

  const openDetail = async (subId) => {
    setDetailLoading(true)
    setDetail('loading')
    const { data } = await api.get(`/reports/${subId}`)
    setDetail(data)
    setDetailLoading(false)
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="h1">My Reports</h1>
        <p className="section-sub mt-0.5">Your submission history and results</p>
      </div>

      <div className="flex gap-2">
        {[['All', ''], ['Practice', 'practice'], ['Tests', 'test']].map(([label, val]) => (
          <button key={val} onClick={() => setMode(val)}
            className={mode === val ? 'tab-active' : 'tab-inactive'}>{label}</button>
        ))}
      </div>

      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="table-header">
                <th className="table-cell">#</th>
                <th className="table-cell">Problem</th>
                <th className="table-cell">Mode</th>
                <th className="table-cell">Status</th>
                <th className="table-cell">Score</th>
                <th className="table-cell">Passed</th>
                <th className="table-cell">Time</th>
                <th className="table-cell">Submitted</th>
                <th className="table-cell">Report</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={9} className="table-cell text-center py-12 text-t4">No submissions yet.</td></tr>
              )}
              {rows.map((r, i) => (
                <tr key={r.submission_id} className="table-row">
                  <td className="table-cell text-t4 tabular">{i + 1}</td>
                  <td className="table-cell text-t font-medium">{r.problem_title}</td>
                  <td className="table-cell"><ModeBadge mode={r.mode} /></td>
                  <td className="table-cell"><StatusBadge status={r.status} /></td>
                  <td className="table-cell">
                    <span className="tabular" style={{ color: r.score >= 100 ? 'var(--ok)' : r.score > 0 ? 'var(--warn)' : 'var(--err)' }}>
                      {r.score}%
                    </span>
                  </td>
                  <td className="table-cell text-t3 tabular">{r.test_cases_passed}/{r.test_cases_total}</td>
                  <td className="table-cell text-t3 tabular">
                    {r.time_taken != null ? `${Math.floor(r.time_taken / 60)}m ${r.time_taken % 60}s` : '—'}
                  </td>
                  <td className="table-cell text-t4 text-xs tabular">
                    {formatDistanceToNow(new Date(r.submitted_at), { addSuffix: true })}
                  </td>
                  <td className="table-cell">
                    <button onClick={() => openDetail(r.submission_id)}
                      className="btn-secondary text-xs py-1 px-3">
                      <Eye size={12} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Submission Report" size="lg">
        {detailLoading || detail === 'loading' ? <PageLoader /> : detail && <ReportDetail report={detail} />}
      </Modal>
    </div>
  )
}

function ReportDetail({ report: r }) {
  const [showCode, setShowCode] = useState(false)
  const passed = r.test_cases_passed
  const total  = r.test_cases_total
  const pct    = total ? Math.round((passed / total) * 100) : 0

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          ['Problem', r.problem_title],
          ['Mode',    null, <ModeBadge mode={r.mode} />],
          ['Status',  null, <StatusBadge status={r.status} />],
          ['Score',   `${r.score}%`],
          ['Passed',  `${passed}/${total}`],
          ['Time',    r.time_taken != null ? `${Math.floor(r.time_taken / 60)}m ${r.time_taken % 60}s` : '—'],
        ].map(([label, val, el]) => (
          <div key={label} className="rounded-lg surface-inset p-3">
            <p className="text-xs text-t4 mb-1">{label}</p>
            {el || <p className="text-sm font-semibold text-t">{val}</p>}
          </div>
        ))}
      </div>

      <div>
        <div className="flex justify-between text-xs text-t3 mb-1.5">
          <span>Progress</span><span className="tabular">{pct}%</span>
        </div>
        <div className="h-2 rounded-full surface-inset overflow-hidden">
          <div className="h-full rounded-full" style={{
            width: `${pct}%`,
            background: pct === 100 ? 'var(--ok)' : pct > 50 ? 'var(--warn)' : 'var(--err)',
          }} />
        </div>
      </div>

      {r.tab_switches > 0 && (
        <div className="p-3 rounded-lg border border-line text-sm" style={{ background: 'color-mix(in srgb, var(--warn) 12%, transparent)', color: 'var(--warn)' }}>
          ⚠ Tab switches recorded: {r.tab_switches}
        </div>
      )}

      {r.results?.length > 0 && (
        <div>
          <p className="label">Test Case Results</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {r.results.map((res, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg surface-inset">
                {res.status === 'Passed'
                  ? <CheckCircle size={13} style={{ color: 'var(--ok)' }} />
                  : <XCircle    size={13} style={{ color: 'var(--err)' }} />}
                <span className="text-xs text-t3">Case #{i + 1}</span>
                <StatusBadge status={res.status} />
                {res.execution_time != null && (
                  <span className="text-xs text-t4 ml-auto flex items-center gap-1 tabular">
                    <Clock size={10} />{res.execution_time.toFixed(1)}ms
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {r.code && (
        <div>
          <button onClick={() => setShowCode(!showCode)} className="btn-ghost text-xs flex items-center gap-1">
            <Code2 size={13} /> {showCode ? 'Hide' : 'View'} My Code
          </button>
          {showCode && (
            <pre className="mt-2 p-3 rounded-lg surface-inset text-xs text-t2 font-mono overflow-x-auto max-h-64">
              {r.code}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
