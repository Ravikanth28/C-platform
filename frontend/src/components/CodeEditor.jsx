import Editor from '@monaco-editor/react'

const MONACO_LANG = {
  python: 'python',
  javascript: 'javascript',
  cpp: 'cpp',
}

export default function CodeEditor({ code, language, onChange, height = '100%' }) {
  return (
    <Editor
      height={height}
      language={MONACO_LANG[language] ?? 'plaintext'}
      value={code}
      onChange={(val) => onChange(val ?? '')}
      theme="vs-dark"
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        wordWrap: 'on',
        lineNumbers: 'on',
        renderLineHighlight: 'line',
        padding: { top: 12 },
      }}
    />
  )
}
