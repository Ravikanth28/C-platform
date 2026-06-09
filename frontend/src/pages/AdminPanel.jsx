import { useState, useEffect } from 'react'
import client from '../api/client'

const BLANK_PROBLEM = { title: '', description: '', difficulty: 'easy', tags: '' }
const BLANK_TC      = { input_data: '', expected_output: '', is_sample: true }

export default function AdminPanel() {
  const [problems, setProblems]           = useState([])
  const [selected, setSelected]           = useState(null)   // full problem with test_cases
  const [showForm, setShowForm]           = useState(false)
  const [editTarget, setEditTarget]       = useState(null)   // problem being edited
  const [problemForm, setProblemForm]     = useState(BLANK_PROBLEM)
  const [tcForm, setTcForm]               = useState(BLANK_TC)
  const [saving, setSaving]               = useState(false)
  const [flash, setFlash]                 = useState(null)   // { msg, ok }

  const notify = (msg, ok = true) => {
    setFlash({ msg, ok })
    setTimeout(() => setFlash(null), 3000)
  }

  const loadProblems = () =>
    client.get('/problems/').then((r) => setProblems(r.data)).catch(console.error)

  const loadSelected = (id) =>
    client.get(`/problems/${id}`).then((r) => setSelected(r.data)).catch(console.error)

  useEffect(() => { loadProblems() }, [])

  /* ── Problem CRUD ─────────────────────────────────────────────────────── */

  const openCreate = () => {
    setEditTarget(null)
    setProblemForm(BLANK_PROBLEM)
    setShowForm(true)
  }

  const openEdit = (p) => {
    setEditTarget(p)
    setProblemForm({ title: p.title, description: p.description, difficulty: p.difficulty, tags: p.tags })
    setShowForm(true)
  }

  const saveProblem = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editTarget) {
        await client.put(`/problems/${editTarget.id}`, problemForm)
        notify('Problem updated.')
      } else {
        await client.post('/problems/', problemForm)
        notify('Problem created.')
      }
      setShowForm(false)
      setEditTarget(null)
      setProblemForm(BLANK_PROBLEM)
      loadProblems()
    } catch (err) {
      notify(err.response?.data?.detail || 'Save failed.', false)
    } finally {
      setSaving(false)
    }
  }

  const deleteProblem = async (id) => {
    if (!window.confirm('Delete this problem and all its test cases?')) return
    await client.delete(`/problems/${id}`)
    if (selected?.id === id) setSelected(null)
    loadProblems()
    notify('Problem deleted.')
  }

  /* ── Test case CRUD ───────────────────────────────────────────────────── */

  const addTestCase = async (e) => {
    e.preventDefault()
    if (!selected) return
    setSaving(true)
    try {
      await client.post(`/problems/${selected.id}/testcases`, tcForm)
      setTcForm(BLANK_TC)
      loadSelected(selected.id)
      notify('Test case added.')
    } catch (err) {
      notify(err.response?.data?.detail || 'Failed.', false)
    } finally {
      setSaving(false)
    }
  }

  const deleteTestCase = async (tcId) => {
    await client.delete(`/problems/${selected.id}/testcases/${tcId}`)
    loadSelected(selected.id)
  }

  /* ── Render ────────────────────────────────────────────────────────────── */

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
        <button
          onClick={showForm ? () => setShowForm(false) : openCreate}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition"
        >
          {showForm ? '✕ Cancel' : '+ New Problem'}
        </button>
      </div>

      {/* Flash message */}
      {flash && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm ${flash.ok ? 'bg-green-900/40 text-green-300 border border-green-700/50' : 'bg-red-900/40 text-red-300 border border-red-700/50'}`}>
          {flash.msg}
        </div>
      )}

      {/* Problem form */}
      {showForm && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 mb-6">
          <h2 className="text-base font-semibold text-white mb-4">{editTarget ? 'Edit Problem' : 'Create Problem'}</h2>
          <form onSubmit={saveProblem} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm text-slate-400 block mb-1">Title</label>
                <input
                  value={problemForm.title}
                  onChange={(e) => setProblemForm({ ...problemForm, title: e.target.value })}
                  className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-indigo-500 focus:outline-none"
                  placeholder="Problem title"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-1">Difficulty</label>
                <select
                  value={problemForm.difficulty}
                  onChange={(e) => setProblemForm({ ...problemForm, difficulty: e.target.value })}
                  className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:outline-none"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-1">Tags (comma-separated)</label>
                <input
                  value={problemForm.tags}
                  onChange={(e) => setProblemForm({ ...problemForm, tags: e.target.value })}
                  className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-indigo-500 focus:outline-none"
                  placeholder="arrays, dp, strings"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm text-slate-400 block mb-1">Description</label>
                <textarea
                  value={problemForm.description}
                  onChange={(e) => setProblemForm({ ...problemForm, description: e.target.value })}
                  className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-indigo-500 focus:outline-none font-mono text-sm"
                  rows={7}
                  placeholder="Full problem statement…"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm transition"
            >
              {saving ? 'Saving…' : editTarget ? 'Update Problem' : 'Create Problem'}
            </button>
          </form>
        </div>
      )}

      {/* Main grid: problem list  |  test cases */}
      <div className="grid grid-cols-5 gap-6">

        {/* Problem list */}
        <div className="col-span-2 space-y-2">
          <p className="text-slate-500 text-sm mb-2">{problems.length} problem(s)</p>
          {problems.map((p) => (
            <div
              key={p.id}
              onClick={() => loadSelected(p.id)}
              className={`bg-slate-800 border rounded-xl px-4 py-3 cursor-pointer transition ${
                selected?.id === p.id ? 'border-indigo-500' : 'border-slate-700 hover:border-slate-500'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{p.title}</p>
                  <p className={`text-xs mt-0.5 capitalize ${
                    p.difficulty === 'easy' ? 'text-green-400' :
                    p.difficulty === 'medium' ? 'text-yellow-400' : 'text-red-400'
                  }`}>{p.difficulty}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(p) }}
                    className="text-slate-500 hover:text-indigo-400 text-xs px-2 py-1 rounded transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteProblem(p.id) }}
                    className="text-slate-500 hover:text-red-400 text-xs px-2 py-1 rounded transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Test cases */}
        <div className="col-span-3">
          {selected ? (
            <>
              <p className="text-slate-400 text-sm mb-4">
                Test cases for <span className="text-white font-medium">{selected.title}</span>
              </p>

              {/* Add TC form */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4">
                <p className="text-slate-300 text-sm font-medium mb-3">Add Test Case</p>
                <form onSubmit={addTestCase} className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Input (stdin) — leave blank if none</label>
                    <textarea
                      value={tcForm.input_data}
                      onChange={(e) => setTcForm({ ...tcForm, input_data: e.target.value })}
                      rows={2}
                      className="w-full bg-slate-700 text-white text-sm font-mono px-3 py-2 rounded-lg border border-slate-600 focus:outline-none"
                      placeholder="e.g.  5\n1 2 3 4 5"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Expected Output <span className="text-red-400">*</span></label>
                    <textarea
                      value={tcForm.expected_output}
                      onChange={(e) => setTcForm({ ...tcForm, expected_output: e.target.value })}
                      rows={2}
                      className="w-full bg-slate-700 text-white text-sm font-mono px-3 py-2 rounded-lg border border-slate-600 focus:outline-none"
                      placeholder="e.g.  15"
                      required
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tcForm.is_sample}
                        onChange={(e) => setTcForm({ ...tcForm, is_sample: e.target.checked })}
                        className="w-4 h-4 accent-indigo-500"
                      />
                      Show as sample (visible to students)
                    </label>
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded-lg transition"
                    >
                      {saving ? 'Adding…' : 'Add'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Existing test cases */}
              <div className="space-y-2">
                {selected.test_cases.length === 0 ? (
                  <p className="text-slate-600 text-sm">No test cases yet.</p>
                ) : (
                  selected.test_cases.map((tc, i) => (
                    <div key={tc.id} className="bg-slate-800 border border-slate-700 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400 text-xs">
                          Test #{i + 1}
                          {tc.is_sample && <span className="ml-2 text-green-400 font-medium">(sample)</span>}
                        </span>
                        <button
                          onClick={() => deleteTestCase(tc.id)}
                          className="text-slate-600 hover:text-red-400 text-xs transition"
                        >
                          Delete
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-slate-600 mb-0.5">Input</p>
                          <pre className="bg-slate-900 text-slate-300 text-xs px-2 py-1.5 rounded overflow-x-auto">
                            {tc.input_data || '(empty)'}
                          </pre>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600 mb-0.5">Expected</p>
                          <pre className="bg-slate-900 text-slate-300 text-xs px-2 py-1.5 rounded overflow-x-auto">
                            {tc.expected_output}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full min-h-48 text-slate-600 text-sm">
              Click a problem on the left to manage its test cases.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
