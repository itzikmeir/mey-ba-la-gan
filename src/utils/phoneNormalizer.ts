/** Normalize Israeli phone numbers to 0XXXXXXXXX format */
export function normalizePhone(phone: string): string {
  let p = phone.replace(/\D/g, '')
  if (p.startsWith('972')) p = '0' + p.slice(3)
  if (p.startsWith('00972')) p = '0' + p.slice(5)
  return p
}

/** Validate Israeli mobile / landline */
export function isValidIsraeliPhone(phone: string): boolean {
  const normalized = normalizePhone(phone)
  // Mobile: 05X, 07X (8 digits after 0)
  // Landline: 02, 03, 04, 08, 09 (7 digits after 0)
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
