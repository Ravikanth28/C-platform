export default function LoadingSpinner({ size = 'md', text }) {
  const sz = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }[size] || 'h-8 w-8'
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sz} border-2 border-primary/20 border-t-primary rounded-full animate-spin`} />
      {text && <p className="text-sm text-slate-400">{text}</p>}
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex h-full min-h-[300px] items-center justify-center">
      <LoadingSpinner size="lg" text="Loading…" />
    </div>
  )
}
