import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import {
  Play, Send, ChevronLeft, ChevronRight, Clock, AlertTriangle,
  CheckCircle, XCircle, Terminal, Maximize2, Minimize2, ShieldCheck,
  Copy, Settings, Bookmark, BookmarkCheck, ThumbsUp, ThumbsDown,
  MessageSquare, Sparkles, ChevronDown, ChevronUp, X, Eye, HelpCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'
import { StatusBadge } from '../components/ui/Badge'
import LoadingSpinner, { PageLoader } from '../components/ui/LoadingSpinner'
import { formatDistanceToNow } from 'date-fns'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import useInteractiveRun from '../hooks/useInteractiveRun'
import EditorTour from '../components/ui/EditorTour'
import Markdown from '../components/ui/Markdown'

const TOUR_KEY = 'cf_editor_tour_v1'

const DEFAULT_C = `#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    \n    return 0;\n}\n`

export default function CodingEnvironment() {
  const { problemId } = useParams()
  const [searchParams] = useSearchParams()
  const isTestMode = searchParams.get('mode') === 'test'
  const navigate = useNavigate()
  const { isDark } = useTheme()
  const { user } = useAuth()

  const [problem, setProblem]         = useState(null)
  const [allProblems, setAllProblems] = useState([])
  const [loading, setLoading]         = useState(true)
  const [code, setCode]               = useState(DEFAULT_C)
  const [saveState, setSaveState]     = useState('saved') // 'saving' | 'saved'
  const [submitting, setSubmitting]   = useState(false)
  const [running, setRunning]         = useState(false)
  const [result, setResult]           = useState(null)
  const [activeTab, setActiveTab]     = useState('statement')
  const [timer, setTimer]             = useState(0)
  const [tabSwitches, setTabSwitches] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [customInputOpen, setCustomInputOpen] = useState(true)
  const [runMode, setRunMode]         = useState('samples') // 'samples' | 'console'
  const [sampleRun, setSampleRun]     = useState(null)
  const runner = useInteractiveRun()
  const [tourOpen, setTourOpen]       = useState(false)

  const closeTour = () => {
    setTourOpen(false)
    try { localStorage.setItem(TOUR_KEY, '1') } catch { /* ignore */ }
  }

  const tourSteps = [
    {
      title: 'Welcome to the workspace',
      body: 'A quick 60-second tour of how to read a problem, test your code, and submit. You can replay it anytime from the ? button in the editor toolbar.',
    },
    {
      selector: '[data-tour="statement"]',
      placement: 'right',
      title: 'Problem & samples',
      body: 'Read the task here. Each sample shows an Input and the Expected Output — use the copy icons to grab them. Scroll down for constraints and the time limit.',
      onEnter: () => { setActiveTab('statement'); setShowResult(false) },
    },
    {
      selector: '[data-tour="ai-tutor"]',
      placement: 'bottom',
      title: 'Stuck? Ask the AI Tutor',
      body: 'Switch to AI Tutor mode for hints and step-by-step guidance about the approach — without giving away the full answer.',
    },
    {
      selector: '[data-tour="editor"]',
      placement: 'left',
      title: 'Write your C code here',
      body: 'A full code editor with syntax highlighting, auto-indent and autocomplete. Write your solution using printf / scanf. Your work auto-saves as you type, so a refresh never loses it.',
    },
    {
      selector: '[data-tour="editor-tools"]',
      placement: 'bottom',
      title: 'Editor tools',
      body: 'Copy your code, open editor settings, or go fullscreen for a distraction-free view.',
    },
    {
      selector: '[data-tour="sample-tests"]',
      placement: 'top',
      title: 'Sample Tests — check yourself',
      body: 'Press Run on this tab to test your code against the visible samples. You get a side-by-side Expected vs Your Output with ✓/✗ per case. This NEVER affects your score.',
      onEnter: () => { setRunMode('samples'); setCustomInputOpen(true) },
    },
    {
      selector: '[data-tour="console"]',
      placement: 'top',
      title: 'Console — run interactively',
      body: 'Run your program live, like a real terminal. When your code hits a scanf it pauses and waits — type the value, press Enter, and it continues. Input is asked line-by-line, just like CodeBlocks.',
      onEnter: () => { setRunMode('console'); setCustomInputOpen(true) },
    },
    {
      selector: '[data-tour="run"]',
      placement: 'top',
      title: 'Run',
      body: 'Runs the active tab — Sample Tests or Console. It is only a self-check: nothing is graded or saved.',
    },
    {
      selector: '[data-tour="submit"]',
      placement: 'top',
      title: 'Submit — graded',
      body: 'This grades your code against ALL test cases (including hidden ones), records your score, and finishes the problem. Use it once you are confident.',
    },
    {
      selector: '[data-tour="history"]',
      placement: 'right',
      title: 'History — your past attempts',
      body: 'Every submission is saved here with its verdict, score and time. Open one to view the code you submitted and load it back into the editor.',
      onEnter: () => { setActiveTab('history'); setShowResult(false) },
    },
    {
      selector: '[data-tour="timer"]',
      placement: 'bottom',
      title: 'Timer & navigation',
      body: 'Your elapsed time shows here (and the limit, if any). Use Prev / Next at the top to move between problems in this set.',
    },
    {
      title: 'Keyboard shortcuts',
      body: 'Ctrl/⌘ + Enter → Run · Ctrl/⌘ + Shift + Enter → Submit · Ctrl/⌘ + S → save draft. (Your code also auto-saves continuously.)',
    },
    {
      title: "You're all set",
      body: 'Read → write → Run to self-check → Submit to score. Tip: press the ? in the editor toolbar to replay this tour anytime. Happy coding!',
      onEnter: () => { setActiveTab('statement'); setShowResult(false) },
    },
  ]
  const [aiQuestion, setAiQuestion]   = useState('')
  const [aiLoading, setAiLoading]     = useState(false)
  const [showFullscreenOverlay, setShowFullscreenOverlay] = useState(false)
  const [aiMessages, setAiMessages]   = useState([])
  const [liked, setLiked]             = useState(null)
  const [bookmarked, setBookmarked]   = useState(false)
  const [showResult, setShowResult]   = useState(false)
  const [showVisualize, setShowVisualize] = useState(false)

  const timerRef     = useRef(null)
  const startTimeRef = useRef(Date.now())
  const containerRef = useRef(null)
  const stateRef     = useRef({}) // latest values for global shortcuts

  useEffect(() => {
    const mode = isTestMode ? 'test' : 'practice'
    Promise.all([
      api.get(`/problems/${problemId}`),
      api.get(`/problems?mode=${mode}`),
    ])
      .then(([pRes, listRes]) => {
        setProblem(pRes.data)
        setAllProblems(listRes.data)
        let saved = null
        try { saved = localStorage.getItem(`cf_code_${problemId}`) } catch { /* ignore */ }
        setCode(saved && saved.trim() ? saved : DEFAULT_C)
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

  // First-time guided tour (practice mode only — don't distract during a timed test)
  useEffect(() => {
    if (!problem || isTestMode) return
    let seen = false
    try { seen = !!localStorage.getItem(TOUR_KEY) } catch { /* ignore */ }
    if (seen) return
    const t = setTimeout(() => setTourOpen(true), 600)
    return () => clearTimeout(t)
  }, [problem, isTestMode])

  // Auto-save the student's code per problem (debounced) so a refresh never loses work
  useEffect(() => {
    if (!problem) return
    setSaveState('saving')
    const id = setTimeout(() => {
      try { localStorage.setItem(`cf_code_${problemId}`, code) } catch { /* ignore */ }
      setSaveState('saved')
    }, 500)
    return () => clearTimeout(id)
  }, [code, problem, problemId])

  // Global keyboard shortcuts: Ctrl/Cmd+Enter = Run, +Shift = Submit, Ctrl/Cmd+S = save draft
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const s = stateRef.current
      if (e.key === 'Enter') {
        e.preventDefault()
        if (e.shiftKey) s.handleSubmit?.(true)
        else s.handleRun?.()
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault()
        try { localStorage.setItem(`cf_code_${s.problemId}`, s.code) } catch { /* ignore */ }
        setSaveState('saved')
        toast.success('Draft saved')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!isTestMode || !problem) return
    
    if (problem.fullscreen_required && !document.fullscreenElement) {
      setShowFullscreenOverlay(true)
    }
    
    const onFullscreenChange = () => {
      if (document.fullscreenElement) {
        setShowFullscreenOverlay(false)
        setIsFullscreen(true)
      } else if (problem.fullscreen_required) {
        setShowFullscreenOverlay(true)
        setIsFullscreen(false)
      } else {
        setIsFullscreen(false)
      }
    }
    
    document.addEventListener('fullscreenchange', onFullscreenChange)

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
      return () => {
        document.removeEventListener('visibilitychange', onVisibility)
        document.removeEventListener('fullscreenchange', onFullscreenChange)
      }
    }
    
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [problem, isTestMode])

  useEffect(() => {
    if (!isTestMode || !problem) return
    const onKeyDown = (e) => {
      if (problem.f12_disable && e.key === 'F12') {
        e.preventDefault()
        e.stopPropagation()
        toast.error('Developer tools are disabled during this test.')
      }
      if (problem.copy_paste_disable && (e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'C' || e.key === 'V')) {
        e.preventDefault()
        e.stopPropagation()
        toast.error('Copy-paste is disabled during this test.')
      }
    }
    const onCopyPaste = (e) => {
      if (problem.copy_paste_disable) {
        e.preventDefault()
        e.stopPropagation()
        toast.error('Copy-paste is disabled during this test.')
      }
    }
    const onContext = (e) => { 
      if (problem.f12_disable) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('copy', onCopyPaste, true)
    document.addEventListener('paste', onCopyPaste, true)
    document.addEventListener('contextmenu', onContext, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('copy', onCopyPaste, true)
      document.removeEventListener('paste', onCopyPaste, true)
      document.removeEventListener('contextmenu', onContext, true)
    }
  }, [problem, isTestMode])

  useEffect(() => {
    return () => {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [])

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
  const goPrev = () => { if (prevProblem) navigate(`/code/${prevProblem.id}${isTestMode ? '?mode=test' : ''}`) }
  const goNext = () => { if (nextProblem) navigate(`/code/${nextProblem.id}${isTestMode ? '?mode=test' : ''}`) }

  const handleSubmit = async (isFinalSubmit = true) => {
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
      
      if (isFinalSubmit) {
        toast.success('Successfully submitted!')
        navigate(`/${user?.role || 'student'}/reports`)
        return
      }

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

  const visibleSamples = problem?.test_cases?.filter(tc => !tc.is_hidden) || []

  // Run = student self-check. NEVER grades or stores a submission.
  const handleRun = async () => {
    if (!code.trim()) { toast.error('Write some code first!'); return }
    setCustomInputOpen(true)

    if (runMode === 'console') {
      runner.start(code)   // live interactive console over WebSocket
      return
    }

    setRunning(true)
    try {
      setSampleRun(null)
      if (visibleSamples.length === 0) {
        toast('No sample cases — switch to the Console tab to test your own input.')
        setRunning(false)
        return
      }
      const cases = visibleSamples.map(tc => ({
        id: tc.id,
        input_data: tc.input_data || '',
        expected_output: tc.expected_output || '',
      }))
      const { data } = await api.post('/submissions/run-samples', { code, cases })
      setSampleRun(data)
      if (data.status === 'Compilation Error') {
        toast.error('Compilation failed — check the output')
      } else {
        const passed = data.results.filter(r => r.passed).length
        if (passed === data.results.length) toast.success(`All ${passed} sample${passed === 1 ? '' : 's'} passed`)
        else toast.error(`${passed}/${data.results.length} samples passed`)
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Run failed'
      toast.error(msg)
      setSampleRun({ status: 'Error', error: msg, results: [] })
    } finally {
      setRunning(false)
    }
  }

  const handleCopyCode = () => { navigator.clipboard.writeText(code); toast.success('Code copied!') }

  const handleVisualize = () => setShowVisualize(true)

  // expose latest values to the global keyboard-shortcut handler
  stateRef.current = { code, problemId, handleRun, handleSubmit }

  const sendAiMessage = async () => {
    if (!aiQuestion.trim()) return
    const userMsg = aiQuestion.trim()
    setAiMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setAiQuestion('')
    setAiLoading(true)
    try {
      const { data } = await api.post('/ai/tutor', {
        question: userMsg,
        problem_title: problem?.title || '',
        problem_description: problem?.description || '',
        code,
      })
      setAiMessages(prev => [...prev, { role: 'ai', text: data.answer || 'No response.' }])
    } catch (err) {
      const msg = err.response?.status === 502
        ? "The AI tutor isn't configured on the server yet (no API key). In the meantime: re-read the samples, note what input you read and what output is expected, and sketch pseudo-code before writing C."
        : (err.response?.data?.detail || 'Could not reach the AI tutor right now — please try again.')
      setAiMessages(prev => [...prev, { role: 'ai', text: msg }])
    } finally {
      setAiLoading(false)
    }
  }

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const progressPct = allProblems.length > 1 ? Math.round(((currentIndex + 1) / allProblems.length) * 100) : 0

  if (loading) return (
    <div className="flex h-screen bg-beige-pg items-center justify-center">
      <PageLoader />
    </div>
  )
  if (!problem) return null

  if (showFullscreenOverlay) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-beige-pg text-t z-[100] fixed inset-0 p-6 text-center">
        <div className="max-w-md w-full surface-inset border border-line rounded-xl p-8 space-y-6 shadow-xl">
          <Maximize2 size={40} className="mx-auto" style={{ color: 'var(--warn)' }} />
          <div>
            <h2 className="text-xl font-bold mb-2">Fullscreen Required</h2>
            <p className="text-t3 text-sm">
              This assessment requires you to be in fullscreen mode to continue. Exiting fullscreen will pause or invalidate your session.
            </p>
          </div>
          <button 
            className="btn-primary w-full justify-center h-11"
            onClick={() => {
              if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().then(() => {
                  setShowFullscreenOverlay(false)
                }).catch(err => {
                  toast.error("Failed to enter fullscreen.")
                })
              }
            }}
          >
            Enter Fullscreen to Start
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
    <EditorTour open={tourOpen} steps={tourSteps} onClose={closeTour} />
    {showVisualize && (
      <VisualizeModal code={code} onClose={() => setShowVisualize(false)} />
    )}
    <div ref={containerRef} className="flex flex-col h-screen bg-beige-pg text-t overflow-hidden">

      {/* TOP BAR */}
      <header className="flex items-center justify-between px-4 h-11 border-b border-line bg-surface-h flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-t3 hover:text-t transition-colors">
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setBookmarked(b => !b)}
            className={`transition-colors ${bookmarked ? '' : 'text-t3 hover:text-t'}`}
            style={bookmarked ? { color: 'var(--warn)' } : undefined}
          >
            {bookmarked ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
          </button>
          <div
            data-tour="timer"
            className="flex items-center gap-1.5 font-mono text-sm px-2 py-0.5 rounded border border-line surface-inset tabular"
            style={problem.duration && timer > problem.duration * 60 * 0.85 ? { color: 'var(--err)' } : { color: 'var(--t2)' }}
          >
            <Clock size={13} />
            {fmtTime(timer)}
            {problem.duration && <span className="text-t4">/{fmtTime(problem.duration * 60)}</span>}
          </div>
          {tabSwitches > 0 && (
            <span className="flex items-center gap-1 text-xs border border-line px-2 py-0.5 rounded tabular" style={{ color: 'var(--warn)', background: 'color-mix(in srgb, var(--warn) 12%, transparent)' }}>
              <AlertTriangle size={11} /> {tabSwitches} switches
            </span>
          )}
          {isTestMode && (
            <span className="flex items-center gap-1 text-[11px] border border-line px-2 py-0.5 rounded" style={{ color: 'var(--d-purple)', background: 'color-mix(in srgb, var(--d-purple) 12%, transparent)' }}>
              <ShieldCheck size={11} /> Proctored
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-1 mx-6">
        </div>

        <div className="flex items-center gap-2">
          {isTestMode && (
            <button onClick={isFullscreen ? exitFullscreen : requestFullscreen} className="text-t3 hover:text-t transition-colors">
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          )}
        </div>
      </header>

      {/* MAIN */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT PANEL */}
        <div data-tour="statement" className="w-[44%] min-w-[300px] max-w-[560px] flex flex-col border-r border-line overflow-hidden">
          <div className="flex border-b border-line bg-surface-h flex-shrink-0">
            <TabBtn label="Statement" active={activeTab === 'statement' && !showResult} onClick={() => { setActiveTab('statement'); setShowResult(false) }} />
            <TabBtn label="AI Help"   active={activeTab === 'aihelp'   && !showResult} onClick={() => { setActiveTab('aihelp');   setShowResult(false) }} />
            <TabBtn dataTour="history" label="History" active={activeTab === 'history'  && !showResult} onClick={() => { setActiveTab('history');  setShowResult(false) }} />
            {showResult && <TabBtn label="Result" active={showResult} onClick={() => setShowResult(true)} variant="result" />}
          </div>

          <div className={`flex-1 overflow-hidden ${activeTab === 'aihelp' && !showResult ? 'flex flex-col' : 'overflow-y-auto'}`}>
            {activeTab === 'statement' && !showResult && (
              <div className="flex flex-col">
                <div className="px-4 pt-3 pb-2 border-b border-line">
                  <button
                    data-tour="ai-tutor"
                    onClick={() => setActiveTab('aihelp')}
                    className="flex items-center gap-2 text-sm text-brand hover:opacity-80 transition-colors group"
                  >
                    <Sparkles size={14} />
                    <span className="font-medium">Switch to AI Tutor Mode</span>
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    <span className="text-[10px] text-white px-1.5 py-0.5 rounded font-bold tracking-wide" style={{ background: 'var(--d-orange)' }}>NEW</span>
                  </button>
                </div>
                <ProblemStatement problem={problem} liked={liked} setLiked={setLiked} />
              </div>
            )}
            {showResult && result && (
              <div className="p-4"><SubmissionResult result={result} problem={problem} /></div>
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
            {activeTab === 'history' && !showResult && (
              <SubmissionHistory
                problemId={Number(problemId)}
                onLoadCode={(c) => {
                  setCode(c)
                  setActiveTab('statement')
                  setShowResult(false)
                  toast.success('Loaded that submission into the editor')
                }}
              />
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex items-center justify-between px-3 h-10 border-b border-line bg-surface-h flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-t2 cursor-default select-none font-medium">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: 'var(--info)' }} />
                C Language
              </div>
              <span className="text-[11px] text-t4 hidden sm:inline tabular">
                {saveState === 'saving' ? 'Saving…' : '✓ Saved'}
              </span>
            </div>
            <div data-tour="editor-tools" className="flex items-center gap-1.5">
              <button
                onClick={() => setTourOpen(true)}
                title="Take a guided tour of the editor"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-line text-t3 hover:text-brand hover:border-line-strong transition-colors text-xs font-medium"
              >
                <HelpCircle size={13} /> Guide
              </button>
              <IconBtn icon={<Copy size={14} />}     tooltip="Copy code"       onClick={handleCopyCode} />
              <IconBtn icon={<Settings size={14} />} tooltip="Editor settings" onClick={() => toast('Editor settings coming soon')} />
              <IconBtn
                icon={isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                tooltip={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                onClick={isFullscreen ? exitFullscreen : requestFullscreen}
              />
              <div className="w-px h-4 bg-line mx-1" />
              <button
                data-tour="submit"
                onClick={() => handleSubmit(true)}
                disabled={submitting}
                className="btn-primary btn-sm ml-1"
              >
                {submitting
                  ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Send size={12} />}
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>

          <div data-tour="editor" className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language="c"
              value={code}
              onChange={(v) => setCode(v || '')}
              theme={isDark ? 'vs-dark' : 'light'}
              onMount={(editor, monaco) => {
                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => stateRef.current.handleRun?.())
                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => stateRef.current.handleSubmit?.(true))
                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                  try { localStorage.setItem(`cf_code_${stateRef.current.problemId}`, stateRef.current.code) } catch { /* ignore */ }
                  setSaveState('saved'); toast.success('Draft saved')
                })
              }}
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

          {/* Run / self-check panel — never grades */}
          <div className="border-t border-line bg-surface-h flex-shrink-0">
            <div className="flex items-center justify-between pl-2 pr-3 h-9 border-b border-line">
              <div className="flex items-center gap-1">
                <RunSubTab dataTour="sample-tests" label="Sample Tests" active={runMode === 'samples'} onClick={() => setRunMode('samples')} />
                <RunSubTab dataTour="console" label="Console" active={runMode === 'console'} onClick={() => setRunMode('console')} />
              </div>
              <div className="flex items-center gap-2">
                {runMode === 'samples' && sampleRun?.status === 'ok' && (
                  <span className="text-[10px] tabular text-t4">
                    {sampleRun.results.filter(r => r.passed).length}/{sampleRun.results.length} passed
                  </span>
                )}
                <button
                  onClick={() => setCustomInputOpen(o => !o)}
                  className="text-t4 hover:text-t3 transition-colors p-1"
                  title={customInputOpen ? 'Collapse' : 'Expand'}
                >
                  {customInputOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
              </div>
            </div>

            {customInputOpen && (
              <div className="px-3 py-3">
                {runMode === 'console' ? (
                  <InteractiveConsole
                    status={runner.status}
                    output={runner.output}
                    exitCode={runner.exitCode}
                    onRun={() => { if (code.trim()) runner.start(code); else toast.error('Write some code first!') }}
                    onStop={runner.stop}
                    onSend={runner.sendInput}
                  />
                ) : (
                  <div className="max-h-[260px] overflow-y-auto">
                    <SampleTestsPanel run={sampleRun} samples={visibleSamples} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-line bg-beige-pg flex-shrink-0">
            <button
              onClick={handleVisualize}
              className="btn-secondary btn-sm"
            >
              <Eye size={12} /> Visualize Code
            </button>
            <div className="flex items-center gap-2">
              {(() => {
                const busy = runMode === 'console' ? runner.status === 'compiling' : running
                const label = runMode === 'console'
                  ? (busy ? 'Compiling…' : (runner.status === 'running' ? 'Restart' : 'Run'))
                  : (busy ? 'Running…' : 'Run')
                return (
                  <button data-tour="run" onClick={handleRun} disabled={busy} className="btn-primary btn-sm">
                    {busy
                      ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <Play size={12} fill="currentColor" />}
                    {label}
                  </button>
                )
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TabBtn({ label, active, onClick, variant, dataTour }) {
  const activeStyle = variant === 'result'
    ? { color: 'var(--ok)', borderColor: 'var(--ok)' }
    : { color: 'var(--t)', borderColor: 'var(--brand)' }
  return (
    <button
      data-tour={dataTour}
      onClick={onClick}
      className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
        active ? '' : 'border-transparent text-t4 hover:text-t2'
      }`}
      style={active ? activeStyle : undefined}
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
      className="p-1.5 text-t3 hover:text-t hover:bg-surface-h rounded transition-colors"
    >
      {icon}
    </button>
  )
}

// ── Submission history ──────────────────────────────────────────────────────────

function SubmissionHistory({ problemId, onLoadCode }) {
  const [list, setList] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    let alive = true
    api.get(`/submissions?problem_id=${problemId}`)
      .then(r => { if (alive) setList(r.data) })
      .catch(() => { if (alive) setList([]) })
    return () => { alive = false }
  }, [problemId])

  const toggle = async (id) => {
    if (openId === id) { setOpenId(null); return }
    setOpenId(id); setDetail(null); setLoadingDetail(true)
    try { const { data } = await api.get(`/submissions/${id}`); setDetail(data) }
    catch { setDetail(null) }
    finally { setLoadingDetail(false) }
  }

  const scoreColor = (n) => (n >= 100 ? 'var(--ok)' : n > 0 ? 'var(--warn)' : 'var(--err)')

  if (list === null) return <div className="p-6"><LoadingSpinner size="sm" text="Loading attempts…" /></div>
  if (list.length === 0) {
    return (
      <div className="p-6 text-center text-t4 text-[13px]">
        No submissions yet. Press <span className="text-t3 font-semibold">Submit</span> to record your first attempt — they'll show up here.
      </div>
    )
  }

  return (
    <div className="p-4 space-y-2">
      <p className="text-[11px] text-t4 mb-1">{list.length} attempt{list.length === 1 ? '' : 's'} · newest first</p>
      {list.map((s) => (
        <div key={s.id} className="rounded-lg border border-line surface-inset overflow-hidden">
          <button
            onClick={() => toggle(s.id)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-h transition-colors"
          >
            <StatusBadge status={s.status} />
            <span className="text-xs font-semibold tabular" style={{ color: scoreColor(s.score) }}>{s.score}%</span>
            <span className="text-[11px] text-t4 tabular">{s.test_cases_passed}/{s.test_cases_total}</span>
            <span className="ml-auto text-[11px] text-t4 tabular">
              {formatDistanceToNow(new Date(s.submitted_at), { addSuffix: true })}
            </span>
            <ChevronDown size={13} className={`text-t4 transition-transform ${openId === s.id ? 'rotate-180' : ''}`} />
          </button>

          {openId === s.id && (
            <div className="border-t border-line p-3 space-y-2">
              {loadingDetail ? (
                <LoadingSpinner size="sm" />
              ) : detail ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-t4 font-semibold">Submitted code</span>
                    <button onClick={() => onLoadCode(detail.code)} className="btn-secondary btn-sm">
                      <Copy size={12} /> Load into editor
                    </button>
                  </div>
                  <pre className="font-mono text-xs text-t2 bg-surface-h border border-line rounded p-2 max-h-64 overflow-auto whitespace-pre">
                    {detail.code}
                  </pre>
                </>
              ) : (
                <p className="text-xs text-t4">Could not load this submission.</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Run panel (self-check, never grades) ────────────────────────────────────────

function RunSubTab({ label, active, onClick, dataTour }) {
  return (
    <button
      data-tour={dataTour}
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
        active ? 'text-t' : 'border-transparent text-t4 hover:text-t2'
      }`}
      style={active ? { borderColor: 'var(--brand)' } : undefined}
    >
      {label}
    </button>
  )
}

function InteractiveConsole({ status, output, exitCode, onRun, onStop, onSend }) {
  const [draft, setDraft] = useState('')
  const scrollRef = useRef(null)
  const inputRef  = useRef(null)

  const running   = status === 'running'
  const compiling = status === 'compiling'
  const idle      = status === 'idle'

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [output, status])

  useEffect(() => {
    if (running && inputRef.current) inputRef.current.focus()
  }, [running])

  const submitLine = () => {
    if (!running) return
    onSend(draft + '\n')   // PTY echoes the typed text back into the stream
    setDraft('')
  }

  return (
    <div className="space-y-2">
      {/* status row */}
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          {idle && <span className="text-t4">Console ready — press Run. Input is asked line-by-line, like CodeBlocks.</span>}
          {compiling && <span className="text-t4">Compiling…</span>}
          {running && (
            <span className="flex items-center gap-1.5" style={{ color: 'var(--ok)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--ok)' }} />
              running
            </span>
          )}
          {status === 'exited' && (
            <span style={{ color: exitCode === 0 ? 'var(--ok)' : 'var(--err)' }}>
              {exitCode === 0 ? '✓ exited (code 0)' : `✗ exited (code ${exitCode ?? '?'})`}
            </span>
          )}
          {status === 'error' && <span style={{ color: 'var(--err)' }}>✗ error</span>}
        </div>
        <div className="flex items-center gap-2">
          {running ? (
            <button onClick={onStop} className="px-2 py-0.5 rounded border border-line font-medium" style={{ color: 'var(--err)' }}>
              ■ Stop
            </button>
          ) : (
            <button onClick={onRun} disabled={compiling} className="px-2 py-0.5 rounded border border-line text-t3 hover:text-t hover:border-line-strong transition-colors disabled:opacity-40">
              ▶ {idle ? 'Run' : 'Run again'}
            </button>
          )}
        </div>
      </div>

      {/* terminal */}
      <div
        ref={scrollRef}
        onClick={() => inputRef.current?.focus()}
        className="h-44 overflow-auto surface-inset border border-line rounded px-3 py-2 font-mono text-xs leading-relaxed cursor-text"
      >
        {output
          ? <pre className="whitespace-pre-wrap break-words text-t2 m-0">{output}</pre>
          : (idle || compiling) && <span className="text-t4">{compiling ? 'Compiling your program…' : 'Program output will appear here.'}</span>}

        {running && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span style={{ color: 'var(--brand)' }}>›</span>
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitLine() } }}
              placeholder="type input + Enter"
              className="flex-1 bg-transparent outline-none border-0 p-0 text-t placeholder-t4 font-mono text-xs"
              autoComplete="off"
              spellCheck="false"
            />
          </div>
        )}
      </div>
    </div>
  )
}

function SampleTestsPanel({ run, samples }) {
  if (!run) {
    return (
      <div className="text-center py-6 text-xs text-t4">
        {samples.length === 0
          ? 'No sample cases for this problem — switch to the Console tab.'
          : <>Press <span className="text-t3 font-semibold">Run</span> to check against {samples.length} sample case{samples.length === 1 ? '' : 's'} (not graded).</>}
      </div>
    )
  }
  if (run.status === 'Compilation Error') {
    return (
      <pre
        className="text-xs font-mono border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap"
        style={{ color: 'var(--err)', background: 'color-mix(in srgb, var(--err) 5%, transparent)', borderColor: 'color-mix(in srgb, var(--err) 20%, transparent)' }}
      >
        {run.error || 'Compilation failed'}
      </pre>
    )
  }
  if (run.status === 'Error') {
    return <p className="text-xs" style={{ color: 'var(--err)' }}>{run.error}</p>
  }
  const passedCount = run.results.filter(r => r.passed).length
  const allPass = passedCount === run.results.length
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-semibold" style={{ color: allPass ? 'var(--ok)' : 'var(--err)' }}>
          {allPass ? '✓ All samples passed' : `${passedCount}/${run.results.length} samples passed`}
        </span>
        <span className="text-t4">· not graded — press Submit to score</span>
      </div>
      {run.results.map((r, i) => <SampleCaseRow key={r.id ?? i} r={r} index={i} />)}
    </div>
  )
}

// Compare expected vs actual line/char-by-char; highlight where "yours" diverges.
function buildDiff(expected, actual) {
  const e = (expected ?? '').split('\n')
  const a = (actual ?? '').split('\n')
  const rows = []
  let firstDiff = null
  const max = Math.max(e.length, a.length)
  for (let li = 0; li < max; li++) {
    const el = e[li]
    const al = a[li]
    if (al === undefined) { rows.push({ type: 'missing', text: el }); if (!firstDiff) firstDiff = { line: li + 1, col: 1 }; continue }
    if (el === undefined) { rows.push({ type: 'line', segs: [{ t: al, bad: true }] }); if (!firstDiff) firstDiff = { line: li + 1, col: 1 }; continue }
    if (el === al) { rows.push({ type: 'line', segs: [{ t: al, bad: false }] }); continue }
    const segs = []
    for (let ci = 0; ci < al.length; ci++) {
      const bad = el[ci] !== al[ci]
      if (bad && !firstDiff) firstDiff = { line: li + 1, col: ci + 1 }
      const last = segs[segs.length - 1]
      if (last && last.bad === bad) last.t += al[ci]
      else segs.push({ t: al[ci], bad })
    }
    if (al.length < el.length && !firstDiff) firstDiff = { line: li + 1, col: al.length + 1 }
    rows.push({ type: 'line', segs })
  }
  return { rows, firstDiff }
}

function DiffActual({ expected, actual, accent }) {
  const { rows, firstDiff } = buildDiff(expected, actual)
  const badStyle = { background: 'color-mix(in srgb, var(--err) 38%, transparent)', borderRadius: 2 }
  return (
    <>
      {firstDiff && (
        <div className="text-[10px] mb-1" style={{ color: accent }}>
          first difference at line {firstDiff.line}, col {firstDiff.col}
        </div>
      )}
      <pre
        className="font-mono text-xs text-t2 rounded px-2 py-1.5 whitespace-pre-wrap break-words max-h-32 overflow-auto border"
        style={{ borderColor: `color-mix(in srgb, ${accent} 25%, transparent)`, background: `color-mix(in srgb, ${accent} 6%, transparent)` }}
      >
        {rows.length === 0 || (rows.length === 1 && !rows[0].segs?.[0]?.t)
          ? <span className="text-t4">(no output)</span>
          : rows.map((row, ri) => (
              <span key={ri}>
                {row.type === 'missing'
                  ? <span className="opacity-60 italic">{row.text || ' '}  ← missing line</span>
                  : row.segs.map((s, si) => (
                      <span key={si} style={s.bad ? badStyle : undefined}>{s.t}</span>
                    ))}
                {ri < rows.length - 1 ? '\n' : ''}
              </span>
            ))}
      </pre>
    </>
  )
}

function SampleCaseRow({ r, index }) {
  const runFailed = r.run_status !== 'ok'
  const ok = r.passed
  const accent = ok ? 'var(--ok)' : 'var(--err)'
  const showDiff = !ok && !runFailed   // ran fine but wrong answer → highlight the diff
  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: `color-mix(in srgb, ${accent} 22%, transparent)`, background: `color-mix(in srgb, ${accent} 4%, transparent)` }}
    >
      <div className="flex items-center gap-2 px-3 py-1.5 border-b" style={{ borderColor: `color-mix(in srgb, ${accent} 15%, transparent)` }}>
        {ok ? <CheckCircle size={13} style={{ color: accent }} /> : <XCircle size={13} style={{ color: accent }} />}
        <span className="text-[11px] font-semibold text-t3">Sample {index + 1}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: accent }}>
          {runFailed ? r.run_status : (ok ? 'Passed' : 'Failed')}
        </span>
        {r.time_ms != null && <span className="ml-auto text-[10px] text-t4 tabular">{r.time_ms.toFixed(1)}ms</span>}
      </div>

      <div className="px-3 pt-2">
        <div className="text-[10px] text-t4 font-semibold uppercase tracking-wider mb-1">Input</div>
        <pre className="font-mono text-xs text-t2 surface-inset border border-line rounded px-2 py-1.5 whitespace-pre-wrap break-words max-h-24 overflow-auto">
          {r.input || '(none)'}
        </pre>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 pt-2">
        <div>
          <div className="text-[10px] text-t4 font-semibold uppercase tracking-wider mb-1">Expected Output</div>
          <pre className="font-mono text-xs text-t2 surface-inset border border-line rounded px-2 py-1.5 whitespace-pre-wrap break-words max-h-32 overflow-auto">
            {r.expected || '(empty)'}
          </pre>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: accent }}>Your Output</div>
          {showDiff ? (
            <DiffActual expected={r.expected} actual={r.actual} accent={accent} />
          ) : (
            <pre
              className="font-mono text-xs rounded px-2 py-1.5 whitespace-pre-wrap break-words max-h-32 overflow-auto border"
              style={{ color: accent, borderColor: `color-mix(in srgb, ${accent} 25%, transparent)`, background: `color-mix(in srgb, ${accent} 6%, transparent)` }}
            >
              {runFailed ? (r.run_status + (r.actual ? '\n' + r.actual : '')) : (r.actual || '(no output)')}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}

function ProblemStatement({ problem: p, liked, setLiked }) {
  const visibleTCs = p.test_cases?.filter(tc => !tc.is_hidden) || []
  const copyText   = (text) => { navigator.clipboard.writeText(text); toast.success('Copied!') }

  return (
    <div className="px-4 py-4 space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded border border-line"
          style={p.difficulty === 'easy'
            ? { color: 'var(--ok)', background: 'color-mix(in srgb, var(--ok) 12%, transparent)' }
            : p.difficulty === 'hard'
            ? { color: 'var(--err)', background: 'color-mix(in srgb, var(--err) 12%, transparent)' }
            : { color: 'var(--warn)', background: 'color-mix(in srgb, var(--warn) 12%, transparent)' }}
        >
          {p.difficulty?.charAt(0).toUpperCase() + p.difficulty?.slice(1)}
        </span>
        {p.topics && (
          <span className="text-[11px] border border-line px-2 py-0.5 rounded" style={{ color: 'var(--info)', background: 'color-mix(in srgb, var(--info) 12%, transparent)' }}>
            {p.topics}
          </span>
        )}
        {p.duration && (
          <span className="text-[11px] border border-line px-2 py-0.5 rounded flex items-center gap-1" style={{ color: 'var(--info)', background: 'color-mix(in srgb, var(--info) 12%, transparent)' }}>
            <Clock size={10} /> {p.duration} min
          </span>
        )}
      </div>

      <div>
        <h2 className="h3 mb-3">{p.title}</h2>
        <p className="text-sm text-t2 whitespace-pre-wrap leading-relaxed">{p.description}</p>
      </div>

      {visibleTCs.length > 0 && (
        <div className="space-y-3">
          {visibleTCs.map((tc, i) => (
            <div key={tc.id} className="rounded-lg border border-line surface-inset overflow-hidden">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-t3 border-b border-line">
                Sample {i + 1}:
              </div>
              <div className="grid grid-cols-2 divide-x divide-[var(--b)]">
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-t4 font-medium">Input</span>
                    <button onClick={() => copyText(tc.input_data || '')} className="text-t4 hover:text-t3 transition-colors">
                      <Copy size={11} />
                    </button>
                  </div>
                  <pre className="text-sm text-t2 font-mono leading-relaxed">{tc.input_data || '(none)'}</pre>
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-t4 font-medium">Output</span>
                    <button onClick={() => copyText(tc.expected_output)} className="text-t4 hover:text-t3 transition-colors">
                      <Copy size={11} />
                    </button>
                  </div>
                  <pre className="text-sm text-t2 font-mono leading-relaxed">{tc.expected_output}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg surface-inset border border-line p-3 text-xs text-t3 space-y-1">
        <p>• Write your solution in C using <code className="text-brand">printf</code> / <code className="text-brand">scanf</code></p>
        <p>• Time limit: 5 seconds per test case</p>
        {p.test_cases_count > 0 && <p>• {p.test_cases_count} total test cases (some may be hidden)</p>}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-line">
        <span className="text-xs text-t4">Did you like the problem?</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setLiked(liked === 'up' ? null : 'up')}
            className={`p-1.5 rounded transition-colors ${liked === 'up' ? '' : 'text-t4 hover:text-t2'}`}
            style={liked === 'up' ? { color: 'var(--ok)', background: 'color-mix(in srgb, var(--ok) 12%, transparent)' } : undefined}
          >
            <ThumbsUp size={14} />
          </button>
          <button
            onClick={() => setLiked(liked === 'down' ? null : 'down')}
            className={`p-1.5 rounded transition-colors ${liked === 'down' ? '' : 'text-t4 hover:text-t2'}`}
            style={liked === 'down' ? { color: 'var(--err)', background: 'color-mix(in srgb, var(--err) 12%, transparent)' } : undefined}
          >
            <ThumbsDown size={14} />
          </button>
          <button
            onClick={() => toast('Comments coming soon!')}
            className="p-1.5 rounded text-t4 hover:text-t2 transition-colors"
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
      <div className="px-4 py-3 border-b border-line flex items-center gap-2 flex-shrink-0">
        <Sparkles size={15} className="text-brand" />
        <div>
          <p className="text-sm font-semibold text-t">AI Tutor</p>
          <p className="text-[11px] text-t4">Ask questions about this problem</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <Sparkles size={28} className="text-brand/40 mx-auto" />
            <p className="text-sm text-t4">Need a hint? Ask the AI tutor!</p>
            <div className="flex flex-col gap-1.5 mt-3">
              {['Give me a hint for this problem', 'What data structure should I use?', 'Explain the approach step by step'].map(q => (
                <button
                  key={q}
                  onClick={() => setQuestion(q)}
                  className="text-xs text-brand hover:opacity-80 border border-line hover:border-line-strong rounded px-3 py-1.5 transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                m.role === 'user'
                  ? 'text-white rounded-br-sm'
                  : 'surface-inset text-t2 border border-line rounded-bl-sm'
              }`}
              style={m.role === 'user' ? { background: 'var(--brand-solid)' } : undefined}
            >
              {m.role === 'ai' && (
                <div className="flex items-center gap-1 mb-1">
                  <Sparkles size={11} className="text-brand" />
                  <span className="text-[10px] text-brand font-semibold">AI Tutor</span>
                </div>
              )}
              {m.role === 'ai' ? <Markdown text={m.text} /> : m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="surface-inset border border-line rounded-xl rounded-bl-sm px-3 py-2">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0ms]" style={{ background: 'var(--brand)' }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:150ms]" style={{ background: 'var(--brand)' }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:300ms]" style={{ background: 'var(--brand)' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-3 pb-3 border-t border-line pt-2 flex-shrink-0">
        <div className="flex gap-2">
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
            placeholder="Ask a question about this problem..."
            className="flex-1 surface-inset border border-line rounded-lg px-3 py-2 text-sm text-t2 placeholder-t4 focus:outline-none focus:border-line-strong"
          />
          <button
            onClick={onSend}
            disabled={loading || !question.trim()}
            className="btn-primary px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function SubmissionResult({ result, problem }) {
  const [expanded, setExpanded] = useState({})
  const toggle = (i) => setExpanded(p => ({ ...p, [i]: !p[i] }))

  const pct = result.total ? Math.round((result.passed / result.total) * 100) : 0
  return (
    <div className="space-y-4">
      <div
        className="rounded-xl border p-4"
        style={result.status === 'Accepted'
          ? { borderColor: 'color-mix(in srgb, var(--ok) 30%, transparent)', background: 'color-mix(in srgb, var(--ok) 8%, transparent)' }
          : { borderColor: 'color-mix(in srgb, var(--err) 30%, transparent)', background: 'color-mix(in srgb, var(--err) 8%, transparent)' }}
      >
        <div className="flex items-center gap-2 mb-1">
          {result.status === 'Accepted'
            ? <CheckCircle size={18} style={{ color: 'var(--ok)' }} />
            : <XCircle    size={18} style={{ color: 'var(--err)' }} />}
          <span className="font-bold text-base" style={{ color: result.status === 'Accepted' ? 'var(--ok)' : 'var(--err)' }}>
            {result.status}
          </span>
        </div>
        <p className="text-xs text-t3 tabular">{result.passed}/{result.total} test cases passed · Score: {result.score}%</p>
      </div>
      <div>
        <div className="flex justify-between text-xs text-t3 mb-1.5 tabular"><span>Test Cases</span><span>{pct}%</span></div>
        <div className="h-1.5 rounded-full surface-inset overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{
            width: `${pct}%`,
            background: pct === 100 ? 'var(--ok)' : pct > 50 ? 'var(--warn)' : 'var(--err)',
          }} />
        </div>
      </div>
      {result.error && (
        <pre
          className="text-xs font-mono border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap"
          style={{ color: 'var(--err)', background: 'color-mix(in srgb, var(--err) 5%, transparent)', borderColor: 'color-mix(in srgb, var(--err) 20%, transparent)' }}
        >
          {result.error}
        </pre>
      )}
      <div className="space-y-1.5">
        {result.results?.map((r, i) => {
          const tc = problem?.test_cases?.find(t => t.id === r.test_case_id)
          const canExpand = !r.is_hidden && tc
          const isExpanded = expanded[i]

          return (
            <div
              key={i}
              className="rounded-lg border overflow-hidden transition-colors"
              style={{
                borderColor: r.status === 'Passed'
                  ? 'color-mix(in srgb, var(--ok) 15%, transparent)'
                  : 'color-mix(in srgb, var(--err) 15%, transparent)',
                background: r.status === 'Passed'
                  ? 'color-mix(in srgb, var(--ok) 5%, transparent)'
                  : 'color-mix(in srgb, var(--err) 5%, transparent)'
              }}
            >
              <div
                className={`flex items-center gap-3 p-2.5 ${canExpand ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5' : ''}`}
                onClick={() => canExpand && toggle(i)}
              >
                {r.status === 'Passed'
                  ? <CheckCircle size={13} className="flex-shrink-0" style={{ color: 'var(--ok)' }} />
                  : <XCircle    size={13} className="flex-shrink-0" style={{ color: 'var(--err)' }} />}
                <span className="text-xs text-t3 tabular flex-1">Case #{i + 1}{r.is_hidden ? ' (hidden)' : ''}</span>
                <StatusBadge status={r.status} />
                {r.execution_time != null && (
                  <span className="text-xs text-t4 w-12 text-right tabular">{r.execution_time.toFixed(1)}ms</span>
                )}
                {canExpand && (
                  <ChevronDown size={14} className={`text-t4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                )}
              </div>
              
              {canExpand && isExpanded && (
                <div className="p-3 border-t text-xs grid gap-3" style={{ background: 'var(--bg)', borderColor: 'inherit' }}>
                  <div>
                    <div className="text-[10px] text-t4 font-semibold uppercase tracking-wider mb-1">Input</div>
                    <pre className="font-mono text-t2 bg-surface-h border border-line rounded px-2 py-1.5 whitespace-pre-wrap">{tc.input_data}</pre>
                  </div>
                  <div>
                    <div className="text-[10px] text-t4 font-semibold uppercase tracking-wider mb-1">Expected Output</div>
                    <pre className="font-mono text-t2 bg-surface-h border border-line rounded px-2 py-1.5 whitespace-pre-wrap">{tc.expected_output}</pre>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: r.status === 'Passed' ? 'var(--ok)' : 'var(--err)' }}>Actual Output</div>
                    <pre className="font-mono rounded px-2 py-1.5 whitespace-pre-wrap border" style={{ color: r.status === 'Passed' ? 'var(--ok)' : 'var(--err)', borderColor: r.status === 'Passed' ? 'color-mix(in srgb, var(--ok) 30%, transparent)' : 'color-mix(in srgb, var(--err) 30%, transparent)' }}>{r.actual_output || '(no output)'}</pre>
                  </div>
                </div>
              )}
            </div>
          )
        })}
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
      <div className="w-[92vw] max-w-7xl h-[88vh] bg-beige-pg border border-line rounded-2xl flex flex-col shadow-2xl overflow-hidden">

        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-line bg-surface-h flex-shrink-0">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-brand" />
            <span className="font-semibold text-t text-sm">Code Visualizer</span>
            <span className="text-[11px] text-t4 border border-line px-2 py-0.5 rounded">C Language</span>
          </div>
          <div className="flex items-center gap-3">
            {output && (
              <span
                className="text-[11px] px-2 py-0.5 rounded border border-line font-medium tabular"
                style={isSuccess
                  ? { color: 'var(--ok)', background: 'color-mix(in srgb, var(--ok) 12%, transparent)' }
                  : { color: 'var(--err)', background: 'color-mix(in srgb, var(--err) 12%, transparent)' }}
              >
                {isSuccess ? `Executed in ${output.time_ms?.toFixed(1)}ms` : output.status}
              </span>
            )}
            <button
              onClick={handleRun}
              disabled={running}
              className="btn-primary btn-sm rounded-lg disabled:opacity-50"
            >
              {running
                ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Play size={12} fill="currentColor" />}
              {running ? 'Running…' : 'Run'}
            </button>
            <button onClick={onClose} className="text-t3 hover:text-t transition-colors p-1 rounded hover:bg-surface-h">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal body */}
        <div className="flex flex-1 overflow-hidden">

          {/* Code pane */}
          <div className="w-[55%] border-r border-line overflow-auto bg-beige-pg">
            <div className="min-h-full py-3">
              {lines.map((line, i) => {
                const isActive = activeCodeLine === i
                return (
                  <div
                    key={i}
                    className={`flex items-stretch group transition-colors duration-100 border-l-2 ${
                      isActive ? '' : 'border-transparent'
                    }`}
                    style={isActive ? { background: 'var(--brandGhost)', borderColor: 'var(--brand)' } : undefined}
                  >
                    <span
                      className={`select-none text-right pr-4 pl-4 min-w-[3.5rem] text-[11px] leading-6 flex-shrink-0 font-mono ${
                        isActive ? 'font-bold' : 'text-t4'
                      }`}
                      style={isActive ? { color: 'var(--brand)' } : undefined}
                    >
                      {i + 1}
                    </span>
                    <pre className={`leading-6 whitespace-pre flex-1 font-mono text-sm pr-6 ${
                      isActive ? 'text-t' : 'text-t2'
                    }`}>
                      {line || ' '}
                    </pre>
                    {isActive && running && (
                      <span className="mr-3 flex items-center flex-shrink-0 gap-0.5">
                        <span className="w-1 h-1 rounded-full animate-bounce [animation-delay:0ms]" style={{ background: 'var(--brand)' }} />
                        <span className="w-1 h-1 rounded-full animate-bounce [animation-delay:100ms]" style={{ background: 'var(--brand)' }} />
                        <span className="w-1 h-1 rounded-full animate-bounce [animation-delay:200ms]" style={{ background: 'var(--brand)' }} />
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* I/O pane */}
          <div className="w-[45%] flex flex-col overflow-hidden bg-beige-pg">

            {/* stdin */}
            <div className="flex-shrink-0 border-b border-line">
              <div className="px-4 py-2 bg-surface-h flex items-center gap-2">
                <Terminal size={12} className="text-t4" />
                <span className="text-[11px] font-semibold text-t3 uppercase tracking-wide">stdin (input)</span>
              </div>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Enter program input here (optional)…"
                className="w-full h-24 bg-beige-pg px-4 py-3 text-sm text-t2 font-mono resize-none focus:outline-none placeholder-t4 border-0"
              />
            </div>

            {/* stdout */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 py-2 bg-surface-h border-b border-line flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Terminal size={12} style={{ color: isError ? 'var(--err)' : 'var(--ok)' }} />
                  <span className="text-[11px] font-semibold text-t3 uppercase tracking-wide">
                    {isError ? 'Error / stderr' : 'stdout (output)'}
                  </span>
                </div>
                {output?.output && (
                  <button
                    onClick={() => navigator.clipboard.writeText(output.output)}
                    className="flex items-center gap-1 text-[11px] text-t4 hover:text-t3 transition-colors"
                  >
                    <Copy size={10} /> Copy
                  </button>
                )}
              </div>

              <div ref={outputRef} className="flex-1 overflow-auto px-4 py-3">
                {!output && !running && (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-40">
                    <Play size={28} className="text-t4" />
                    <p className="text-sm text-t4">Click <span className="text-t3 font-semibold">Run</span> to execute your code</p>
                  </div>
                )}
                {running && !output && (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center space-y-3">
                      <div className="flex gap-1.5 justify-center">
                        {[0, 150, 300].map(d => (
                          <span key={d} className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--brand)', animationDelay: `${d}ms` }} />
                        ))}
                      </div>
                      <p className="text-xs text-t4">Compiling &amp; running…</p>
                    </div>
                  </div>
                )}
                {output && (
                  <pre
                    className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words"
                    style={{ color: isError ? 'var(--err)' : 'var(--ok)' }}
                  >
                    {displayedOutput || output.output || '(no output)'}
                    {isSuccess && displayedOutput === output.output && (
                      <span className="animate-pulse" style={{ color: 'var(--ok)' }}>▋</span>
                    )}
                  </pre>
                )}
              </div>

              {output && (
                <div className="flex-shrink-0 border-t border-line px-4 py-2 bg-surface-h flex items-center gap-4 text-[11px] text-t4">
                  <span className="font-semibold" style={{ color: isSuccess ? 'var(--ok)' : 'var(--err)' }}>
                    {isSuccess ? '✓ Execution successful' : '✗ ' + output.status}
                  </span>
                  {output.time_ms != null && (
                    <span className="tabular">Time: <span className="text-t3">{output.time_ms.toFixed(2)}ms</span></span>
                  )}
                  {isSuccess && (
                    <span className="tabular">Output lines: <span className="text-t3">{(output.output || '').split('\n').filter(Boolean).length}</span></span>
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
