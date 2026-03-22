import { useState, useEffect } from 'react'
import { adminGetParents, adminSaveParent, adminDeleteParent } from '../../api/gasClient'
import { useAppStore } from '../../store/useAppStore'
import { ErrorBanner } from '../shared/ErrorBanner'
import { LoadingSpinner } from '../shared/LoadingSpinner'
import { ConfirmModal } from '../shared/ConfirmModal'
import { normalizePhone, formatPhone, isValidIsraeliPhone } from '../../utils/phoneNormalizer'
import type { Parent, Child } from '../../types'

export function ParentManagement() {
  const adminSession = useAppStore(s => s.adminSession)
  const [parents, setParents]   = useState<Parent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [editParent, setEditParent] = useState<Partial<Parent> | null>(null)
  const [deletePhone, setDeletePhone] = useState<string | null>(null)
  const [search, setSearch]     = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const load = async () => {
    if (!adminSession) return
    setIsLoading(true)
    try {
      const res = await adminGetParents(adminSession.admin_token) as { parents: Parent[] }
      setParents(res.parents)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [adminSession]) // eslint-disable-line

  const handleSave = async () => {
    if (!adminSession || !editParent) return
    if (!editParent.phone || !isValidIsraeliPhone(editParent.phone)) {
      setError('מספר טלפון לא תקין')
      return
    }
    setIsSaving(true)
    try {
      await adminSaveParent(adminSession.admin_token, { ...editParent, phone: normalizePhone(editParent.phone!) })
      await load()
      setEditParent(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!adminSession || !deletePhone) return
    try {
      await adminDeleteParent(adminSession.admin_token, deletePhone)
      setParents(prev => prev.filter(p => p.phone !== deletePhone))
      setDeletePhone(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה')
    }
  }

  const filtered = parents.filter(p =>
    p.active && (
      p.display_name.includes(search) ||
      p.phone.includes(search) ||
      (p.children as Child[]).some(c => c.name.includes(search))
    )
  )

  if (isLoading) return <div className="flex justify-center py-8"><LoadingSpinner /></div>

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Search + Add */}
      <div className="flex gap-2">
        <button onClick={() => setEditParent({ active: true, children: [] })}
          className="btn-primary px-4 whitespace-nowrap">+ הוסף</button>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="חפש שם / טלפון / ילד"
          className="input-field flex-1" />
      </div>

      <div className="text-sm text-gray-500 text-right">{filtered.length} מתוך {parents.filter(p => p.active).length} הורים פעילים</div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map(p => (
          <div key={p.phone} className="card flex items-center justify-between">
            <div className="flex gap-2">
              <button onClick={() => setDeletePhone(p.phone)}
                className="text-red-400 hover:text-red-600 text-sm px-2 py-1 rounded">🗑</button>
              <button onClick={() => setEditParent({ ...p })}
                className="text-primary-600 hover:text-primary-800 text-sm px-2 py-1 rounded">עריכה</button>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-800">{p.display_name}</p>
              <p className="text-gray-500 text-sm">{formatPhone(p.phone)}</p>
              <p className="text-gray-400 text-xs">{(p.children as Child[]).map(c => c.name).join(' · ')}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Edit modal */}
      {editParent && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-6 space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg text-right">{editParent.phone ? 'עריכת הורה' : 'הורה חדש'}</h3>
            {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

            <div><label className="text-sm text-gray-600 mb-1 block text-right">מספר טלפון</label>
              <input value={editParent.phone || ''} onChange={e => setEditParent(p => ({ ...p, phone: e.target.value }))}
                className="input-field" placeholder="0521234567" dir="ltr" /></div>

            <div><label className="text-sm text-gray-600 mb-1 block text-right">שם משפחה לתצוגה</label>
              <input value={editParent.display_name || ''} onChange={e => setEditParent(p => ({ ...p, display_name: e.target.value }))}
                className="input-field" placeholder="משפחת כהן" /></div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block text-right">ילדים</label>
              {(editParent.children as Child[] || []).map((c, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <button onClick={() => setEditParent(p => ({ ...p, children: (p.children as Child[]).filter((_, j) => j !== i) }))}
                    className="text-red-400 hover:text-red-600 px-2">×</button>
                  <input value={c.name} onChange={e => setEditParent(p => ({
                    ...p,
                    children: (p.children as Child[]).map((ch, j) => j === i ? { ...ch, name: e.target.value } : ch)
                  }))} className="input-field flex-1" placeholder="שם ילד/ה" />
                </div>
              ))}
              <button onClick={() => setEditParent(p => ({ ...p, children: [...(p.children as Child[] || []), { id: crypto.randomUUID(), name: '' }] }))}
                className="text-primary-600 text-sm underline">+ הוסף ילד</button>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditParent(null)} className="flex-1 py-3 rounded-xl bg-gray-100 font-semibold text-gray-700">ביטול</button>
              <button onClick={handleSave} disabled={isSaving} className="flex-1 btn-primary">{isSaving ? 'שומר...' : 'שמור'}</button>
            </div>
          </div>
        </div>
      )}

      {deletePhone && (
        <ConfirmModal
          title="מחיקת הורה"
          message={`האם למחוק את ההורה עם טלפון ${formatPhone(deletePhone)}?`}
          confirmLabel="מחק"
          onConfirm={handleDelete}
          onCancel={() => setDeletePhone(null)}
          danger
        />
      )}
    </div>
  )
}
