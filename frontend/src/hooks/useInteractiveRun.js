import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Drives the CodeBlocks-style interactive console over a WebSocket.
 *
 * status: 'idle' | 'compiling' | 'running' | 'exited' | 'error'
 * output: the live program stream (program output + PTY-echoed input)
 *
 * The program runs under a pseudo-terminal on the backend, so typed input
 * is echoed by the terminal itself — we don't echo locally (avoids doubles).
 */
export default function useInteractiveRun() {
  const [output, setOutput]   = useState('')
  const [status, setStatus]   = useState('idle')
  const [exitCode, setExitCode] = useState(null)
  const wsRef = useRef(null)
  const modeRef = useRef('pty') // 'pty' echoes input itself; 'pipe' needs local echo

  const closeWs = () => {
    const ws = wsRef.current
    if (ws) {
      try { ws.onclose = null; ws.close() } catch { /* ignore */ }
      wsRef.current = null
    }
  }

  const start = useCallback((code) => {
    closeWs()
    setOutput('')
    setExitCode(null)
    setStatus('compiling')

    const token = localStorage.getItem('token') || ''
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const url = `${proto}://${window.location.host}/api/submissions/run-interactive?token=${encodeURIComponent(token)}`

    let ws
    try {
      ws = new WebSocket(url)
    } catch {
      setStatus('error')
      setOutput('Could not open the interactive connection.')
      return
    }
    wsRef.current = ws

    ws.onopen = () => ws.send(JSON.stringify({ type: 'start', code }))

    ws.onmessage = (ev) => {
      let msg
      try { msg = JSON.parse(ev.data) } catch { return }
      switch (msg.type) {
        case 'started':
          modeRef.current = msg.mode || 'pty'
          setStatus('running'); break
        case 'info':
          setOutput((o) => o + (msg.data || '')); break
        case 'stdout':
          setOutput((o) => o + msg.data); setStatus('running'); break
        case 'compile_error':
          setOutput(msg.data || 'Compilation failed'); setStatus('error'); break
        case 'error':
          setOutput((o) => (o ? o + '\n' : '') + (msg.data || 'Runtime error')); setStatus('error'); break
        case 'exit':
          setExitCode(msg.code ?? null)
          setStatus((s) => (s === 'error' ? 'error' : 'exited'))
          break
        default: break
      }
    }

    ws.onerror = () => {
      setStatus((s) => (s === 'compiling' || s === 'running' ? 'error' : s))
    }
    ws.onclose = () => {
      setStatus((s) => (s === 'running' || s === 'compiling' ? 'exited' : s))
    }
  }, [])

  const sendInput = useCallback((text) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'stdin', data: text }))
      // pipe fallback has no terminal echo — show what was typed ourselves
      if (modeRef.current === 'pipe') setOutput((o) => o + text)
    }
  }, [])

  const stop = useCallback(() => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'stop' }))
    }
  }, [])

  const reset = useCallback(() => {
    closeWs()
    setOutput('')
    setExitCode(null)
    setStatus('idle')
  }, [])

  useEffect(() => closeWs, [])

  return { output, status, exitCode, start, sendInput, stop, reset }
}
