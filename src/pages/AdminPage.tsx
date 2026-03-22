import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { AppShell } from '../components/layout/AppShell'
import { ShiftConfigPanel } from '../components/admin/ShiftConfigPanel'
import { SubmissionDashboard } from '../components/admin/SubmissionDashboard'
import { AssignmentResults } from '../components/admin/AssignmentResults'
import { SwapApprovalList } from '../components/admin/SwapApprovalList'
import { ParentManagement } from '../components/admin/ParentManagement'

type Tab = 'config' | 'submissions' | 'assignments' | 'swaps' | 'parents'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'config',      label: 'הגדרות',  icon: '⚙️' },
  { id: 'submissions', label: 'הגשות',   icon: '📝' },
  { id: 'assignments', label: 'שיבוץ',   icon: '📋' },
  { id: 'swaps',       label: 'החלפות',  icon: '🔄' },
  { id: 'parents',     label: 'הורים',   icon: '👨‍👩‍👧' },
]

export default function AdminPage() {
  const navigate     = useNavigate()
  const adminSession = useAppStore(s => s.adminSession)
  const [tab, setTab] = useState<Tab>('config')

  useEffect(() => {
    if (!adminSession) navigate('/admin/login')
  }, [adminSession, navigate])

  if (!adminSession) return null

  return (
    <AppShell isAdmin>
      {/* Tab bar */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1 -mx-4 px-4">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
              tab === t.id
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span className="text-base">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'config'      && <ShiftConfigPanel />}
      {tab === 'submissions' && <SubmissionDashboard />}
      {tab === 'assignments' && <AssignmentResults />}
      {tab === 'swaps'       && <SwapApprovalList />}
      {tab === 'parents'     && <ParentManagement />}
    </AppShell>
  )
}
