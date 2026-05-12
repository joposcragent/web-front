import { describe, expect, it } from 'vitest'

import {
  formatDisplayDateOnly,
  formatDisplayDateTime,
  formatDisplayDateTimeFull,
  parseApiDateInput,
} from '@/utils/displayDateTime'

describe('parseApiDateInput', () => {
  it('returns null for empty, dash, and null', () => {
    expect(parseApiDateInput('')).toBeNull()
    expect(parseApiDateInput('   ')).toBeNull()
    expect(parseApiDateInput('—')).toBeNull()
    expect(parseApiDateInput(null)).toBeNull()
    expect(parseApiDateInput(undefined)).toBeNull()
  })

  it('parses YYYY-MM-DD as local civil date (local Y/M/D match string)', () => {
    const d = parseApiDateInput('2026-03-08')
    expect(d).not.toBeNull()
    expect([d!.getFullYear(), d!.getMonth(), d!.getDate()]).toEqual([2026, 2, 8])
  })

  it('parses ISO instant with Z', () => {
    const d = parseApiDateInput('2026-01-01T12:00:00Z')
    expect(d).not.toBeNull()
    expect(d!.getTime()).toBe(new Date('2026-01-01T12:00:00Z').getTime())
  })

  it('returns null for invalid string', () => {
    expect(parseApiDateInput('not-a-date')).toBeNull()
  })
})

describe('formatDisplayDateTime', () => {
  it('returns em dash for empty input', () => {
    expect(formatDisplayDateTime('')).toBe('—')
    expect(formatDisplayDateTime(null)).toBe('—')
    expect(formatDisplayDateTime(undefined)).toBe('—')
  })

  it('returns original for unparseable string', () => {
    expect(formatDisplayDateTime('not-a-date')).toBe('not-a-date')
  })

  it('formats a known UTC instant (deterministic via fixed time zone)', () => {
    const s = formatDisplayDateTime('2026-06-15T14:30:00Z')
    expect(s.length).toBeGreaterThan(0)
    expect(s).not.toMatch(/T14:30:00\.000Z/)
  })
})

describe('formatDisplayDateOnly', () => {
  it('returns em dash for empty', () => {
    expect(formatDisplayDateOnly('')).toBe('—')
  })

  it('formats civil date without throwing', () => {
    const s = formatDisplayDateOnly('2026-04-20')
    expect(s.length).toBeGreaterThan(0)
  })
})

describe('formatDisplayDateTimeFull', () => {
  it('returns empty string for empty input', () => {
    expect(formatDisplayDateTimeFull('')).toBe('')
  })

  it('produces a longer label than short format for same instant', () => {
    const raw = '2026-05-01T10:00:00Z'
    expect(formatDisplayDateTimeFull(raw).length).toBeGreaterThanOrEqual(formatDisplayDateTime(raw).length)
  })
})
