import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authLogin } from '../api/gasClient'
import { useAppStore } from '../store/useAppStore'
import { isValidIsraeliPhone, normalizePhone } from '../utils/phoneNormalizer'
import { APP_NAME } from '../config/constants'
import { LoadingSpinner } from '../components/shared/LoadingSpinner'
import { ErrorBanner } from '../components/shared/ErrorBanner'
import type { AuthLoginResponse } from '../types'

export default function LoginPage() {
  const navigate    = useNavigate()
  const setSession  = useAppStore(s => s.setSession)

  const [phone, setPhone]     = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const handleLogin = async () => {
    const normalized = normalizePhone(phone)
    if (!isValidIsraeliPhone(normalized)) {
      setError('אנא הכנס/י מספר טלפון ישראלי תקין (לדוגמה: 0521234567)')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const data = await authLogin(normalized) as AuthLoginResponse
      setSession({
        session_token: data.session_token,
        phone: normalized,
        family_id: data.family_id,
        children: data.children,
        display_name: data.display_name,
        is_special_today: data.is_special_today,
        expires_at: '',
      })
      navigate('/parent')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בהתחברות')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-indigo-100 flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-3">🌈</div>
        <h1 className="text-3xl font-extrabold text-primary-700 mb-1">{APP_NAME}</h1>
        <p className="text-gray-500 text-sm">מערכת ניהול משמרות גן</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-6">
        <h2 className="font-bold text-gray-800 text-xl mb-1 text-right">כניסת הורים</h2>
        <p className="text-gray-500 text-sm mb-5 text-right">הכנס/י את מספר הטלפון הרשום במערכת</p>

        {error && <div className="mb-4"><ErrorBanner message={error} onDismiss={() => setError(null)} /></div>}

        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 block mb-1 text-right">מספר טלפון</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="052-1234567"
            className="input-field"
            inputMode="tel"
            autoComplete="tel"
            disabled={isLoading}
            dir="ltr"
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={!phone || isLoading}
          className="btn-primary w-full py-4 text-lg"
        >
          {isLoading ? <LoadingSpinner size="sm" className="mx-auto" /> : 'כניסה →'}
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          מספרך לא רשום? פנה/י לצוות הגן
        </p>
      </div>

      {/* Admin link */}
      <button
        onClick={() => navigate('/admin/login')}
        className="mt-6 text-xs text-gray-400 hover:text-gray-600 underline transition-colors"
      >
        כניסת מנהל מערכת
      </button>
    </div>
  )
}
