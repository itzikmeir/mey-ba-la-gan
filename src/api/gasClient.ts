import { GAS_URL } from '../config/constants'
import type { ApiResponse } from '../types'

// ── Core fetch wrapper ────────────────────────────────────
async function gasPost<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const payload = { action, ...body }

  let response: Response
  try {
    response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }, // avoid CORS preflight
      body: JSON.stringify(payload),
    })
  } catch (err) {
    throw new Error('שגיאת רשת – אנא בדוק חיבור לאינטרנט')
  }

  if (!response.ok) {
    throw new Error(`שגיאת שרת (${response.status})`)
  }

  let data: ApiResponse<T>
  try {
    data = await response.json()
  } catch {
    throw new Error('תגובה לא תקינה מהשרת')
  }

  if (!data.success) {
    const msg = data.error || 'שגיאה לא ידועה'
    const err = new Error(msg) as Error & { code?: string }
    err.code = data.code
    throw err
  }

  return data.data as T
}

// ── Auth ──────────────────────────────────────────────────
export const authLogin = (phone: string) =>
  gasPost('auth.login', { phone })

export const authValidate = (session_token: string) =>
  gasPost('auth.validate', { session_token })

export const adminLogin = (password: string) =>
  gasPost('admin.login', { password })

// ── Parent ────────────────────────────────────────────────
export const parentGetDayInfo = (session_token: string) =>
  gasPost('parent.getDayInfo', { session_token })

export const parentSubmitPreference = (session_token: string, submissions: unknown[]) =>
  gasPost('parent.submitPreference', { session_token, submissions })

export const parentSetAbsent = (session_token: string, child_ids: string[]) =>
  gasPost('parent.setAbsent', { session_token, child_ids })

export const parentGetResults = (session_token: string) =>
  gasPost('parent.getResults', { session_token })

export const parentSubmitSwapRequest = (
  session_token: string,
  child_id: string,
  child_name: string,
  current_shift: string,
  requested_shift: string,
  reason: string
) => gasPost('parent.submitSwapRequest', { session_token, child_id, child_name, current_shift, requested_shift, reason })

// ── Admin ─────────────────────────────────────────────────
export const adminGetDayConfig = (admin_token: string, date?: string) =>
  gasPost('admin.getDayConfig', { admin_token, date })

export const adminSetDayConfig = (admin_token: string, config: unknown) =>
  gasPost('admin.setDayConfig', { admin_token, config })

export const adminGenerateSpecialCode = (admin_token: string, date: string, phone_list: string[]) =>
  gasPost('admin.generateSpecialCode', { admin_token, date, phone_list })

export const adminGetSubmissions = (admin_token: string, date?: string) =>
  gasPost('admin.getSubmissions', { admin_token, date })

export const adminRunAssignment = (admin_token: string, date?: string, force = false) =>
  gasPost('admin.runAssignment', { admin_token, date, force })

export const adminOverrideAssignment = (admin_token: string, date: string, child_id: string, new_shift: string) =>
  gasPost('admin.overrideAssignment', { admin_token, date, child_id, new_shift })

export const adminGetSwapRequests = (admin_token: string, date?: string) =>
  gasPost('admin.getSwapRequests', { admin_token, date })

export const adminResolveSwap = (admin_token: string, request_id: string, decision: 'approved' | 'rejected', note?: string) =>
  gasPost('admin.resolveSwap', { admin_token, request_id, decision, note })

export const adminGetParents = (admin_token: string) =>
  gasPost('admin.getParents', { admin_token })

export const adminSaveParent = (admin_token: string, parent: unknown) =>
  gasPost('admin.saveParent', { admin_token, parent })

export const adminDeleteParent = (admin_token: string, phone: string) =>
  gasPost('admin.deleteParent', { admin_token, phone })

export const adminSendReminders = (admin_token: string, date?: string, phones?: string[]) =>
  gasPost('admin.sendReminders', { admin_token, date, phones })

export const adminGetHistory = (admin_token: string, from_date?: string, to_date?: string) =>
  gasPost('admin.getHistory', { admin_token, from_date, to_date })

export const adminGetRotationStats = (admin_token: string) =>
  gasPost('admin.getRotationStats', { admin_token })
