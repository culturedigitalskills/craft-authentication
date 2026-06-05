export function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`container mx-auto max-w-6xl px-4 py-10 ${className ?? ''}`}>{children}</div>
}
