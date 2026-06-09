export default function StatCard({ icon: Icon, label, value, sub, color = '#6366f1', trend }) {
  return (
    <div className="stat-card">
      <div
        className="stat-icon"
        style={{ background: `${color}18`, border: `1px solid ${color}25` }}
      >
        <Icon size={22} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide truncate">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value ?? '—'}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={`ml-auto text-xs font-semibold px-2 py-1 rounded-lg ${trend >= 0 ? 'text-emerald-400 bg-emerald/10' : 'text-rose-400 bg-rose/10'}`}>
          {trend >= 0 ? '+' : ''}{trend}%
        </div>
      )}
    </div>
  )
}
