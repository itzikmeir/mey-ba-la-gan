import { useState } from 'react'
import type { ShiftInfo } from '../../types'
import { SwapRequestForm } from './SwapRequestForm'

interface Assignment {
  child_id: string
  child_name: string
  assigned_shift: string
  shift_details: ShiftInfo | null
  assignment_reason: string
}

interface Props {
  assignments: Assignment[]
  date: string
}

export function ResultsView({ assignments, date }: Props) {
  const [swapChild, setSwapChild] = useState<Assignment | null>(null)
  const [explanation, setExplanation] = useState(false)

  if (assignments.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-gray-500">אין שיבוצים להצגה</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="font-bold text-gray-800 text-lg mb-4">📋 שיבוצים ל-{date}</h2>
        <div className="space-y-3">
          {assignments.map(a => (
            <AssignmentCard
              key={a.child_id}
              assignment={a}
              onRequestSwap={() => setSwapChild(a)}
            />
          ))}
        </div>
      </div>

      {/* System explanation */}
      <div className="card">
        <button
          onClick={() => setExplanation(!explanation)}
          className="w-full flex items-center justify-between text-right"
        >
          <span className="text-sm font-semibold text-gray-700">❓ איך פועל המנגנון?</span>
          <span className="text-gray-400">{explanation ? '▲' : '▼'}</span>
        </button>
        {explanation && (
          <div className="mt-3 text-sm text-gray-600 space-y-2">
            <p>• ההורים מגישים העדפת משמרת עד המועד הקבוע.</p>
            <p>• אם הביקוש מאוזן – כולם מקבלים את המשמרת שביקשו.</p>
            <p>• אם משמרת אחת עמוסה מדי – חלק מהילדים מועברים למשמרת השנייה.</p>
            <p>• <strong>מנגנון ההוגנות:</strong> ילדים שהועברו בעבר נגד העדפתם מקבלים עדיפות להישאר במשמרת המועדפת בפעמים הבאות.</p>
            <p>• לאורך זמן, כל ילד יקבל את משמרתו המועדפת פחות או יותר באותה תדירות.</p>
          </div>
        )}
      </div>

      {/* Swap request modal */}
      {swapChild && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-6">
            <SwapRequestForm
              childId={swapChild.child_id}
              childName={swapChild.child_name}
              currentShift={swapChild.assigned_shift}
              date={date}
              onClose={() => setSwapChild(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function AssignmentCard({ assignment: a, onRequestSwap }: { assignment: Assignment; onRequestSwap: () => void }) {
  const isAbsent  = a.assigned_shift === 'absent'
  const isShift1  = a.assigned_shift === 'shift1'
  const wasBumped = a.assignment_reason === 'bumped'

  if (isAbsent) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
        <span className="text-2xl">😴</span>
        <div>
          <p className="font-semibold text-gray-700">{a.child_name}</p>
          <p className="text-xs text-gray-500">לא מגיע/ה מחר</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-3 rounded-xl border ${isShift1 ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
      <div className="flex items-center justify-between">
        <button
          onClick={onRequestSwap}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          בקש החלפה
        </button>
        <div className="text-right">
          <p className={`font-semibold text-base ${isShift1 ? 'text-blue-800' : 'text-green-800'}`}>
            {a.child_name}
          </p>
          <p className={`text-sm font-medium ${isShift1 ? 'text-blue-700' : 'text-green-700'}`}>
            {a.shift_details?.name || (isShift1 ? 'משמרת בוקר' : 'משמרת צהריים')}
            {a.shift_details && ` · ${a.shift_details.arrival}–${a.shift_details.end}`}
          </p>
          {wasBumped && (
            <p className="text-xs text-amber-600 mt-0.5">⚡ הועבר/ה מהעדפה ראשונה – צבר/ה עדיפות לפעם הבאה</p>
          )}
        </div>
      </div>
    </div>
  )
}
