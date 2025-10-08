export function normalizeBoolean(v: string | undefined): boolean | null {
    if (v == null) return null
    const s = String(v).trim().toLowerCase()
    if (s === '1' || s === 'true' || s === 'yes' || s === 'on')  return true
    if (s === '0' || s === 'false' || s === 'no'  || s === 'off') return false
    // любое другое (включая пустую строку) трактуем как "не задано"
    return null
}