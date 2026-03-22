import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export function RTLProvider({ children }: Props) {
  return (
    <div dir="rtl" className="min-h-screen font-sans">
      {children}
    </div>
  )
}
