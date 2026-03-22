import { useState, useEffect } from 'react'
import { adminGetSubmissions, adminSendReminders } from '../../api/gasClient'
import { useAppStore } from '../../store/useAppStore'
import { ErrorBanner } from '../shared/ErrorBanner'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { buildWaLink } from '../../utils/phoneNormalizer'
import type { Submission } from '../../types'

interface NotSubmitted {
  family_id: string
  display_name: string
  phone: string
  children: Array<{ id: string; name: string }>
}

interface SubmissionsData {
  submissions: Submission[]
  not_submitted: NotSubmitted[]
  absent_count: number
  total_children: number
}

export function SubmissionDashboard() {
  const adminSession = useAppStore(s => s.adminSession)
  const [data, setData]         = useState<SubmissionsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [sending, setSending]   = useState(false)

  const load = async () => {
    if (!adminSession) return
    setIsLoading(true)
    try {
      const res = await adminGetSubmissions(adminSession.admin_token) as SubmissionsData
      setData(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [adminSession]) // eslint-disable-line

  const handleSendReminders = async () => {
    if (!adminSession || !data) return
    setSending(true)
    try {
      const res = await adminSendReminders(adminSession.admin_token) as { wa_links: Array<{ phone: string; display_name: string; wa_link: string }> }
      // Open first 3 wa.me links (browser will prompt)
      res.wa_links.slice(0, 3).forEach(({ wa_link }) => window.open(wa_link, '_blank'))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה')
    } finally {
      setSending(false)
    }
  }

  if (isLoading) return <div className="flex justify-center py-8"><LoadingSpinner /></div>
  if (!data) return null

  const submitted = data.submissions.filter(s => s.preference_1 !== '')
  const absent    = data.submissions.filter(s => s.preference_1 === 'absent')
  const active    = submitted.filter(s => s.preference_1 !== 'absent')

  const pref1Count = active.filter(s => s.preference_1 === 'shift1').length
  const pref2Count = active.filter(s => s.preference_1 === 'shift2').length

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Summary bar */}
      <div className="card">
        <h3 className="font-bold text-gray-800 mb-3">📊 סיכום הגשות</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{submitted.length}</p>
            <p className="text-green-600 text-xs">הגישו</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{data.not_submitted.length}</p>
            <p className="text-red-500 text-xs">עדיין לא הגישו</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{pref1Count}</p>
            <p className="text-blue-600 text-xs">בחרו בוקר</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-emerald-700">{pref2Count}</p>
            <p className="text-emerald-600 text-xs">בחרו צהריים</p>
          </div>
        </div>
        {absent.length > 0 && (
          <div className="mt-3 bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-gray-600 text-sm"><strong>{absent.length}</strong> ילדים לא יגיעו</p>
          </div>
        )}
      </div>

      {/* Not submitted */}
      {data.not_submitted.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <button onClick={handleSendReminders} disabled={sending}
              className="text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 px-3 py-2 rounded-lg disabled:opacity-50">
              {sending ? '...' : '📲 שלח תזכורות'}
            </button>
            <h3 className="font-bold text-gray-800">⏳ טרם הגישו</h3>
          </div>
          <div className="space-y-2">
            {data.not_submitted.map(p => (
              <div key={p.family_id} className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-100">
                <a href={buildWaLink(p.phone, `שלום ${p.display_name}, אנא הגש/י העדפת משמרת לגן מחר`)}
                  target="_blank" rel="noreferrer"
                  className="text-green-600 text-xl">📲</a>
                <div className="text-right">
                  <p className="font-semibold text-gray-800 text-sm">{p.display_name}</p>
                  <p className="text-gray-500 text-xs">{p.children.map(c => c.name).join(', ')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submissions list */}
      <div className="card">
        <h3 className="font-bold text-gray-800 mb-3">✅ הגשות</h3>
        <div className="space-y-2">
          {data.submissions.map(s => (
            <div key={s.child_id} className={`flex items-center justify-between p-3 rounded-xl border ${
              s.preference_1 === 'absent'  ? 'bg-gray-50 border-gray-200' :
              s.preference_1 === 'shift1' ? 'bg-blue-50 border-blue-100' :
                                             'bg-green-50 border-green-100'
            }`}>
              <span className="text-sm text-gray-500">
                {s.preference_1 === 'absent' ? '😴' : s.preference_1 === 'shift1' ? '🌅' : '🌞'}
              </span>
              <div className="text-right">
                <p className="font-semibold text-sm text-gray-800">{s.child_name}</p>
                <p className="text-xs text-gray-500">
                  {s.preference_1 === 'absent' ? 'לא מגיע/ה' : s.preference_1 === 'shift1' ? 'בוקר' : 'צהריים'}
                  {s.is_special && ' · מיוחד'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={load} className="btn-ghost w-full text-gray-500">🔄 רענן</button>
    </div>
  )
}
