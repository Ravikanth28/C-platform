import { useEffect, useState } from 'react'
import { Plus, Trash2, Search, Code2, Wand2, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/client'
import Modal          from '../../components/ui/Modal'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { DifficultyBadge } from '../../components/ui/Badge'

const EMPTY_TC = { input_data: '', expected_output: '', is_hidden: false }

function ProblemForm({ initial, onSave, onCancel, isTest = false }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(
    initial || {
      title: '', description: '', topics: '', difficulty: 'medium',
      duration: 60, is_for_all: true, assigned_user_ids: '',
      start_time: '', end_time: '',
      tab_switch_detect: false, copy_paste_disable: false,
      f12_disable: false, fullscreen_required: false,
      test_cases: [{ ...EMPTY_TC }],
    }
  )
  const [aiLoading, setAiLoading] = useState(false)
  const [aiForm, setAiForm] = useState({ topic: '', difficulty: 'medium', description: '' })

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [k]: val })
  }
  const setTc = (i, k, v) => {
    const tcs = [...form.test_cases]
    tcs[i] = { ...tcs[i], [k]: v }
    setForm({ ...form, test_cases: tcs })
  }
  const addTc   = () => setForm({ ...form, test_cases: [...form.test_cases, { ...EMPTY_TC }] })
  const removeTc = (i) => setForm({ ...form, test_cases: form.test_cases.filter((_, idx) => idx !== i) })

  const generateAI = async () => {
    if (!aiForm.topic) { toast.error('Enter a topic'); return }
    setAiLoading(true)
    try {
      const { data } = await api.post('/ai/generate-problem', aiForm)
      setForm((f) => ({
        ...f,
        title:       data.title       || f.title,
        description: data.description || f.description,
        topics:      data.topics      || f.topics,
        difficulty:  data.difficulty  || f.difficulty,
        test_cases:  data.test_cases?.length ? data.test_cases : f.test_cases,
      }))
      toast.success('AI problem generated!')
      setStep(1)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'AI generation failed')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSave = () => {
    if (!form.title || !form.description) { toast.error('Title and description required'); return }
    const payload = {
      ...form,
      mode: isTest ? 'test' : 'practice',
      start_time: form.start_time || null,
      end_time:   form.end_time   || null,
      duration:   Number(form.duration) || null,
      assigned_user_ids: form.assigned_user_ids
        ? form.assigned_user_ids.split(',').map((x) => parseInt(x.trim())).filter(Boolean)
        : [],
    }
    onSave(payload)
  }

  return (
    <div>
      {/* Step tabs */}
      <div className="flex gap-2 mb-5">
        <button type="button" onClick={() => setStep(1)}
          className={step === 1 ? 'tab-active' : 'tab-inactive'}>
          1 · Problem Details
        </button>
        <button type="button" onClick={() => setStep(2)}
          className={step === 2 ? 'tab-active' : 'tab-inactive'}>
          2 · Questions & Test Cases
        </button>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={set('title')} placeholder="Problem title" required />
          </div>
          <div>
            <label className="label">Description *</label>
            <textarea className="input resize-none" rows={5} value={form.description} onChange={set('description')}
              placeholder="Problem statement, examples, constraints…" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Topics</label>
              <input className="input" value={form.topics} onChange={set('topics')} placeholder="arrays, loops, strings" />
            </div>
            <div>
              <label className="label">Difficulty</label>
              <select className="input" value={form.difficulty} onChange={set('difficulty')}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Time</label>
              <input type="datetime-local" className="input" value={form.start_time} onChange={set('start_time')} />
            </div>
            <div>
              <label className="label">End Time</label>
              <input type="datetime-local" className="input" value={form.end_time} onChange={set('end_time')} />
            </div>
          </div>
          <div>
            <label className="label">Duration (minutes)</label>
            <input type="number" className="input" value={form.duration} onChange={set('duration')} min={5} />
          </div>
          <div>
            <label className="label">Assign To</label>
            <div className="flex gap-3 mb-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                <input type="radio" className="accent-primary" checked={form.is_for_all} onChange={() => setForm({ ...form, is_for_all: true })} />
                All Students
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                <input type="radio" className="accent-primary" checked={!form.is_for_all} onChange={() => setForm({ ...form, is_for_all: false })} />
                Specific Students
              </label>
            </div>
            {!form.is_for_all && (
              <input className="input" value={form.assigned_user_ids} onChange={set('assigned_user_ids')}
                placeholder="Student IDs separated by commas (e.g. 1,2,3)" />
            )}
          </div>

          {/* Proctoring – only for test mode */}
          {isTest && (
            <div>
              <label className="label">Proctoring Options</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['tab_switch_detect',   'Tab Switch Detection'],
                  ['copy_paste_disable',  'Disable Copy-Paste'],
                  ['f12_disable',         'Disable F12 / DevTools'],
                  ['fullscreen_required', 'Require Full Screen'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-[rgba(255,255,255,0.06)] cursor-pointer hover:border-primary/30 transition-colors">
                    <input type="checkbox" className="accent-primary" checked={form[key]} onChange={set(key)} />
                    <span className="text-sm text-slate-300">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <button type="button" onClick={() => setStep(2)} className="btn-primary w-full justify-center">
            Next: Add Questions →
          </button>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-4">
          {/* AI Generator */}
          <div className="rounded-lg border border-violet/20 bg-violet/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wand2 size={16} className="text-violet-400" />
              <span className="text-sm font-semibold text-violet-300">AI Question Generator</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input className="input" placeholder="Topic (e.g. arrays, pointers)"
                value={aiForm.topic} onChange={(e) => setAiForm({ ...aiForm, topic: e.target.value })} />
              <select className="input" value={aiForm.difficulty}
                onChange={(e) => setAiForm({ ...aiForm, difficulty: e.target.value })}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <input className="input mb-3" placeholder="Additional context (optional)"
              value={aiForm.description} onChange={(e) => setAiForm({ ...aiForm, description: e.target.value })} />
            <button type="button" onClick={generateAI} disabled={aiLoading}
              className="btn-secondary w-full justify-center">
              <Wand2 size={14} />
              {aiLoading ? 'Generating with AI…' : 'Generate with AI'}
            </button>
          </div>

          {/* Test cases */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label !mb-0">Test Cases</label>
              <button type="button" onClick={addTc} className="btn-ghost text-xs">
                <Plus size={13} /> Add Test Case
              </button>
            </div>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {form.test_cases.map((tc, i) => (
                <div key={i} className="rounded-lg border border-[rgba(255,255,255,0.06)] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Case #{i + 1}</span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                        <input type="checkbox" className="accent-primary" checked={tc.is_hidden}
                          onChange={(e) => setTc(i, 'is_hidden', e.target.checked)} />
                        Hidden
                      </label>
                      {form.test_cases.length > 1 && (
                        <button type="button" onClick={() => removeTc(i)}
                          className="text-rose-400 hover:text-rose transition-colors">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label text-[10px]">Input</label>
                      <textarea className="input font-mono text-xs resize-none" rows={3}
                        value={tc.input_data} onChange={(e) => setTc(i, 'input_data', e.target.value)}
                        placeholder="stdin input" />
                    </div>
                    <div>
                      <label className="label text-[10px]">Expected Output</label>
                      <textarea className="input font-mono text-xs resize-none" rows={3}
                        value={tc.expected_output} onChange={(e) => setTc(i, 'expected_output', e.target.value)}
                        placeholder="expected stdout" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">← Back</button>
            <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
            <button type="button" onClick={handleSave} className="btn-primary flex-1">
              Save Problem
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PracticeMode() {
  const [problems, setProblems] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving]     = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/problems?mode=practice').then((r) => setProblems(r.data)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleSave = async (payload) => {
    setSaving(true)
    try {
      await api.post('/problems/', payload)
      toast.success('Problem created!')
      setShowModal(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this problem?')) return
    await api.delete(`/problems/${id}`)
    toast.success('Problem deleted')
    load()
  }

  const filtered = problems.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <PageLoader />

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Practice Mode</h1>
          <p className="text-slate-400 text-sm mt-0.5">Create and manage practice problems</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} /> Create Problem
        </button>
      </div>

      <div className="relative max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input className="input pl-8" placeholder="Search problems…" value={search}
          onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Code2 size={40} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-400">No practice problems yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <ProblemCard key={p.id} problem={p} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Practice Problem" size="lg">
        <ProblemForm
          isTest={false}
          onSave={handleSave}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  )
}

function ProblemCard({ problem: p, onDelete }) {
  return (
    <div className="card-hover">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-white text-sm leading-snug line-clamp-2 flex-1 pr-2">{p.title}</h3>
        <button onClick={() => onDelete(p.id)} className="btn-ghost text-rose-400 hover:text-rose p-1 flex-shrink-0">
          <Trash2 size={14} />
        </button>
      </div>
      {p.topics && <p className="text-xs text-slate-500 mb-2">{p.topics}</p>}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <DifficultyBadge level={p.difficulty} />
        <span className="badge-blue badge">{p.test_cases_count} test cases</span>
        {p.is_for_all ? <span className="badge-green badge">All</span> : <span className="badge-violet badge">Assigned</span>}
      </div>
      <p className="text-xs text-slate-500 line-clamp-2">{p.description}</p>
    </div>
  )
}
