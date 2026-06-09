import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import client from '../api/client'
import CodeEditor from '../components/CodeEditor'

const DEFAULT_CODE = {
  python: `# Write your solution here\n\n`,
  javascript: `// Write your solution here\n\n`,
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    \n    return 0;\n}\n`,
}

const DIFF_STYLE = {
  easy:   'text-green-400  bg-green-400/10  border-green-400/30',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  hard:   'text-red-400    bg-red-400/10    border-red-400/30',
}

const STATUS_COLOR = {
  accepted:      'text-green-400',
  wrong_answer:  'text-red-400',
  runtime_error: 'text-orange-400',
  time_limit:    'text-yellow-400',
  success:       'text-green-400',
  error:         'text-red-400',
  tle:           'text-yellow-400',
}

const STATUS_LABEL = {
  accepted:      '✓ Accepted',
  wrong_answer:  '✗ Wrong Answer',
  runtime_error: '💥 Runtime Error',
  time_limit:    '⏱ Time Limit Exceeded',
}

export default function ProblemDetail() {
  const { id } = useParams()
  const [problem, setProblem]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [language, setLanguage]     = useState('python')
  const [code, setCode]             = useState(DEFAULT_CODE.python)
  const [stdin, setStdin]           = useState('')
  const [output, setOutput]         = useState(null)
  const [running, setRunning]       = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [leftTab, setLeftTab]       = useState('description')

  useEffect(() => {
    client.get(`/problems/${id}`)
      .then((res) => setProblem(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const switchLanguage = (lang) => {
    setLanguage(lang)
    setCode(DEFAULT_CODE[lang] ?? '')
  }

  const handleRun = async () => {
    setRunning(true)
    setOutput(null)
    try {
      const { data } = await client.post('/submissions/run', { code, language, stdin })
      setOutput({ kind: 'run', ...data })
    } catch (err) {
      setOutput({ kind: 'run', status: 'error', output: '', error: err.response?.data?.detail ?? 'Request failed' })
    } finally {
      setRunning(false)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setOutput(null)
    try {
      const { data } = await client.post('/submissions/submit', {
        problem_id: Number(id),
        code,
        language,
      })
      setOutput({ kind: 'submit', ...data })
    } catch (err) {
      setOutput({ kind: 'submit', status: 'runtime_error', output: '', error: err.response?.data?.detail ?? 'Submission failed' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="text-center text-slate-400 py-20">Loading…</div>
  if (!problem) return <div className="text-center text-red-400 py-20">Problem not found.</div>

  const sampleCases = problem.test_cases.filter((tc) => tc.is_sample)

  return (
    <div className="flex" style={{ height: 'calc(100vh - 57px)' }}>

      {/* ── Left panel: description ──────────────────────────────────────── */}
      <div className="w-5/12 flex flex-col bg-slate-800 border-r border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-3 border-b border-slate-700 shrink-0">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h1 className="text-lg font-bold text-white leading-snug">{problem.title}</h1>
            <span className={`text-xs px-2.5 py-0.5 rounded-full capitalize border font-medium shrink-0 ${DIFF_STYLE[problem.difficulty]}`}>
              {problem.difficulty}
            </span>
          </div>

          {problem.tags && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {problem.tags.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => (
                <span key={tag} className="bg-slate-700 text-slate-400 text-xs px-2 py-0.5 rounded">{tag}</span>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-5 border-b border-slate-700 -mb-3">
            {['description', 'examples'].map((tab) => (
              <button
                key={tab}
                onClick={() => setLeftTab(tab)}
                className={`pb-2 text-sm capitalize border-b-2 transition ${
                  leftTab === tab
                    ? 'text-indigo-400 border-indigo-400'
                    : 'text-slate-500 border-transparent hover:text-slate-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {leftTab === 'description' ? (
            <pre className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {problem.description}
            </pre>
          ) : (
            <div className="space-y-4">
              {sampleCases.length === 0 ? (
                <p className="text-slate-500 text-sm">No sample test cases for this problem.</p>
              ) : (
                sampleCases.map((tc, i) => (
                  <div key={tc.id} className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
                    <p className="text-slate-400 text-xs font-medium mb-3">Example {i + 1}</p>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-slate-500 uppercase tracking-wide">Input</span>
                        <pre className="mt-1 bg-slate-900 text-green-300 text-sm px-3 py-2 rounded overflow-x-auto">
                          {tc.input_data || '(no input)'}
                        </pre>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 uppercase tracking-wide">Expected Output</span>
                        <pre className="mt-1 bg-slate-900 text-blue-300 text-sm px-3 py-2 rounded overflow-x-auto">
                          {tc.expected_output}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel: editor + output ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700 shrink-0">
          <select
            value={language}
            onChange={(e) => switchLanguage(e.target.value)}
            className="bg-slate-700 text-white text-sm px-3 py-1.5 rounded-lg border border-slate-600 focus:outline-none cursor-pointer"
          >
            <option value="python">Python 3</option>
            <option value="javascript">JavaScript (Node)</option>
            <option value="cpp">C++ (g++)</option>
          </select>

          <div className="flex gap-2">
            <button
              onClick={handleRun}
              disabled={running || submitting}
              className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-sm px-4 py-1.5 rounded-lg transition"
            >
              {running ? 'Running…' : '▶ Run'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={running || submitting}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm px-4 py-1.5 rounded-lg transition"
            >
              {submitting ? 'Submitting…' : '↑ Submit'}
            </button>
          </div>
        </div>

        {/* Monaco editor */}
        <div className="flex-1 overflow-hidden">
          <CodeEditor code={code} language={language} onChange={setCode} />
        </div>

        {/* Bottom panel: stdin / output */}
        <div className="shrink-0 border-t border-slate-700 bg-slate-800 flex" style={{ height: '200px' }}>

          {/* Custom input */}
          <div className="w-2/5 border-r border-slate-700 flex flex-col p-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Custom Input (stdin)</p>
            <textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              className="flex-1 bg-slate-900 text-white text-sm font-mono px-3 py-2 rounded-lg border border-slate-700 focus:border-indigo-500 focus:outline-none resize-none"
              placeholder="Enter stdin for Run…"
            />
          </div>

          {/* Output */}
          <div className="flex-1 flex flex-col p-3 overflow-hidden">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Output</p>
            <div className="flex-1 overflow-y-auto">
              {output ? (
                output.kind === 'submit' ? (
                  <div>
                    <p className={`text-sm font-bold mb-1 ${STATUS_COLOR[output.status] ?? 'text-white'}`}>
                      {STATUS_LABEL[output.status] ?? output.status}
                    </p>
                    <pre className="text-slate-300 text-xs whitespace-pre-wrap">{output.output}</pre>
                  </div>
                ) : (
                  <div>
                    {output.output && (
                      <pre className="text-green-300 text-sm font-mono whitespace-pre-wrap">{output.output}</pre>
                    )}
                    {output.error && (
                      <pre className="text-red-400 text-xs font-mono whitespace-pre-wrap mt-1">{output.error}</pre>
                    )}
                    {!output.output && !output.error && (
                      <span className="text-slate-500 text-sm">No output produced.</span>
                    )}
                  </div>
                )
              ) : (
                <span className="text-slate-600 text-sm">
                  {running || submitting ? 'Executing…' : 'Run or submit your code to see results.'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
