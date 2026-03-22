import { useState } from 'react'
import type { Child, ChildPreference, DayInfoResponse, Submission } from '../../types'
import { ErrorBanner } from '../shared/ErrorBanner'
import { ConfirmModal } from '../shared/ConfirmModal'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { parentSubmitPreference, parentSetAbsent } from '../../api/gasClient'
import { useAppStore } from '../../store/useAppStore'

interface Props {
  children: Child[]
  dayInfo: DayInfoResponse
  isSpecial: boolean
  existingSubmissions: Submission[]
  onSuccess: () => void
}

export function PreferenceForm({ children, dayInfo, isSpecial, existingSubmissions, onSuccess }: Props) {
  const session = useAppStore(s => s.session)

  // Build initial state from existing submissions
  const getExisting = (childId: string): Submission | undefined =>
    existingSubmissions.find(s => s.child_id === childId)

  const [prefs, setPrefs] = useState<Record<string, 'shift1' | 'shift2' | 'absent' | ''>>(() => {
    const init: Record<string, 'shift1' | 'shift2' | 'absent' | ''> = {}
    children.forEach(c => {
      const ex = getExisting(c.id)
      init[c.id] = (ex?.preference_1 as 'shift1' | 'shift2' | 'absent') || ''
    })
    return init
  })

  const [pref2, setPref2]           = useState<Record<string, 'shift1' | 'shift2' | ''>>(() => {
    const init: Record<string, 'shift1' | 'shift2' | ''> = {}
    children.forEach(c => {
      const ex = getExisting(c.id)
      init[c.id] = (ex?.preference_2 as 'shift1' | 'shift2') || ''
    })
    return init
  })

  const [specialCode, setSpecialCode] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading]     = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const allSelected = children.every(c => prefs[c.id] !== '')

  const handleSubmit = async () => {
    if (!session) return
    setIsLoading(true)
    setError(null)
    try {
      const submissions: ChildPreference[] = children.map(c => ({
        child_id:    c.id,
        preference_1: prefs[c.id] as 'shift1' | 'shift2' | 'absent',
        preference_2: isSpecial && pref2[c.id] ? pref2[c.id] as 'shift1' | 'shift2' : undefined,
        special_code: isSpecial && pref2[c.id] ? specialCode : undefined,
      }))
      await parentSubmitPreference(session.session_token, submissions)
      onSuccess()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה לא ידועה')
    } finally {
      setIsLoading(false)
      setShowConfirm(false)
    }
  }

  const handleAbsentAll = async () => {
    if (!session) return
    setIsLoading(true)
    setError(null)
    try {
      await parentSetAbsent(session.session_token, children.map(c => c.id))
      onSuccess()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {children.map(child => (
        <div key={child.id} className="card">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">👶</span>
            <h3 className="font-bold text-gray-800 text-lg">{child.name}</h3>
            {getExisting(child.id) && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">נשלח</span>
            )}
          </div>

          <p className="text-sm text-gray-500 mb-3">בחר/י משמרת מועדפת:</p>

          <div className="flex gap-3">
            {/* Shift 1 */}
            <button
              onClick={() => setPrefs(p => ({ ...p, [child.id]: 'shift1' }))}
              className={`shift-btn border-2 flex-col gap-1 ${
                prefs[child.id] === 'shift1'
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-blue-200 text-blue-700 hover:bg-blue-50'
              }`}
            >
              <span className="text-sm font-bold">{dayInfo.shift1?.name || 'בוקר'}</span>
              <span className="text-xs opacity-80">{dayInfo.shift1?.arrival}–{dayInfo.shift1?.end}</span>
            </button>

            {/* Shift 2 */}
            <button
              onClick={() => setPrefs(p => ({ ...p, [child.id]: 'shift2' }))}
              className={`shift-btn border-2 flex-col gap-1 ${
                prefs[child.id] === 'shift2'
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'border-green-200 text-green-700 hover:bg-green-50'
              }`}
            >
              <span className="text-sm font-bold">{dayInfo.shift2?.name || 'צהריים'}</span>
              <span className="text-xs opacity-80">{dayInfo.shift2?.arrival}–{dayInfo.shift2?.end}</span>
            </button>
          </div>

          {/* Special parent: second preference */}
          {isSpecial && prefs[child.id] && prefs[child.id] !== 'absent' && (
            <div className="mt-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
              <p className="text-purple-700 text-xs font-semibold mb-2">✨ משמרת שנייה (הרשאה מיוחדת):</p>
              <div className="flex gap-2">
                {(['shift1', 'shift2'] as const).filter(s => s !== prefs[child.id]).map(s => (
                  <button
                    key={s}
                    onClick={() => setPref2(p => ({ ...p, [child.id]: p[child.id] === s ? '' : s }))}
                    className={`flex-1 py-2 px-2 rounded-lg border text-xs font-medium transition-colors ${
                      pref2[child.id] === s
                        ? s === 'shift1' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-green-600 border-green-600 text-white'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {s === 'shift1' ? dayInfo.shift1?.name || 'בוקר' : dayInfo.shift2?.name || 'צהריים'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Special code input */}
      {isSpecial && children.some(c => pref2[c.id]) && (
        <div className="card">
          <label className="text-sm font-semibold text-purple-700 mb-2 block">קוד יומי (לשתי המשמרות):</label>
          <input
            type="text"
            value={specialCode}
            onChange={e => setSpecialCode(e.target.value)}
            placeholder="הכנס קוד שקיבלת"
            className="input-field text-center tracking-widest text-xl"
            maxLength={6}
            inputMode="numeric"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <button
          onClick={() => setShowConfirm(true)}
          disabled={!allSelected || isLoading}
          className="btn-primary w-full text-lg py-4"
        >
          {isLoading ? <LoadingSpinner size="sm" className="mx-auto" /> : '✅ שלח העדפות'}
        </button>

        <button
          onClick={handleAbsentAll}
          disabled={isLoading}
          className="btn-ghost w-full text-red-500 hover:bg-red-50"
        >
          😴 לא אגיע מחר
        </button>
      </div>

      {showConfirm && (
        <ConfirmModal
          title="אישור שליחת העדפות"
          message="לאחר השליחה ניתן לשנות עד תום מועד ההרשמה."
          confirmLabel="שלח"
          onConfirm={handleSubmit}
          onCancel={() => setShowConfirm(false)}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}
