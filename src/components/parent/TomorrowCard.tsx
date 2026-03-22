import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import type { DayInfoResponse } from '../../types'

interface Props {
  dayInfo: DayInfoResponse
}

export function TomorrowCard({ dayInfo }: Props) {
  const dateObj = dayInfo.date ? new Date(dayInfo.date + 'T12:00:00') : new Date()
  const hebrewDate = format(dateObj, 'EEEE, d בMMMM yyyy', { locale: he })

  return (
    <div className="card mb-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🏫</span>
        <div>
          <h2 className="font-bold text-gray-800 text-lg">פרטי הגן מחר</h2>
          <p className="text-gray-500 text-sm">{hebrewDate}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Shift 1 */}
        {dayInfo.shift1 && (
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
            <div className="flex items-center gap-1 mb-2">
              <span className="text-blue-600 font-bold text-sm">{dayInfo.shift1.name || 'משמרת בוקר'}</span>
            </div>
            <p className="text-blue-800 font-semibold text-base">
              {dayInfo.shift1.arrival} – {dayInfo.shift1.end}
            </p>
            {dayInfo.shift1.teachers && (
              <div className="mt-2">
                <p className="text-blue-600 text-xs">גננות:</p>
                <p className="text-blue-800 text-xs font-medium">{dayInfo.shift1.teachers}</p>
              </div>
            )}
          </div>
        )}

        {/* Shift 2 */}
        {dayInfo.shift2 && (
          <div className="bg-green-50 rounded-xl p-3 border border-green-100">
            <div className="flex items-center gap-1 mb-2">
              <span className="text-green-600 font-bold text-sm">{dayInfo.shift2.name || 'משמרת צהריים'}</span>
            </div>
            <p className="text-green-800 font-semibold text-base">
              {dayInfo.shift2.arrival} – {dayInfo.shift2.end}
            </p>
            {dayInfo.shift2.teachers && (
              <div className="mt-2">
                <p className="text-green-600 text-xs">גננות:</p>
                <p className="text-green-800 text-xs font-medium">{dayInfo.shift2.teachers}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
