import { create } from 'zustand'
import type { AppSession, AdminSession, DayInfoResponse } from '../types'
import { SESSION_KEY, ADMIN_SESSION_KEY } from '../config/constants'

// ── Helpers ───────────────────────────────────────────────
function loadSession(): AppSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s: AppSession = JSON.parse(raw)
    if (new Date(s.expires_at) < new Date()) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return s
  } catch {
    return null
  }
}

function loadAdminSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY)
    if (!raw) return null
    const s: AdminSession = JSON.parse(raw)
    if (new Date(s.expires_at) < new Date()) {
      localStorage.removeItem(ADMIN_SESSION_KEY)
      return null
    }
    return s
  } catch {
    return null
  }
}

function endOfToday(): string {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

// ── Store ─────────────────────────────────────────────────
interface AppStore {
  // Parent auth
  session: AppSession | null
  setSession: (s: AppSession) => void
  clearSession: () => void

  // Admin auth
  adminSession: AdminSession | null
  setAdminSession: (s: AdminSession) => void
  clearAdminSession: () => void

  // Day info cache
  dayInfo: DayInfoResponse | null
  setDayInfo: (d: DayInfoResponse) => void

  // UI
  isLoading: boolean
  setLoading: (v: boolean) => void
  error: string | null
  setError: (e: string | null) => void
}

export const useAppStore = create<AppStore>((set) => ({
  session:      loadSession(),
  adminSession: loadAdminSession(),
  dayInfo:      null,
  isLoading:    false,
  error:        null,

  setSession: (s) => {
    const withExpiry: AppSession = { ...s, expires_at: endOfToday() }
    localStorage.setItem(SESSION_KEY, JSON.stringify(withExpiry))
    set({ session: withExpiry })
  },

  clearSession: () => {
    localStorage.removeItem(SESSION_KEY)
    set({ session: null, dayInfo: null })
  },

  setAdminSession: (s) => {
    const withExpiry: AdminSession = { ...s, expires_at: endOfToday() }
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(withExpiry))
    set({ adminSession: withExpiry })
  },

  clearAdminSession: () => {
    localStorage.removeItem(ADMIN_SESSION_KEY)
    set({ adminSession: null })
  },

  setDayInfo:  (d) => set({ dayInfo: d }),
  setLoading:  (v) => set({ isLoading: v }),
  setError:    (e) => set({ error: e }),
}))
