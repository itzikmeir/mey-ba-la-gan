import { useState } from 'react'
import { adminRunAssignment, adminOverrideAssignment } from '../../api/gasClient'
import { useAppStore } from '../../store/useAppStore'
import { ConfirmModal } from '../shared/ConfirmModal'
import { ErrorBanner } from '../shared/ErrorBanner'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import type { Submission } from '../../types'

interface AssignmentData {
  assignments: Array<{ child_id: string; child_name: string; assigned_shift: string; assignment_reason: string }>
  oversubscribed: boolean
  oversubscribed_shift?: string
  algorithm_log: Array<{ child_id: string; child_name: string; preference: string; assigned: string; reason: string; bump_debt_before?: number }>
}

export function AssignmentResults() {
  const adminSession = useAppStore(s => s.adminSession)
  const [results, setResults]       = useState<AssignmentData | null>(null)
  const [isRunning, setIsRunning]   = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showForce, setShowForce]   = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [overrideChild, setOverrideChild] = useState<string | null>(null)

  const runAlgorithm = async (force = false) => {
    if (!adminSession) return
    setIsRunning(true)
    setError(null)
    try {
      const res = await adminRunAssignment(adminSession.admin_token, undefined, force) as AssignmentData
      setResults(res)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'שגיאה'
      if (msg.includes('force')) {
        setShowForce(true)
      } else {
        setError(msg)
      }
    } finally {
      setIsRunning(false)
      setShowConfirm(false)
    }
  }

  const handleOverride = async (childId: string, newShift: string) => {
    if (!adminSession) return
    try {
      await adminOverrideAssignment(adminSession.admin_token, new Date().toISOString().slice(0, 10), childId, newShift)
      setResults(prev => prev ? {
        ...prev,
        assignments: prev.assignments.map(a => a.child_id === childId ? { ...a, assigned_shift: newShift, assignment_reason: 'forced' } : a)
      } : prev)
      setOverrideChild(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה')
    }
  }

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Run button */}
      {!results && (
        <div className="card text-center py-8">
          <div className="text-5xl mb-3">⚙️</div>
          <h3 className="font-bold text-gray-800 text-lg mb-2">הרץ מנגנון שיבוץ</h3>
          <p className="text-gray-500 text-sm mb-6">יחלק ילדים למשמרות לפי העדפות ועקרון ההוגנות</p>
          <button onClick={() => setShowConfirm(true)} disabled={isRunning}
            className="btn-primary px-8 py-4 text-lg mx-auto">
            {isRunning ? <LoadingSpinner size="sm" className="mx-auto" /> : '▶️ הרץ שיבוץ'}
          </button>
        </div>
      )}

      {/* Results */}
      {results && (
        <>
          <div className={`card ${results.oversubscribed ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{results.oversubscribed ? '⚡' : '✅'}</span>
              <div>
                <p className="font-bold text-gray-800">
                  {results.oversubscribed ? 'ביקוש יתר – חלוקה לפי רוטציה' : 'חלוקה לפי העדפות'}
                </p>
                {results.oversubscribed && results.oversubscribed_shift && (
                  <p className="text-amber-700 text-xs">משמרת {results.oversubscribed_shift === 'shift1' ? 'בוקר' : 'צהריים'} עמוסה</p>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-blue-700">{results.assignments.filter(a => a.assigned_shift === 'shift1').length}</span> בוקר &nbsp;·&nbsp;
              <span className="font-semibold text-green-700">{results.assignments.filter(a => a.assigned_shift === 'shift2').length}</span> צהריים &nbsp;·&nbsp;
              <span className="text-gray-500">{results.assignments.filter(a => a.assigned_shift === 'absent').length}</span> לא מגיעים
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setShowConfirm(true)} className="text-xs text-gray-500 hover:text-gray-700 underline">הרץ שנית</button>
              <h3 className="font-bold text-gray-800">שיבוצים</h3>
            </div>
            <div className="space-y-2">
              {results.assignments.map(a => (
                <div key={a.child_id} className={`flex items-center justify-between p-3 rounded-xl border ${
                  a.assigned_shift === 'absent' ? 'bg-gray-50 border-gray-200' :
                  a.assigned_shift === 'shift1' ? 'bg-blue-50 border-blue-100' : 'bg-green-50 border-green-100'
                }`}>
                  <button onClick={() => setOverrideChild(a.child_id)} className="text-xs text-gray-400 hover:text-gray-600 underline">שנה</button>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{a.child_name}</p>
                    <p className="text-xs text-gray-500">
                      {a.assigned_shift === 'absent' ? 'לא מגיע/ה' : a.assigned_shift === 'shift1' ? 'בוקר' : 'צהריים'}
                      {a.assignment_reason === 'bumped' && ' · הועבר/ה מהעדפה'}
                      {a.assignment_reason === 'forced' && ' · ידני'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {showConfirm && (
        <ConfirmModal
          title="הרצת מנגנון שיבוץ"
          message="המנגנון יחלק את הילדים למשמרות. ניתן להריץ שוב אם יש שינויים."
          confirmLabel="הרץ"
          onConfirm={() => runAlgorithm(false)}
          onCancel={() => setShowConfirm(false)}
          isLoading={isRunning}
        />
      )}

      {showForce && (
        <ConfirmModal
          title="שיבוץ כבר בוצע"
          message="השיבוץ כבר רץ היום. האם לבצע שיבוץ מחדש? (יבטל את הרוטציה הקודמת)"
          confirmLabel="הרץ שוב"
          onConfirm={() => { setShowForce(false); runAlgorithm(true) }}
          onCancel={() => setShowForce(false)}
          danger
        />
      )}

      {overrideChild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs text-right">
            <h3 className="font-bold text-lg mb-4">שנה שיבוץ</h3>
            <div className="space-y-2">
              {['shift1', 'shift2', 'absent'].map(s => (
                <button key={s} onClick={() => handleOverride(overrideChild, s)}
                  className="w-full py-3 rounded-xl border text-right px-4 hover:bg-gray-50 font-medium">
                  {s === 'shift1' ? '🌅 בוקר' : s === 'shift2' ? '🌞 צהריים' : '😴 לא מגיע/ה'}
                </button>
              ))}
            </div>
            <button onClick={() => setOverrideChild(null)} className="btn-ghost w-full mt-3 text-gray-500">ביטול</button>
          </div>
        </div>
      )}
    </div>
  )
}
