export function Container({ children }: 
  { children: React.ReactNode 
  }) {
  return <div className="container mx-auto max-w-6xl p-4 py-16">{children}</div>;
  
}
