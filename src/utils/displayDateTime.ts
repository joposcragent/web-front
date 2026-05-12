/** Calendar date from API without time zone (`LocalDate` as `YYYY-MM-DD`). */
const CIVIL_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

function trimRaw(raw: string | null | undefined): string {
  if (raw == null) return ''
  return String(raw).trim()
}

/**
 * Parses API date/datetime strings for display in the browser's local time zone.
 * `YYYY-MM-DD` alone is treated as a civil calendar date (no UTC midnight shift).
 */
export function parseApiDateInput(raw: string | null | undefined): Date | null {
  const s = trimRaw(raw)
  if (s === '' || s === '—') return null

  if (CIVIL_DATE_ONLY.test(s)) {
    const y = Number(s.slice(0, 4))
    const mo = Number(s.slice(5, 7))
    const d = Number(s.slice(8, 10))
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null
    const dt = new Date(y, mo - 1, d)
    return Number.isNaN(dt.getTime()) ? null : dt
  }

  const dt = new Date(s)
  return Number.isNaN(dt.getTime()) ? null : dt
}

/** Instants (`OffsetDateTime` ISO): short date + time in the client's locale and time zone. */
export function formatDisplayDateTime(raw: string | null | undefined): string {
  const s = trimRaw(raw)
  if (s === '' || s === '—') return '—'
  const d = parseApiDateInput(s)
  if (d == null) return s
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

/** Civil publication date: local calendar day, no day shift for `YYYY-MM-DD`. */
export function formatDisplayDateOnly(raw: string | null | undefined): string {
  const s = trimRaw(raw)
  if (s === '' || s === '—') return '—'
  const d = parseApiDateInput(s)
  if (d == null) return s
  return d.toLocaleDateString(undefined, { dateStyle: 'short' })
}

/** Full local date/time for tooltips (never UTC `toISOString`). */
export function formatDisplayDateTimeFull(raw: string | null | undefined): string {
  const s = trimRaw(raw)
  if (s === '') return ''
  const d = parseApiDateInput(s)
  if (d == null) return s
  return d.toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'medium' })
}
