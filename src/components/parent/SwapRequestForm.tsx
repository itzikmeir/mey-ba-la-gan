import { useState } from 'react'
import { parentSubmitSwapRequest } from '../../api/gasClient'
import { useAppStore } from '../../store/useAppStore'
import { ErrorBanner } from '../shared/ErrorBanner'

interface Props {
  childId: string
  childName: string
  currentShift: string
  date: string
  onClose: () => void
}

export function SwapRequestForm({ childId, childName, currentShift, date, onClose }: Props) {
  const session        = useAppStore(s => s.session)
  const [reason, setReason]   = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [done, setDone]           = useState(false)

  const requestedShift = currentShift === 'shift1' ? 'shift2' : 'shift1'

  const handleSubmit = async () => {
    if (!session || !reason.trim()) return
    setIsLoading(true)
    setError(null)
    try {
      await parentSubmitSwapRequest(
        session.session_token, childId, childName, currentShift, requestedShift, reason
      )
      setDone(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה')
    } finally {
      setIsLoading(false)
    }
  }

  if (done) {
    return (
      <div className="text-center py-6">
        <div className="text-5xl mb-3">✅</div>
        <h3 className="font-bold text-gray-800 text-lg mb-2">בקשה נשלחה!</h3>
        <p className="text-gray-500 text-sm mb-4">המנהל יקבל הודעה ויעדכן אותך בהחלטה</p>
        <button onClick={onClose} className="btn-primary px-8">סגור</button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        <h3 className="font-bold text-gray-800 text-lg">בקשת החלפת משמרת</h3>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm text-gray-600">
        <p><strong>{childName}</strong></p>
        <p>משמרת נוכחית: <strong>{currentShift === 'shift1' ? 'בוקר' : 'צהריים'}</strong></p>
        <p>משמרת מבוקשת: <strong>{requestedShift === 'shift1' ? 'בוקר' : 'צהריים'}</strong></p>
      </div>

      <label className="text-sm font-semibold text-gray-700 mb-2 block">סיבה לבקשה:</label>
      <textarea
        value={reason}
        onChange={e => setReason(e.target.value)}
        placeholder="אנא פרט/י את הסיבה..."
        className="input-field h-24 resize-none mb-4"
        maxLength={500}
      />

      <p className="text-xs text-gray-500 mb-4">
        ⚠️ הבקשה תועבר למנהל לאישור. אישור עשוי להשפיע על שיבוצים נוספים.
      </p>

      <button
        onClick={handleSubmit}
        disabled={!reason.trim() || isLoading}
        className="btn-primary w-full"
      >
        {isLoading ? 'שולח...' : 'שלח בקשה'}
      </button>
    </div>
  )
}
