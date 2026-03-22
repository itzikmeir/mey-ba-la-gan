import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminLogin } from '../api/gasClient'
import { useAppStore } from '../store/useAppStore'
import { APP_NAME } from '../config/constants'
import { LoadingSpinner } from '../components/shared/LoadingSpinner'
import { ErrorBanner } from '../components/shared/ErrorBanner'

export default function AdminLoginPage() {
  const navigate         = useNavigate()
  const setAdminSession  = useAppStore(s => s.setAdminSession)

  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const handleLogin = async () => {
    if (!password) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await adminLogin(password) as { admin_token: string }
      setAdminSession({ admin_token: data.admin_token, expires_at: '' })
      navigate('/admin')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'סיסמה שגויה')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-8">
        <div className="text-6xl mb-3">🔐</div>
        <h1 className="text-2xl font-extrabold text-purple-700 mb-1">{APP_NAME}</h1>
        <p className="text-gray-500 text-sm">כניסת מנהל מערכת</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-6">
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        <div className="mb-4 mt-2">
          <label className="text-sm font-medium text-gray-700 block mb-1 text-right">סיסמת מנהל</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="הכנס סיסמה"
            className="input-field"
            autoComplete="current-password"
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={!password || isLoading}
          className="w-full py-4 rounded-xl font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? <LoadingSpinner size="sm" className="mx-auto" /> : 'כניסה'}
        </button>
      </div>

      <button onClick={() => navigate('/')} className="mt-6 text-xs text-gray-400 hover:text-gray-600 underline">
        → חזרה לכניסת הורים
      </button>
    </div>
  )
}
