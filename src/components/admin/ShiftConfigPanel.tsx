import { useState, useEffect } from 'react'
import { adminGetDayConfig, adminSetDayConfig, adminGenerateSpecialCode } from '../../api/gasClient'
import { useAppStore } from '../../store/useAppStore'
import { ErrorBanner } from '../shared/ErrorBanner'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import type { DailyConfig, ShiftInfo } from '../../types'

function calcEnd(arrival: string, durationMin: number): string {
  if (!arrival || !durationMin) return ''
  const [h, m] = arrival.split(':').map(Number)
  const total = h * 60 + m + durationMin
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function ShiftConfigPanel() {
  const adminSession = useAppStore(s => s.adminSession)
  const [config, setConfig] = useState<Partial<DailyConfig>>({})
  const [isLoading, setIsLoading]   = useState(true)
  const [isSaving, setIsSaving]     = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [saved, setSaved]           = useState(false)
  const [specialCode, setSpecialCode]   = useState('')
  const [specialPhones, setSpecialPhones] = useState('')
  const [generatingCode, setGeneratingCode] = useState(false)

  const load = async () => {
    if (!adminSession) return
    setIsLoading(true)
    try {
      const res = await adminGetDayConfig(adminSession.admin_token) as { config: DailyConfig }
      setConfig(res.config)
      setSpecialPhones((res.config.special_phone_list || []).join('\n'))
      setSpecialCode(res.config.special_parent_code || '')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינה')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [adminSession]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateShift = (shift: 'shift1' | 'shift2', field: keyof ShiftInfo, value: string) => {
    setConfig(prev => ({
      ...prev,
      [shift]: { ...(prev[shift] as ShiftInfo || {}), [field]: value },
    }))
  }

  const updateDuration = (val: number) => {
    setConfig(prev => ({
      ...prev,
      shift_duration_min: val,
      shift1: { ...(prev.shift1 as ShiftInfo), end: calcEnd((prev.shift1 as ShiftInfo)?.arrival || '', val) },
      shift2: { ...(prev.shift2 as ShiftInfo), end: calcEnd((prev.shift2 as ShiftInfo)?.arrival || '', val) },
    }))
  }

  const handleSave = async () => {
    if (!adminSession) return
    setIsSaving(true)
    setError(null)
    try {
      await adminSetDayConfig(adminSession.admin_token, {
        ...config,
        status: config.status === 'draft' ? 'open' : config.status,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בשמירה')
    } finally {
      setIsSaving(false)
    }
  }

  const handleGenerateCode = async () => {
    if (!adminSession || !config.date) return
    setGeneratingCode(true)
    try {
      const phones = specialPhones.split('\n').map(p => p.trim()).filter(Boolean)
      const res = await adminGenerateSpecialCode(adminSession.admin_token, config.date, phones) as { code: string }
      setSpecialCode(res.code)
      setConfig(prev => ({ ...prev, special_parent_code: res.code, special_phone_list: phones }))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה')
    } finally {
      setGeneratingCode(false)
    }
  }

  if (isLoading) return <div className="flex justify-center py-8"><LoadingSpinner /></div>

  const shift1 = config.shift1 as ShiftInfo || {}
  const shift2 = config.shift2 as ShiftInfo || {}

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center text-green-700 font-semibold text-sm">
          ✅ נשמר בהצלחה
        </div>
      )}

      {/* Date & Deadline */}
      <div className="card space-y-3">
        <h3 className="font-bold text-gray-800">📅 תאריך ומועד</h3>
        <div>
          <label className="text-sm text-gray-600 mb-1 block">תאריך</label>
          <input type="date" value={config.date || ''} onChange={e => setConfig(p => ({ ...p, date: e.target.value }))}
            className="input-field" />
        </div>
        <div>
          <label className="text-sm text-gray-600 mb-1 block">מועד סגירת הרשמה</label>
          <input type="datetime-local" value={config.deadline || ''} onChange={e => setConfig(p => ({ ...p, deadline: e.target.value }))}
            className="input-field" />
        </div>
        <div>
          <label className="text-sm text-gray-600 mb-1 block">משך משמרת (דקות)</label>
          <input type="number" value={config.shift_duration_min || 90} onChange={e => updateDuration(Number(e.target.value))}
            className="input-field" min={30} max={300} />
        </div>
      </div>

      {/* Shift 1 */}
      <div className="card space-y-3 border-l-4 border-blue-400">
        <h3 className="font-bold text-blue-700">🌅 משמרת בוקר</h3>
        <div><label className="text-sm text-gray-600 mb-1 block">שם המשמרת</label>
          <input value={shift1.name || ''} onChange={e => updateShift('shift1', 'name', e.target.value)} className="input-field" placeholder="משמרת בוקר" /></div>
        <div><label className="text-sm text-gray-600 mb-1 block">שעת הגעה</label>
          <input type="time" value={shift1.arrival || ''} onChange={e => {
            const v = e.target.value
            updateShift('shift1', 'arrival', v)
            setConfig(p => ({ ...p, shift1: { ...(p.shift1 as ShiftInfo || {}), arrival: v, end: calcEnd(v, p.shift_duration_min || 90) } }))
          }} className="input-field" /></div>
        <div><label className="text-sm text-gray-600 mb-1 block">שעת סיום (מחושב)</label>
          <input value={shift1.end || ''} readOnly className="input-field bg-gray-50 text-gray-500 cursor-not-allowed" /></div>
        <div><label className="text-sm text-gray-600 mb-1 block">גננות</label>
          <input value={shift1.teachers || ''} onChange={e => updateShift('shift1', 'teachers', e.target.value)} className="input-field" placeholder="שם גננת, שם עוזרת..." /></div>
      </div>

      {/* Shift 2 */}
      <div className="card space-y-3 border-l-4 border-green-400">
        <h3 className="font-bold text-green-700">🌞 משמרת צהריים</h3>
        <div><label className="text-sm text-gray-600 mb-1 block">שם המשמרת</label>
          <input value={shift2.name || ''} onChange={e => updateShift('shift2', 'name', e.target.value)} className="input-field" placeholder="משמרת צהריים" /></div>
        <div><label className="text-sm text-gray-600 mb-1 block">שעת הגעה</label>
          <input type="time" value={shift2.arrival || ''} onChange={e => {
            const v = e.target.value
            setConfig(p => ({ ...p, shift2: { ...(p.shift2 as ShiftInfo || {}), arrival: v, end: calcEnd(v, p.shift_duration_min || 90) } }))
          }} className="input-field" /></div>
        <div><label className="text-sm text-gray-600 mb-1 block">שעת סיום (מחושב)</label>
          <input value={shift2.end || ''} readOnly className="input-field bg-gray-50 text-gray-500 cursor-not-allowed" /></div>
        <div><label className="text-sm text-gray-600 mb-1 block">גננות</label>
          <input value={shift2.teachers || ''} onChange={e => updateShift('shift2', 'teachers', e.target.value)} className="input-field" placeholder="שם גננת, שם עוזרת..." /></div>
      </div>

      {/* Special parents */}
      <div className="card space-y-3 border-l-4 border-purple-400">
        <h3 className="font-bold text-purple-700">✨ הורים מיוחדים (2 משמרות)</h3>
        <div>
          <label className="text-sm text-gray-600 mb-1 block">מספרי טלפון (שורה אחת לכל מספר)</label>
          <textarea value={specialPhones} onChange={e => setSpecialPhones(e.target.value)}
            className="input-field h-24 resize-none" placeholder="0521234567&#10;0531234567" />
        </div>
        <button onClick={handleGenerateCode} disabled={generatingCode}
          className="w-full py-3 rounded-xl font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50">
          {generatingCode ? 'מייצר...' : '🎲 צור קוד יומי'}
        </button>
        {specialCode && (
          <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-200">
            <p className="text-purple-600 text-sm mb-1">קוד יומי לשליחה להורים המיוחדים:</p>
            <p className="text-4xl font-bold tracking-widest text-purple-800 font-mono">{specialCode}</p>
            <p className="text-purple-500 text-xs mt-2">תקף ליום זה בלבד</p>
          </div>
        )}
      </div>

      <button onClick={handleSave} disabled={isSaving}
        className="btn-primary w-full py-4 text-lg">
        {isSaving ? 'שומר...' : '💾 שמור הגדרות'}
      </button>
    </div>
  )
}
