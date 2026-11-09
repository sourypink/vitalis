import { describe, expect, it } from 'vitest'
import {
  DEMO_ANSWERS,
  EMPTY_ANSWERS,
  STEADI_ITEMS,
  STEADI_MAX,
  STEADI_RISK_SCORE,
  levelFromMinutes,
  levelFromSteps,
  steadiScore,
  stepComplete,
  surveySteps,
  weeklyMinutes,
  type Answers,
} from './survey'

const answers = (overrides: Partial<Answers>): Answers => ({ ...EMPTY_ANSWERS, ...overrides })

describe('STEADI Stay Independent', () => {
  it('has 12 items worth 14 points, falls and cane/walker worth 2', () => {
    expect(STEADI_ITEMS).toHaveLength(12)
    expect(STEADI_MAX).toBe(14)
    expect(STEADI_ITEMS.filter((item) => item.points === 2).map((item) => item.id)).toEqual(['fell', 'cane'])
  })
  it('scores only the Yes answers', () => {
    expect(steadiScore(answers({ steadi: { fell: true, cane: false, unsteady: true } }))).toBe(3)
  })
  it('puts the demo user at the 4-point risk line', () => {
    expect(steadiScore(DEMO_ANSWERS)).toBe(STEADI_RISK_SCORE)
  })
})

describe('weekly active minutes', () => {
  it('counts walks as moderate and vigorous exercise double', () => {
    const walker = answers({ walksPerDay: 2, walkMinutes: '10to30', exercises: false })
    expect(weeklyMinutes(walker)).toBe(2 * 20 * 7)
    const swimmer = answers({ walksPerDay: 0, exercises: true, effort: 'vigorous', daysPerWeek: '3-4', sessionMinutes: '20to40' })
    expect(weeklyMinutes(swimmer)).toBe(3.5 * 30 * 2)
  })
  it('does not count light exercise toward the goal', () => {
    expect(weeklyMinutes(answers({ walksPerDay: 0, exercises: true, effort: 'light', daysPerWeek: '5+', sessionMinutes: 'over40' }))).toBe(0)
  })
  it('maps minutes and steps onto the same four levels', () => {
    expect([0, 30, 150, 300].map((minutes) => levelFromMinutes(minutes).name)).toEqual(['Mostly sitting', 'Lightly active', 'Active', 'Very active'])
    expect([4999, 5000, 7500, 10000].map((steps) => levelFromSteps(steps).id)).toEqual([0, 1, 2, 3])
    expect(levelFromMinutes(weeklyMinutes(DEMO_ANSWERS)).name).toBe('Lightly active')
  })
})

describe('survey flow', () => {
  it('skips walk length and exercise detail when the answer is no', () => {
    const steps = surveySteps(answers({ walksPerDay: 0, exercises: false }))
    expect(steps).not.toContain('walkMinutes')
    expect(steps).not.toContain('effort')
    expect(steps[steps.length - 1]).toBe('result')
  })
  it('needs every balance question answered before Next', () => {
    expect(stepComplete('steadi1', answers({ steadi: { fell: false, cane: false, unsteady: true } }))).toBe(false)
    expect(stepComplete('steadi1', answers({ steadi: { fell: false, cane: false, unsteady: true, furniture: false } }))).toBe(true)
  })
})
