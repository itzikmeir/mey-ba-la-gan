import { useState, useEffect } from 'react'
import { adminGetSwapRequests, adminResolveSwap } from '../../api/gasClient'
import { useAppStore } from '../../store/useAppStore'
import { ErrorBanner } from '../shared/ErrorBanner'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import type { SwapRequest } from '../../types'

export function SwapApprovalList() {
  const adminSession = useAppStore(s => s.adminSession)
  const [requests, setRequests] = useState<SwapRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [resolving, setResolving] = useState<string | null>(null)

  const load = async () => {
    if (!adminSession) return
    setIsLoading(true)
    try {
      const res = await adminGetSwapRequests(adminSession.admin_token) as { requests: SwapRequest[] }
      setRequests(res.requests)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [adminSession]) // eslint-disable-line

  const resolve = async (requestId: string, decision: 'approved' | 'rejected', note?: string) => {
    if (!adminSession) return
    setResolving(requestId)
    try {
      await adminResolveSwap(adminSession.admin_token, requestId, decision, note)
      setRequests(prev => prev.map(r => r.request_id === requestId ? { ...r, status: decision } : r))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה')
    } finally {
      setResolving(null)
    }
  }

  if (isLoading) return <div className="flex justify-center py-8"><LoadingSpinner /></div>

  const pending = requests.filter(r => r.status === 'pending')
  const resolved = requests.filter(r => r.status !== 'pending')

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {pending.length === 0 && resolved.length === 0 && (
        <div className="card text-center py-8 text-gray-500">אין בקשות החלפה</div>
      )}

      {pending.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-gray-800 mb-3">⏳ בקשות ממתינות ({pending.length})</h3>
          <div className="space-y-3">
            {pending.map(r => (
              <div key={r.request_id} className="border border-amber-200 bg-amber-50 rounded-xl p-4">
                <div className="text-right mb-2">
                  <p className="font-bold text-gray-800">{r.child_name}</p>
                  <p className="text-sm text-gray-600">
                    {r.current_shift === 'shift1' ? 'בוקר' : 'צהריים'} →{' '}
                    {r.requested_shift === 'shift1' ? 'בוקר' : 'צהריים'}
                  </p>
                  {r.reason && <p className="text-xs text-gray-500 mt-1">"{r.reason}"</p>}
                  <p className="text-xs text-gray-400 mt-1">{r.date} · {r.phone}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => resolve(r.request_id, 'rejected')}
                    disabled={resolving === r.request_id}
                    className="flex-1 py-2 rounded-xl bg-red-100 text-red-700 font-semibold text-sm hover:bg-red-200 disabled:opacity-50">
                    ✗ דחה
                  </button>
                  <button onClick={() => resolve(r.request_id, 'approved')}
                    disabled={resolving === r.request_id}
                    className="flex-1 py-2 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 disabled:opacity-50">
                    {resolving === r.request_id ? '...' : '✓ אשר'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {resolved.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-gray-800 mb-3">📋 בקשות שטופלו</h3>
          <div className="space-y-2">
            {resolved.map(r => (
              <div key={r.request_id} className={`p-3 rounded-xl border text-right ${
                r.status === 'approved' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <p className="font-semibold text-sm text-gray-800">{r.child_name}</p>
                <p className="text-xs text-gray-500">{r.status === 'approved' ? '✅ אושרה' : '❌ נדחתה'} · {r.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={load} className="btn-ghost w-full text-gray-500">🔄 רענן</button>
    </div>
  )
}
