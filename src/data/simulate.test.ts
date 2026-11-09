import { describe, expect, it } from 'vitest'
import { assess } from '../engine/assess'
import { CHECK_INS, SCENARIOS, simulate, type Scenario } from './simulate'
import { seededRandom } from './random'

const TYPICAL_STEPS = 6000

const run = (scenario: Scenario, checkIn = CHECK_INS[scenario], options = { riskyMovement: false, cameraConsent: false }) =>
  assess({ ...simulate(scenario, TYPICAL_STEPS), checkIn, ...options })

const flaggedText = (why: { text: string; flagged: boolean }[]) => why.filter((reason) => reason.flagged).map((reason) => reason.text)

describe('seeded data', () => {
  it('is deterministic', () => {
    const first = seededRandom(1)
    const second = seededRandom(1)
    expect([first(), first(), first()]).toEqual([second(), second(), second()])
    expect(simulate('normal', TYPICAL_STEPS)).toEqual(simulate('normal', TYPICAL_STEPS))
  })
  it('has 28 baseline days + 14 recent days', () => {
    expect(simulate('normal', TYPICAL_STEPS).history).toHaveLength(42)
  })
  it('scales steps to the survey activity level', () => {
    const steps = (typical: number) => simulate('normal', typical).history.reduce((sum, day) => sum + day.steps, 0) / 42
    expect(steps(3800)).toBeLessThan(4200)
    expect(steps(10800)).toBeGreaterThan(10000)
  })
})

describe('scenarios', () => {
  it('normal day is LOW', () => {
    expect(run('normal').decision.leaf).toBe('low')
  })

  it('walking slowing over 2 weeks is MEDIUM, with walking speed and TUG reasons', () => {
    const result = run('walking-slowing')
    expect(result.decision.leaf).toBe('medium-recover')
    const texts = flaggedText(result.why)
    expect(texts.some((text) => /^Walking speed 0\.\d\d m\/s, down from your normal \d\.\d\d over 2 weeks/.test(text))).toBe(true)
    expect(texts).toContain('Stand-up-and-walk test 12.6 s, at or over the 12 s CDC cut-off')
    expect(result.recommendation).toMatch(/Do your balance exercises today/)
  })

  it('walking slowing plus dizziness is HIGH', () => {
    expect(run('walking-slowing', 'I felt dizzy this morning').decision.label).toBe('HIGH')
  })

  it('fall detected is HIGH, even with the check-in cleared', () => {
    expect(run('fall').decision).toMatchObject({ label: 'HIGH', override: false })
    expect(run('fall', '').decision).toMatchObject({ label: 'HIGH', override: true })
  })

  it('the movement check needs home-camera consent', () => {
    expect(run('normal', CHECK_INS.normal, { riskyMovement: true, cameraConsent: false }).decision.leaf).toBe('low')
    expect(run('normal', CHECK_INS.normal, { riskyMovement: true, cameraConsent: true }).decision.leaf).toBe('medium-movement')
  })

  it('every scenario gives a different label', () => {
    expect(SCENARIOS.map(({ id }) => run(id).decision.label)).toEqual(['LOW', 'MEDIUM', 'HIGH'])
  })
})
