import { useState, useEffect } from 'react'

interface CountdownResult {
  days: number
  hours: number
  minutes: number
  seconds: number
  isExpired: boolean
  totalSeconds: number
}

export function useCountdown(targetIso: string | null | undefined): CountdownResult {
  const [remaining, setRemaining] = useState<number>(0)

  useEffect(() => {
    if (!targetIso) {
      setRemaining(0)
      return
    }

    const target = new Date(targetIso).getTime()

    const calc = () => {
      const diff = Math.max(0, Math.floor((target - Date.now()) / 1000))
      setRemaining(diff)
    }

    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [targetIso])

  const days    = Math.floor(remaining / 86400)
  const hours   = Math.floor((remaining % 86400) / 3600)
  const minutes = Math.floor((remaining % 3600) / 60)
  const seconds = remaining % 60

  return { days, hours, minutes, seconds, isExpired: remaining === 0, totalSeconds: remaining }
}
