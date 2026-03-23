/** Normalize Israeli phone numbers to 0XXXXXXXXX format.
 *  Handles: 052..., +972-52..., 97252..., 0052..., and
 *  9-digit numbers without leading 0 (as stored by Google Sheets). */
export function normalizePhone(phone: string): string {
  let p = String(phone).replace(/\D/g, '')
  if (p.startsWith('00972')) p = '0' + p.slice(5)
  else if (p.startsWith('972')) p = '0' + p.slice(3)
  // Google Sheets strips leading 0 from numeric cells:
  // 9-digit mobile (5X/7X without leading 0) → add 0
  else if (p.length === 9 && /^[57]/.test(p)) p = '0' + p
  // 8-digit landline (2/3/4/8/9 without leading 0) → add 0
  else if (p.length === 8 && /^[2-489]/.test(p)) p = '0' + p
  return p
}

/** Validate Israeli mobile / landline */
export function isValidIsraeliPhone(phone: string): boolean {
  const normalized = normalizePhone(phone)
  return /^0(5[0-9]|7[2-9])\d{7}$/.test(normalized) ||
         /^0[2-489]\d{7}$/.test(normalized)
}

/** Format for display: 052-123-4567 */
export function formatPhone(phone: string): string {
  const p = normalizePhone(phone)
  if (p.length === 10) return p.slice(0, 3) + '-' + p.slice(3, 6) + '-' + p.slice(6)
  return p
}

/** Convert to WhatsApp link format */
export function toWaPhone(phone: string): string {
  const p = normalizePhone(phone)
  return p.startsWith('0') ? '972' + p.slice(1) : p
}

export function buildWaLink(phone: string, message: string): string {
  return `https://wa.me/${toWaPhone(phone)}?text=${encodeURIComponent(message)}`
}
