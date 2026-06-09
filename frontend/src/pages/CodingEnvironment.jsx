import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import {
  Play, Send, ChevronLeft, ChevronRight, Clock, AlertTriangle,
  CheckCircle, XCircle, Terminal, Maximize2, Minimize2, ShieldCheck,
  Copy, Settings, Bookmark, BookmarkCheck, ThumbsUp, ThumbsDown,
  MessageSquare, Sparkles, ChevronDown, ChevronUp, X, Eye,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'
import { StatusBadge } from '../components/ui/Badge'
import { PageLoader } from '../components/ui/LoadingSpinner'

const DEFAULT_C = `#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    \n    return 0;\n}\n`

export default function CodingEnvironment() {
  const { problemId } = useParams()
  const [searchParams] = useSearchParams()
  const isTestMode = searchParams.get('mode') === 'test'
  const navigate = useNavigate()

  const [problem, setProblem]         = useState(null)
  const [allProblems, setAllProblems] = useState([])
  const [loading, setLoading]         = useState(true)
  const [code, setCode]               = useState(DEFAULT_C)
  const [submitting, setSubmitting]   = useState(false)
  const [running, setRunning]         = useState(false)
  const [result, setResult]           = useState(null)
  const [runOutput, setRunOutput]     = useState(null)
  const [activeTab, setActiveTab]     = useState('statement')
  const [timer, setTimer]             = useState(0)
  const [tabSwitches, setTabSwitches] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [customInputOpen, setCustomInputOpen] = useState(true)
  const [customInput, setCustomInput] = useState('')
  const [aiQuestion, setAiQuestion]   = useState('')
  const [aiLoading, setAiLoading]     = useState(false)
  const [aiMessages, setAiMessages]   = useState([])
  const [liked, setLiked]             = useState(null)
  const [bookmarked, setBookmarked]   = useState(false)
  const [showResult, setShowResult]   = useState(false)
  const [showVisualize, setShowVisualize] = useState(false)

  const timerRef     = useRef(null)
  const startTimeRef = useRef(Date.now())
  const containerRef = useRef(null)

  useEffect(() => {
    const mode = isTestMode ? 'test' : 'practice'
    Promise.all([
      api.get(`/problems/${problemId}`),
      api.get(`/problems?mode=${mode}`),
    ])
      .then(([pRes, listRes]) => {
        setProblem(pRes.data)
        setAllProblems(listRes.data)
        setCode(DEFAULT_C)
      })
      .catch(() => { toast.error('Problem not found'); navigate(-1) })
      .finally(() => setLoading(false))
  }, [problemId])

  useEffect(() => {
    if (!problem) return
    timerRef.current = setInterval(() => {
      setTimer(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [problem])

  useEffect(() => {
    if (!isTestMode || !problem) return
    if (problem.fullscreen_required) requestFullscreen()
    if (problem.tab_switch_detect) {
      const onVisibility = () => {
        if (document.hidden) {
          setTabSwitches(prev => {
            const next = prev + 1
            toast.error(`Tab switch detected! (${next})`, { duration: 4000 })
            return next
          })
        }
      }
      document.addEventListener('visibilitychange', onVisibility)
      return () => document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [problem, isTestMode])

  useEffect(() => {
    if (!isTestMode || !problem) return
    const onKeyDown = (e) => {
      if (problem.f12_disable && e.key === 'F12') {
        e.preventDefault()
        toast.error('Developer tools are disabled during this test.')
      }
    }
    const onCopyPaste = (e) => {
      if (problem.copy_paste_disable) {
        e.preventDefault()
        toast.error('Copy-paste is disabled during this test.')
      }
    }
    const onContext = (e) => { if (problem.f12_disable) e.preventDefault() }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('copy', onCopyPaste)
    document.addEventListener('paste', onCopyPaste)
    document.addEventListener('contextmenu', onContext)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('copy', onCopyPaste)
      document.removeEventListener('paste', onCopyPaste)
      document.removeEventListener('contextmenu', onContext)
    }
  }, [problem, isTestMode])

  const requestFullscreen = () => {
    if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen()
    setIsFullscreen(true)
  }
  const exitFullscreen = () => {
    if (document.exitFullscreen) document.exitFullscreen()
    setIsFullscreen(false)
  }

  const currentIndex = allProblems.findIndex(p => p.id === Number(problemId))
  const prevProblem  = currentIndex > 0 ? allProblems[currentIndex - 1] : null
  const nextProblem  = currentIndex < allProblems.length - 1 ? allProblems[currentIndex + 1] : null
  const goPrev = () => { if (prevProblem) navigate(`/problems/${prevProblem.id}${isTestMode ? '?mode=test' : ''}`) }
  const goNext = () => { if (nextProblem) navigate(`/problems/${nextProblem.id}${isTestMode ? '?mode=test' : ''}`) }

  const handleSubmit = async () => {
    if (!code.trim()) { toast.error('Write some code first!'); return }
    setSubmitting(true)
    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000)
    try {
      const { data } = await api.post('/submissions', {
        problem_id: Number(problemId),
        code,
        language: 'c',
        time_taken: timeTaken,
        tab_switches: tabSwitches,
      })
      setResult(data)
      setShowResult(true)
      setActiveTab('statement')
      if (data.status === 'Accepted') toast.success('All test cases passed!')
      else toast.error(`${data.status}: ${data.passed}/${data.total} passed`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRun = async () => {
    if (!code.trim()) { toast.error('Write some code first!'); return }
    setRunning(true)
    setRunOutput(null)
    setCustomInputOpen(true)
    try {
      const { data } = await api.post('/submissions/run', { code, custom_input: customInput })
      setRunOutput(data)
      if (data.status !== 'ok') {
        toast.error(data.status === 'Compilation Error' ? 'Compilation failed — check the output' : data.status)
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Run failed'
      toast.error(msg)
      setRunOutput({ status: 'Error', output: msg, time_ms: 0 })
    } finally {
      setRunning(false)
    }
  }

  const handleCopyCode = () => { navigator.clipboard.writeText(code); toast.success('Code copied!') }

  const handleVisualize = () => setShowVisualize(true)

  const sendAiMessage = async () => {
    if (!aiQuestion.trim()) return
    const userMsg = aiQuestion.trim()
    setAiMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setAiQuestion('')
    setAiLoading(true)
    try {
      await new Promise(r => setTimeout(r, 900))
      const hints = [
        `For "${problem?.title}", focus on the core logic: ${problem?.description?.slice(0, 100)}...`,
        'Break the problem into smaller steps. What input do you receive? What should the output be?',
        'Try writing pseudo-code first, then translate it to C.',
        'Check your edge cases — what happens with empty input or boundary values?',
        'Look at the sample test cases carefully. They reveal the expected behavior.',
      ]
      setAiMessages(prev => [...prev, { role: 'ai', text: hints[Math.floor(Math.random() * hints.length)] }])
    } finally {
      setAiLoading(false)
    }
  }

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const progressPct = allProblems.length > 1 ? Math.round(((currentIndex + 1) / allProblems.length) * 100) : 0

  if (loading) return (
    <div className="flex h-screen bg-[#0d1117] items-center justify-center">
      <PageLoader />
    </div>
  )
  if (!problem) return null

  return (
    <>
    {showVisualize && (
      <VisualizeModal code={code} onClose={() => setShowVisualize(false)} />
    )}
    <div ref={containerRef} className="flex flex-col h-screen bg-[#0d1117] text-white overflow-hidden">

      {/* TOP BAR */}
      <header className="flex items-center justify-between px-4 h-11 border-b border-white/[0.07] bg-[#161b22] flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white transition-colors">
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setBookmarked(b => !b)}
            className={`transition-colors ${bookmarked ? 'text-yellow-400' : 'text-slate-400 hover:text-white'}`}
          >
            {bookmarked ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
          </button>
          <div className={`flex items-center gap-1.5 font-mono text-sm px-2 py-0.5 rounded border ${
            problem.duration && timer > problem.duration * 60 * 0.85
              ? 'text-rose-400 border-rose-500/30 bg-rose-500/10'
              : 'text-slate-300 border-white/10 bg-[#0d1117]'
          }`}>
            <Clock size={13} />
            {fmtTime(timer)}
            {problem.duration && <span className="text-slate-500">/{fmtTime(problem.duration * 60)}</span>}
          </div>
          {tabSwitches > 0 && (
            <span className="flex items-center gap-1 text-amber-400 text-xs bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded">
              <AlertTriangle size={11} /> {tabSwitches} switches
            </span>
          )}
          {isTestMode && (
            <span className="flex items-center gap-1 text-violet-400 text-[11px] bg-violet-400/10 border border-violet-400/20 px-2 py-0.5 rounded">
              <ShieldCheck size={11} /> Proctored
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-1 max-w-md mx-6">
          <button
            onClick={goPrev}
            disabled={!prevProblem}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium whitespace-nowrap"
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <button
            onClick={goNext}
            disabled={!nextProblem}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium whitespace-nowrap"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {allProblems.length > 0 && (
            <span className="text-xs text-slate-500">{currentIndex + 1} / {allProblems.length}</span>
          )}
          {isTestMode && (
            <button onClick={isFullscreen ? exitFullscreen : requestFullscreen} className="text-slate-400 hover:text-white transition-colors">
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          )}
        </div>
      </header>

      {/* MAIN */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT PANEL */}
        <div className="w-[44%] min-w-[300px] max-w-[560px] flex flex-col border-r border-white/[0.07] overflow-hidden">
          <div className="flex border-b border-white/[0.07] bg-[#161b22] flex-shrink-0">
            <TabBtn label="Statement" active={activeTab === 'statement' && !showResult} onClick={() => { setActiveTab('statement'); setShowResult(false) }} />
            <TabBtn label="AI Help"   active={activeTab === 'aihelp'   && !showResult} onClick={() => { setActiveTab('aihelp');   setShowResult(false) }} />
            {showResult && <TabBtn label="Result" active={showResult} onClick={() => setShowResult(true)} variant="result" />}
          </div>

          <div className={`flex-1 overflow-hidden ${activeTab === 'aihelp' && !showResult ? 'flex flex-col' : 'overflow-y-auto'}`}>
            {activeTab === 'statement' && !showResult && (
              <div className="flex flex-col">
                <div className="px-4 pt-3 pb-2 border-b border-white/[0.05]">
                  <button
                    onClick={() => setActiveTab('aihelp')}
                    className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors group"
                  >
                    <Sparkles size={14} />
                    <span className="font-medium">Switch to AI Tutor Mode</span>
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-bold tracking-wide">NEW</span>
                  </button>
                </div>
                <ProblemStatement problem={problem} liked={liked} setLiked={setLiked} />
              </div>
            )}
            {showResult && result && (
              <div className="p-4"><SubmissionResult result={result} /></div>
            )}
            {activeTab === 'aihelp' && !showResult && (
              <AiHelpPanel
                problem={problem}
                messages={aiMessages}
                question={aiQuestion}
                setQuestion={setAiQuestion}
                onSend={sendAiMessage}
                loading={aiLoading}
              />
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex items-center justify-between px-3 h-10 border-b border-white/[0.07] bg-[#161b22] flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#0d1117] border border-white/10 rounded px-2.5 py-1 text-xs text-slate-300 cursor-default select-none">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                C Language
                <ChevronDown size={11} className="text-slate-500" />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <IconBtn icon={<Copy size={14} />}     tooltip="Copy code"       onClick={handleCopyCode} />
              <IconBtn icon={<Settings size={14} />} tooltip="Editor settings" onClick={() => toast('Editor settings coming soon')} />
              <IconBtn
                icon={isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                tooltip={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                onClick={isFullscreen ? exitFullscreen : requestFullscreen}
              />
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language="c"
              value={code}
              onChange={(v) => setCode(v || '')}
              theme="vs-dark"
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                lineNumbers: 'on',
                renderLineHighlight: 'line',
                suggestOnTriggerCharacters: true,
                padding: { top: 10, bottom: 10 },
                smoothScrolling: true,
              }}
            />
          </div>

          {/* Custom Input */}
          <div className="border-t border-white/[0.07] bg-[#161b22] flex-shrink-0">
            <button
              onClick={() => setCustomInputOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-2 text-xs text-slate-400 hover:text-white hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Terminal size={13} />
                <span className="font-medium">Test against Custom Input</span>
                {runOutput && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                    runOutput.status === 'ok'
                      ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                      : 'text-rose-400 bg-rose-400/10 border-rose-400/20'
                  }`}>
                    {runOutput.status === 'ok' ? 'Output ready' : runOutput.status}
                  </span>
                )}
              </div>
              {customInputOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {customInputOpen && (
              <div className="px-3 pb-3 space-y-2">
                <textarea
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  placeholder="Enter your custom input here..."
                  className="w-full h-20 bg-[#0d1117] border border-white/10 rounded px-3 py-2 text-xs text-slate-300 font-mono resize-none focus:outline-none focus:border-blue-500/50 placeholder-slate-600"
                />
                {runOutput && (
                  <div className={`rounded border text-xs font-mono ${
                    runOutput.status === 'ok'
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-rose-500/5 border-rose-500/20'
                  }`}>
                    <div className={`flex justify-between items-center px-2.5 py-1.5 border-b ${
                      runOutput.status === 'ok' ? 'border-emerald-500/15' : 'border-rose-500/15'
                    }`}>
                      <span className={`text-[10px] uppercase tracking-wide font-sans font-semibold ${
                        runOutput.status === 'ok' ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {runOutput.status === 'ok' ? '✓ Output' : '✗ ' + runOutput.status}
                      </span>
                      <div className="flex items-center gap-2">
                        {runOutput.time_ms != null && (
                          <span className="text-[10px] text-slate-500">{runOutput.time_ms.toFixed(1)}ms</span>
                        )}
                        <button
                          onClick={() => setRunOutput(null)}
                          className="text-slate-600 hover:text-slate-400 transition-colors"
                          title="Clear"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                    <pre className={`px-2.5 py-2 whitespace-pre-wrap break-words ${
                      runOutput.status === 'ok' ? 'text-emerald-300' : 'text-rose-400'
                    }`}>
                      {runOutput.output || '(no output)'}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-white/[0.07] bg-[#0d1117] flex-shrink-0">
            <button
              onClick={handleVisualize}
              className="flex items-center gap-1.5 text-xs text-slate-300 border border-white/15 hover:border-white/30 hover:text-white px-3 py-1.5 rounded transition-colors"
            >
              <Eye size={12} /> Visualize Code
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRun}
                disabled={running}
                className="flex items-center gap-1.5 text-xs text-white border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
              >
                {running
                  ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Play size={12} fill="currentColor" />}
                {running ? 'Running…' : 'Run'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded transition-colors font-medium disabled:opacity-50"
              >
                {submitting
                  ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Send size={12} />}
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
              <button
                onClick={goNext}
                disabled={!nextProblem}
                className="flex items-center gap-1.5 text-xs text-slate-300 border border-white/15 hover:border-white/30 hover:text-white px-3 py-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TabBtn({ label, active, onClick, variant }) {
  const activeClass = variant === 'result'
    ? 'border-emerald-400 text-emerald-400'
    : 'border-blue-500 text-white'
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
        active ? activeClass : 'border-transparent text-slate-500 hover:text-slate-300'
      }`}
    >
      {label}
    </button>
  )
}

function IconBtn({ icon, tooltip, onClick }) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded transition-colors"
    >
      {icon}
    </button>
  )
}

function ProblemStatement({ problem: p, liked, setLiked }) {
  const visibleTCs = p.test_cases?.filter(tc => !tc.is_hidden) || []
  const copyText   = (text) => { navigator.clipboard.writeText(text); toast.success('Copied!') }

  return (
    <div className="px-4 py-4 space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
          p.difficulty === 'easy'  ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
          : p.difficulty === 'hard' ? 'text-rose-400 bg-rose-400/10 border-rose-400/20'
          : 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
        }`}>
          {p.difficulty?.charAt(0).toUpperCase() + p.difficulty?.slice(1)}
        </span>
        {p.topics && (
          <span className="text-[11px] text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 rounded">
            {p.topics}
          </span>
        )}
        {p.duration && (
          <span className="text-[11px] text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 rounded flex items-center gap-1">
            <Clock size={10} /> {p.duration} min
          </span>
        )}
      </div>

      <div>
        <h2 className="text-base font-bold text-white mb-3">{p.title}</h2>
        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{p.description}</p>
      </div>

      {visibleTCs.length > 0 && (
        <div className="space-y-3">
          {visibleTCs.map((tc, i) => (
            <div key={tc.id} className="rounded-lg border border-white/[0.08] bg-[#161b22] overflow-hidden">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-white/[0.06]">
                Sample {i + 1}:
              </div>
              <div className="grid grid-cols-2 divide-x divide-white/[0.06]">
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-slate-500 font-medium">Input</span>
                    <button onClick={() => copyText(tc.input_data || '')} className="text-slate-600 hover:text-slate-400 transition-colors">
                      <Copy size={11} />
                    </button>
                  </div>
                  <pre className="text-sm text-slate-200 font-mono leading-relaxed">{tc.input_data || '(none)'}</pre>
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-slate-500 font-medium">Output</span>
                    <button onClick={() => copyText(tc.expected_output)} className="text-slate-600 hover:text-slate-400 transition-colors">
                      <Copy size={11} />
                    </button>
                  </div>
                  <pre className="text-sm text-slate-200 font-mono leading-relaxed">{tc.expected_output}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg bg-[#161b22] border border-white/[0.06] p-3 text-xs text-slate-400 space-y-1">
        <p>• Write your solution in C using <code className="text-blue-400">printf</code> / <code className="text-blue-400">scanf</code></p>
        <p>• Time limit: 5 seconds per test case</p>
        {p.test_cases_count > 0 && <p>• {p.test_cases_count} total test cases (some may be hidden)</p>}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
        <span className="text-xs text-slate-500">Did you like the problem?</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setLiked(liked === 'up' ? null : 'up')}
            className={`p-1.5 rounded transition-colors ${liked === 'up' ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <ThumbsUp size={14} />
          </button>
          <button
            onClick={() => setLiked(liked === 'down' ? null : 'down')}
            className={`p-1.5 rounded transition-colors ${liked === 'down' ? 'text-rose-400 bg-rose-400/10' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <ThumbsDown size={14} />
          </button>
          <button
            onClick={() => toast('Comments coming soon!')}
            className="p-1.5 rounded text-slate-500 hover:text-slate-300 transition-colors"
          >
            <MessageSquare size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function AiHelpPanel({ messages, question, setQuestion, onSend, loading }) {
  const bottomRef = useRef(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2 flex-shrink-0">
        <Sparkles size={15} className="text-blue-400" />
        <div>
          <p className="text-sm font-semibold text-white">AI Tutor</p>
          <p className="text-[11px] text-slate-500">Ask questions about this problem</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <Sparkles size={28} className="text-blue-400/40 mx-auto" />
            <p className="text-sm text-slate-500">Need a hint? Ask the AI tutor!</p>
            <div className="flex flex-col gap-1.5 mt-3">
              {['Give me a hint for this problem', 'What data structure should I use?', 'Explain the approach step by step'].map(q => (
                <button
                  key={q}
                  onClick={() => setQuestion(q)}
                  className="text-xs text-blue-400/70 hover:text-blue-400 border border-blue-400/20 hover:border-blue-400/40 rounded px-3 py-1.5 transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
              m.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-sm'
                : 'bg-[#1e2530] text-slate-200 border border-white/[0.06] rounded-bl-sm'
            }`}>
              {m.role === 'ai' && (
                <div className="flex items-center gap-1 mb-1">
                  <Sparkles size={11} className="text-blue-400" />
                  <span className="text-[10px] text-blue-400 font-semibold">AI Tutor</span>
                </div>
              )}
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#1e2530] border border-white/[0.06] rounded-xl rounded-bl-sm px-3 py-2">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-3 pb-3 border-t border-white/[0.06] pt-2 flex-shrink-0">
        <div className="flex gap-2">
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
            placeholder="Ask a question about this problem..."
            className="flex-1 bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
          />
          <button
            onClick={onSend}
            disabled={loading || !question.trim()}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function SubmissionResult({ result }) {
  const pct = result.total ? Math.round((result.passed / result.total) * 100) : 0
  return (
    <div className="space-y-4">
      <div className={`rounded-xl border p-4 ${
        result.status === 'Accepted' ? 'border-emerald-500/30 bg-emerald-500/[0.08]' : 'border-rose-500/30 bg-rose-500/[0.08]'
      }`}>
        <div className="flex items-center gap-2 mb-1">
          {result.status === 'Accepted'
            ? <CheckCircle size={18} className="text-emerald-400" />
            : <XCircle    size={18} className="text-rose-400" />}
          <span className={`font-bold text-base ${result.status === 'Accepted' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {result.status}
          </span>
        </div>
        <p className="text-xs text-slate-400">{result.passed}/{result.total} test cases passed · Score: {result.score}%</p>
      </div>
      <div>
        <div className="flex justify-between text-xs text-slate-400 mb-1.5"><span>Test Cases</span><span>{pct}%</span></div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{
            width: `${pct}%`,
            background: pct === 100 ? '#10b981' : pct > 50 ? '#f59e0b' : '#f43f5e',
          }} />
        </div>
      </div>
      {result.error && (
        <pre className="text-xs text-rose-400 font-mono bg-rose-500/5 border border-rose-500/20 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
          {result.error}
        </pre>
      )}
      <div className="space-y-1.5">
        {result.results?.map((r, i) => (
          <div key={i} className={`flex items-center gap-3 rounded-lg p-2.5 border ${
            r.status === 'Passed' ? 'border-emerald-500/15 bg-emerald-500/5' : 'border-rose-500/15 bg-rose-500/5'
          }`}>
            {r.status === 'Passed'
              ? <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
              : <XCircle    size={13} className="text-rose-400 flex-shrink-0" />}
            <span className="text-xs text-slate-400">Case #{i + 1}{r.is_hidden ? ' (hidden)' : ''}</span>
            <StatusBadge status={r.status} />
            {r.execution_time != null && (
              <span className="text-xs text-slate-500 ml-auto">{r.execution_time.toFixed(1)}ms</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Visualize Code Modal ───────────────────────────────────────────────────────
function VisualizeModal({ code: initialCode, onClose }) {
  const [input, setInput]       = useState('')
  const [running, setRunning]   = useState(false)
  const [output, setOutput]     = useState(null)
  const [displayedOutput, setDisplayedOutput] = useState('')
  const [activeCodeLine, setActiveCodeLine]   = useState(null)
  const outputRef = useRef(null)
  const lines = initialCode.split('\n')

  // Typewriter effect for successful output
  useEffect(() => {
    if (!output) { setDisplayedOutput(''); return }
    if (output.status !== 'ok') { setDisplayedOutput(output.output || ''); return }
    let i = 0
    const text = output.output || ''
    setDisplayedOutput('')
    const iv = setInterval(() => {
      i++
      setDisplayedOutput(text.slice(0, i))
      if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight
      if (i >= text.length) clearInterval(iv)
    }, 18)
    return () => clearInterval(iv)
  }, [output])

  // Animate current-line highlight while compiling/running
  useEffect(() => {
    if (!running) { setActiveCodeLine(null); return }
    let ln = 0
    const iv = setInterval(() => {
      do { ln = (ln + 1) % lines.length } while (lines[ln]?.trim() === '' && ln < lines.length - 1)
      setActiveCodeLine(ln)
    }, 260)
    return () => clearInterval(iv)
  }, [running, lines.length])

  const handleRun = async () => {
    setRunning(true)
    setOutput(null)
    setDisplayedOutput('')
    try {
      const { data } = await api.post('/submissions/run', { code: initialCode, custom_input: input })
      setOutput(data)
    } catch (err) {
      setOutput({ status: 'Error', output: err.response?.data?.detail || 'Request failed — is the backend running?', time_ms: 0 })
    } finally {
      setRunning(false)
    }
  }

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const isError   = output && output.status !== 'ok'
  const isSuccess = output && output.status === 'ok'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[92vw] max-w-7xl h-[88vh] bg-[#0d1117] border border-white/10 rounded-2xl flex flex-col shadow-2xl overflow-hidden">

        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07] bg-[#161b22] flex-shrink-0">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-blue-400" />
            <span className="font-semibold text-white text-sm">Code Visualizer</span>
            <span className="text-[11px] text-slate-500 border border-white/10 px-2 py-0.5 rounded">C Language</span>
          </div>
          <div className="flex items-center gap-3">
            {output && (
              <span className={`text-[11px] px-2 py-0.5 rounded border font-medium ${
                isSuccess
                  ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                  : 'text-rose-400 bg-rose-400/10 border-rose-400/20'
              }`}>
                {isSuccess ? `Executed in ${output.time_ms?.toFixed(1)}ms` : output.status}
              </span>
            )}
            <button
              onClick={handleRun}
              disabled={running}
              className="flex items-center gap-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              {running
                ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Play size={12} fill="currentColor" />}
              {running ? 'Running…' : 'Run'}
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-white/[0.06]">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal body */}
        <div className="flex flex-1 overflow-hidden">

          {/* Code pane */}
          <div className="w-[55%] border-r border-white/[0.07] overflow-auto bg-[#0d1117]">
            <div className="min-h-full py-3">
              {lines.map((line, i) => {
                const isActive = activeCodeLine === i
                return (
                  <div key={i} className={`flex items-stretch group transition-colors duration-100 ${
                    isActive ? 'bg-blue-500/[0.12] border-l-2 border-blue-400' : 'border-l-2 border-transparent'
                  }`}>
                    <span className={`select-none text-right pr-4 pl-4 min-w-[3.5rem] text-[11px] leading-6 flex-shrink-0 font-mono ${
                      isActive ? 'text-blue-400 font-bold' : 'text-slate-600'
                    }`}>
                      {i + 1}
                    </span>
                    <pre className={`leading-6 whitespace-pre flex-1 font-mono text-sm pr-6 ${
                      isActive ? 'text-white' : 'text-slate-300'
                    }`}>
                      {line || ' '}
                    </pre>
                    {isActive && running && (
                      <span className="mr-3 flex items-center flex-shrink-0 gap-0.5">
                        <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:100ms]" />
                        <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:200ms]" />
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* I/O pane */}
          <div className="w-[45%] flex flex-col overflow-hidden bg-[#0a0e18]">

            {/* stdin */}
            <div className="flex-shrink-0 border-b border-white/[0.07]">
              <div className="px-4 py-2 bg-[#161b22] flex items-center gap-2">
                <Terminal size={12} className="text-slate-500" />
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">stdin (input)</span>
              </div>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Enter program input here (optional)…"
                className="w-full h-24 bg-[#0a0e18] px-4 py-3 text-sm text-slate-300 font-mono resize-none focus:outline-none placeholder-slate-700 border-0"
              />
            </div>

            {/* stdout */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 py-2 bg-[#161b22] border-b border-white/[0.07] flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Terminal size={12} className={isError ? 'text-rose-400' : 'text-emerald-400'} />
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    {isError ? 'Error / stderr' : 'stdout (output)'}
                  </span>
                </div>
                {output?.output && (
                  <button
                    onClick={() => navigator.clipboard.writeText(output.output)}
                    className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <Copy size={10} /> Copy
                  </button>
                )}
              </div>

              <div ref={outputRef} className="flex-1 overflow-auto px-4 py-3">
                {!output && !running && (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-40">
                    <Play size={28} className="text-slate-600" />
                    <p className="text-sm text-slate-600">Click <span className="text-slate-400 font-semibold">Run</span> to execute your code</p>
                  </div>
                )}
                {running && !output && (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center space-y-3">
                      <div className="flex gap-1.5 justify-center">
                        {[0, 150, 300].map(d => (
                          <span key={d} className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                        ))}
                      </div>
                      <p className="text-xs text-slate-500">Compiling &amp; running…</p>
                    </div>
                  </div>
                )}
                {output && (
                  <pre className={`font-mono text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    isError ? 'text-rose-400' : 'text-emerald-300'
                  }`}>
                    {displayedOutput || output.output || '(no output)'}
                    {isSuccess && displayedOutput === output.output && (
                      <span className="animate-pulse text-emerald-500">▋</span>
                    )}
                  </pre>
                )}
              </div>

              {output && (
                <div className="flex-shrink-0 border-t border-white/[0.07] px-4 py-2 bg-[#161b22] flex items-center gap-4 text-[11px] text-slate-500">
                  <span className={`font-semibold ${isSuccess ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isSuccess ? '✓ Execution successful' : '✗ ' + output.status}
                  </span>
                  {output.time_ms != null && (
                    <span>Time: <span className="text-slate-400">{output.time_ms.toFixed(2)}ms</span></span>
                  )}
                  {isSuccess && (
                    <span>Output lines: <span className="text-slate-400">{(output.output || '').split('\n').filter(Boolean).length}</span></span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
