export function normalizePhone(phone: string): string {
  let normalized = phone.startsWith('+') ? phone.slice(1) : phone

  // WhatsApp AR mobile JIDs require "9" after country code "54"
  if (normalized.startsWith('54') && !normalized.startsWith('549')) {
    normalized = '549' + normalized.slice(2)
  }

  return normalized
}
