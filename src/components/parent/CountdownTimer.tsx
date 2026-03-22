import { useCountdown } from '../../hooks/useCountdown'

interface Props {
  deadline: string | null | undefined
}

export function CountdownTimer({ deadline }: Props) {
  const { hours, minutes, seconds, isExpired, totalSeconds } = useCountdown(deadline)

  if (!deadline) return null

  const isUrgent = totalSeconds < 60 * 30 // less than 30 min

  if (isExpired) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
        <p className="text-red-600 font-bold text-sm">⏰ מועד ההרשמה הסתיים</p>
        <p className="text-red-500 text-xs mt-1">השיבוצים עוד יעובדו</p>
      </div>
    )
  }

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className={`rounded-xl p-4 text-center border ${
      isUrgent
        ? 'bg-red-50 border-red-200 animate-pulse-slow'
        : 'bg-amber-50 border-amber-200'
    }`}>
      <p className={`text-xs font-medium mb-2 ${isUrgent ? 'text-red-600' : 'text-amber-700'}`}>
        ⏳ זמן שנותר להרשמה
      </p>
      <div className="flex items-center justify-center gap-1 font-mono">
        {hours > 0 && (
          <>
            <TimeBlock value={pad(hours)} label="שע'" urgent={isUrgent} />
            <span className={`text-2xl font-bold ${isUrgent ? 'text-red-600' : 'text-amber-700'}`}>:</span>
          </>
        )}
        <TimeBlock value={pad(minutes)} label="דק'" urgent={isUrgent} />
        <span className={`text-2xl font-bold ${isUrgent ? 'text-red-600' : 'text-amber-700'}`}>:</span>
        <TimeBlock value={pad(seconds)} label="שנ'" urgent={isUrgent} />
      </div>
    </div>
  )
}

function TimeBlock({ value, label, urgent }: { value: string; label: string; urgent: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`text-3xl font-bold ${urgent ? 'text-red-700' : 'text-amber-800'}`}>{value}</span>
      <span className={`text-xs ${urgent ? 'text-red-500' : 'text-amber-600'}`}>{label}</span>
    </div>
  )
}
