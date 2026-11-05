import { describe, expect, it } from 'vitest'
import { checkInFlags } from './checkin'
import { ACWR_DANGER, TUG_RISK_SECONDS, Z_FLAG } from './constants'
import { decide, recommend } from './decide'
import { acwr, acwrBand, baseline, zScore } from './stats'

describe('baseline', () => {
  it('returns mean and sample SD per metric over the last N days', () => {
    const series = [{ hr: 99 }, { hr: 2 }, { hr: 4 }, { hr: 4 }, { hr: 4 }, { hr: 5 }, { hr: 5 }, { hr: 7 }, { hr: 9 }]
    const result = baseline(series, 8)
    expect(result.hr.mean).toBe(5)
    expect(result.hr.sd).toBeCloseTo(2.138, 3)
  })

  it('defaults to 28 days and refuses a short series', () => {
    const series = Array.from({ length: 30 }, (_, index) => ({ load: index }))
    expect(baseline(series).load.mean).toBe(15.5) // days 2..29
    expect(() => baseline(series.slice(0, 10))).toThrow()
  })
})

describe('zScore', () => {
  const stat = { mean: 100, sd: 10 }
  it(`flags at |z| >= ${Z_FLAG}`, () => {
    expect(zScore(120, stat)).toEqual({ z: 2, flagged: true })
    expect(zScore(80, stat)).toEqual({ z: -2, flagged: true })
    expect(zScore(119, stat).flagged).toBe(false)
  })
  it('handles a zero SD without dividing by zero', () => {
    expect(zScore(5, { mean: 5, sd: 0 })).toEqual({ z: 0, flagged: false })
    expect(zScore(6, { mean: 5, sd: 0 }).flagged).toBe(true)
  })
})

describe('acwr', () => {
  it('divides the 7-day mean by the 28-day mean', () => {
    const load28d = [...Array(21).fill(100), ...Array(7).fill(200)]
    expect(acwr(load28d.slice(-7), load28d)).toBeCloseTo(1.6, 5)
  })
  it('uses the Gabbett 2016 bands', () => {
    expect(acwrBand(0.7)).toBe('under')
    expect(acwrBand(0.8)).toBe('sweet')
    expect(acwrBand(1.3)).toBe('sweet')
    expect(acwrBand(1.4)).toBe('caution')
    expect(acwrBand(ACWR_DANGER)).toBe('danger')
  })
  it('refuses a zero chronic load', () => {
    expect(() => acwr([1], [0, 0])).toThrow()
  })
})

describe('checkInFlags', () => {
  it('finds warning words with their positions', () => {
    const text = 'Hamstring feels tight'
    const result = checkInFlags(text)
    expect(result.warnings.map((hit) => hit.word)).toEqual(['tight'])
    expect(text.slice(result.warnings[0].start, result.warnings[0].end)).toBe('tight')
    expect(result.hits.map((hit) => hit.category)).toEqual(['body', 'tightness'])
    expect(result.worrying).toBe(true)
  })

  it('catches pain, dizziness, fatigue and new medication', () => {
    for (const text of ['my knee hurts', 'felt dizzy', 'so tired today', 'started a new medication']) {
      expect(checkInFlags(text).worrying, text).toBe(true)
    }
    expect(checkInFlags('started a new medication').warnings[0].category).toBe('medication')
  })

  it('ignores negated warning words', () => {
    const result = checkInFlags('No pain and not tired, feeling great')
    expect(result.warnings).toHaveLength(0)
    expect(result.sentiment).toBe('positive')
    expect(result.worrying).toBe(false)
  })

  it('treats mild soreness as sentiment only', () => {
    const mild = checkInFlags('Legs a bit sore, otherwise good.')
    expect(mild.worrying).toBe(false)
    expect(mild.sentiment).toBe('neutral')
    const piled = checkInFlags('Sore and stiff')
    expect(piled.sentiment).toBe('negative')
    expect(piled.worrying).toBe(true)
  })

  it('does not match inside other words', () => {
    expect(checkInFlags('I am a fine pianist, not tightfisted').warnings).toHaveLength(0)
  })

  it('handles empty text', () => {
    expect(checkInFlags('')).toMatchObject({ hits: [], score: 0, sentiment: 'neutral', worrying: false })
  })
})

describe('decide (the poster tree)', () => {
  it('maps the four leaves', () => {
    expect(decide({ anomaly: true, worryingCheckIn: true, riskyMovement: false }).leaf).toBe('high')
    expect(decide({ anomaly: true, worryingCheckIn: false, riskyMovement: true }).leaf).toBe('medium-recover')
    expect(decide({ anomaly: false, worryingCheckIn: true, riskyMovement: true }).leaf).toBe('medium-movement')
    expect(decide({ anomaly: false, worryingCheckIn: true, riskyMovement: false })).toMatchObject({ leaf: 'low', label: 'LOW' })
  })
  it('always labels a detected fall HIGH', () => {
    expect(decide({ anomaly: false, worryingCheckIn: false, riskyMovement: false, fallDetected: true })).toMatchObject({
      label: 'HIGH',
      override: true,
    })
    expect(decide({ anomaly: false, worryingCheckIn: true, riskyMovement: false, fallDetected: true }).override).toBe(false)
  })
})

describe('recommend', () => {
  it('gives one plain step per label and mode', () => {
    expect(recommend('HIGH', 'athlete')).toMatch(/Reduce sprint volume 20% today/)
    expect(recommend('MEDIUM', 'older')).toMatch(/Do your balance exercises today/)
    expect(recommend('MEDIUM', 'athlete', { leaf: 'medium-movement' })).toMatch(/landing/)
    expect(recommend('LOW', 'older')).toMatch(/Normal day/)
  })
})

it(`TUG cut-off is the CDC STEADI ${TUG_RISK_SECONDS} s`, () => {
  expect(TUG_RISK_SECONDS).toBe(12)
})
