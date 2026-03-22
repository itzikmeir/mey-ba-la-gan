import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { parentGetDayInfo, parentGetResults } from '../api/gasClient'
import { AppShell } from '../components/layout/AppShell'
import { TomorrowCard } from '../components/parent/TomorrowCard'
import { CountdownTimer } from '../components/parent/CountdownTimer'
import { PreferenceForm } from '../components/parent/PreferenceForm'
import { ResultsView } from '../components/parent/ResultsView'
import { PageLoader } from '../components/shared/LoadingSpinner'
import { ErrorBanner } from '../components/shared/ErrorBanner'
import type { DayInfoResponse } from '../types'

interface AssignmentResult {
  assignments: Array<{
    child_id: string
    child_name: string
    assigned_shift: string
    shift_details: import('../types').ShiftInfo | null
    assignment_reason: string
  }>
}

export default function ParentPage() {
  const navigate  = useNavigate()
  const session   = useAppStore(s => s.session)

  const [dayInfo, setDayInfo]       = useState<DayInfoResponse | null>(null)
  const [results, setResults]       = useState<AssignmentResult | null>(null)
  const [isLoading, setIsLoading]   = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [submitted, setSubmitted]   = useState(false)

  // Redirect if no session
  useEffect(() => {
    if (!session) navigate('/')
  }, [session, navigate])

  const fetchDayInfo = async () => {
    if (!session) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await parentGetDayInfo(session.session_token) as DayInfoResponse
      setDayInfo(data)

      if (data.status === 'assigned') {
        const res = await parentGetResults(session.session_token) as AssignmentResult
        setResults(res)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת הנתונים')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDayInfo()
  }, [session]) // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh after submission
  const handleSubmitSuccess = () => {
    setSubmitted(true)
    fetchDayInfo()
  }

  if (!session) return null
  if (isLoading) return <PageLoader />

  return (
    <AppShell>
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} className="mb-4" />}

      {/* No config yet */}
      {!dayInfo || dayInfo.status === 'draft' ? (
        <div className="card text-center py-10">
          <div className="text-5xl mb-3">⏳</div>
          <h2 className="font-bold text-gray-700 text-lg mb-2">הפרטים עדיין לא הוזנו</h2>
          <p className="text-gray-500 text-sm">צוות הגן יעדכן את פרטי יום מחר בקרוב</p>
        </div>
      ) : (
        <>
          {/* Tomorrow's info */}
          <TomorrowCard dayInfo={dayInfo} />

          {/* Status: assigned → show results */}
          {dayInfo.status === 'assigned' && results ? (
            <ResultsView assignments={results.assignments} date={dayInfo.date} />
          ) : (
            <>
              {/* Countdown */}
              <div className="mb-4">
                <CountdownTimer deadline={dayInfo.deadline} />
              </div>

              {/* Submitted success banner */}
              {submitted && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-center">
                  <p className="text-green-700 font-semibold text-sm">✅ ההעדפות נשלחו בהצלחה!</p>
                  <p className="text-green-600 text-xs mt-1">ניתן לשנות עד תום מועד ההרשמה</p>
                </div>
              )}

              {/* Registration closed */}
              {dayInfo.status === 'closed' ? (
                <div className="card text-center py-8">
                  <div className="text-4xl mb-2">🔒</div>
                  <p className="font-bold text-gray-700">ההרשמה הסתיימה</p>
                  <p className="text-gray-500 text-sm mt-1">השיבוצים יתפרסמו בקרוב</p>
                </div>
              ) : (
                /* Preference form */
                <PreferenceForm
                  children={session.children}
                  dayInfo={dayInfo}
                  isSpecial={session.is_special_today}
                  existingSubmissions={dayInfo.existing_submissions || []}
                  onSuccess={handleSubmitSuccess}
                />
              )}
            </>
          )}
        </>
      )}
    </AppShell>
  )
}
