// ── GAS Web App URL ───────────────────────────────────────
// Replace with your actual deployed GAS URL after setup
export const GAS_URL = import.meta.env.VITE_GAS_URL || 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec'

export const APP_NAME = 'מי בא לה גן'

export const SHIFTS = {
  shift1: { label: 'משמרת בוקר', color: 'blue' },
  shift2: { label: 'משמרת צהריים', color: 'green' },
} as const

export const SHIFT_COLORS = {
  shift1: {
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-700',
    selectedBg: 'bg-blue-600',
    selectedText: 'text-white',
    badge: 'bg-blue-100 text-blue-800',
  },
  shift2: {
    bg: 'bg-green-50',
    border: 'border-green-300',
    text: 'text-green-700',
    selectedBg: 'bg-green-600',
    selectedText: 'text-white',
    badge: 'bg-green-100 text-green-800',
  },
} as const

export const SESSION_KEY = 'mblg_session'
export const ADMIN_SESSION_KEY = 'mblg_admin_session'
