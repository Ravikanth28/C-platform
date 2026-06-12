// Reusable auto-schedule control: On/Off toggle + Daily/Weekly + IST time (+ weekday).
// value = { frequency: 'off'|'daily'|'weekly', hour: 0-23, dow: 0-6 }
// onChange(nextValue) is called whenever anything changes.

const HOURS = Array.from({ length: 24 }, (_, h) => {
  const ap = h < 12 ? 'AM' : 'PM'
  const hr = h % 12 === 0 ? 12 : h % 12
  return [h, `${hr}:00 ${ap}`]
})
const DOWS = [['Mon', 0], ['Tue', 1], ['Wed', 2], ['Thu', 3], ['Fri', 4], ['Sat', 5], ['Sun', 6]]

export default function ScheduleControl({ value, onChange }) {
  const { frequency = 'off', hour = 9, dow = 0 } = value || {}
  const on = frequency !== 'off'
  const set = (patch) => onChange({ frequency, hour, dow, ...patch })

  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      {on && (
        <>
          <div className="flex gap-1">
            {['daily', 'weekly'].map((f) => (
              <button key={f} onClick={() => set({ frequency: f })}
                className="px-3 py-1 rounded-lg text-[12.5px] capitalize border transition-colors"
                style={frequency === f
                  ? { borderColor: 'var(--brand-solid)', color: 'var(--brand)', background: 'var(--brandL)' }
                  : { borderColor: 'var(--line)', color: 'var(--t3)' }}>{f}</button>
            ))}
          </div>

          {frequency === 'weekly' && (
            <select className="input py-1 text-[12.5px] max-w-[88px]" value={dow}
              onChange={(e) => set({ dow: Number(e.target.value) })}>
              {DOWS.map(([l, v]) => <option key={v} value={v}>{l}</option>)}
            </select>
          )}

          <span className="text-[12px] text-t4">at</span>
          <select className="input py-1 text-[12.5px] max-w-[104px]" value={hour}
            onChange={(e) => set({ hour: Number(e.target.value) })}>
            {HOURS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <span className="text-[12px] text-t4">IST</span>
        </>
      )}

      <button onClick={() => set({ frequency: on ? 'off' : 'daily' })}
        role="switch" aria-checked={on} title={on ? 'Disable' : 'Enable'}
        className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
        style={{ background: on ? 'var(--brand-solid)' : 'var(--line-strong)' }}>
        <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
          style={{ left: on ? '22px' : '2px' }} />
      </button>
    </div>
  )
}
