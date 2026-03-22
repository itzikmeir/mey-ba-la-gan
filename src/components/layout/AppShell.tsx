import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { APP_NAME } from '../../config/constants'

interface Props {
  children: ReactNode
  isAdmin?: boolean
}

export function AppShell({ children, isAdmin = false }: Props) {
  const navigate       = useNavigate()
  const clearSession   = useAppStore(s => s.clearSession)
  const clearAdmin     = useAppStore(s => s.clearAdminSession)
  const session        = useAppStore(s => s.session)
  const displayName    = session?.display_name ?? ''

  const handleLogout = () => {
    if (isAdmin) {
      clearAdmin()
      navigate('/admin/login')
    } else {
      clearSession()
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className={`sticky top-0 z-40 safe-top ${isAdmin ? 'bg-purple-700' : 'bg-primary-600'} text-white shadow-md`}>
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto w-full">
          <button onClick={handleLogout} className="text-white/80 hover:text-white text-sm font-medium transition-colors">
            יציאה
          </button>
          <div className="text-center">
            <h1 className="font-bold text-lg leading-tight">{APP_NAME}</h1>
            {!isAdmin && displayName && (
              <p className="text-white/80 text-xs">{displayName}</p>
            )}
            {isAdmin && (
              <p className="text-white/80 text-xs">מנהל מערכת</p>
            )}
          </div>
          <div className="w-10" /> {/* spacer */}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-8">
        {children}
      </main>
    </div>
  )
}
