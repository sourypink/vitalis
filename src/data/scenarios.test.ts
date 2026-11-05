import { describe, expect, it } from 'vitest'
import { assessAthlete, assessOlderAdult } from '../engine/assess'
import {
  ATHLETE_CHECK_INS,
  ATHLETE_SCENARIOS,
  DEMO_ATHLETE_ID,
  OLDER_CHECK_INS,
  buildRoster,
  demoAthleteHistory,
  margaret,
  type AthleteScenario,
  type OlderScenario,
} from './people'
import { seededRandom } from './random'

const athlete = (scenario: AthleteScenario, checkIn = ATHLETE_CHECK_INS[scenario], riskyMovement = false) =>
  assessAthlete({ history: demoAthleteHistory(scenario), checkIn, riskyMovement })

const older = (scenario: OlderScenario, checkIn = OLDER_CHECK_INS[scenario], options = { riskyMovement: false, cameraConsent: false }) =>
  assessOlderAdult({ ...margaret(scenario), checkIn, ...options })

const flaggedText = (why: { text: string; flagged: boolean }[]) => why.filter((reason) => reason.flagged).map((reason) => reason.text)

describe('seeded data', () => {
  it('is deterministic', () => {
    const first = seededRandom(1)
    const second = seededRandom(1)
    expect([first(), first(), first()]).toEqual([second(), second(), second()])
    expect(demoAthleteHistory('normal')).toEqual(demoAthleteHistory('normal'))
  })
  it('has 28 baseline days + 14 recent days for 24 athletes', () => {
    const roster = buildRoster('normal', '', false)
    expect(roster).toHaveLength(24)
    expect(roster.every((player) => player.history.length === 42)).toBe(true)
  })
})

describe('athlete scenarios', () => {
  it('normal day is LOW with nothing flagged', () => {
    const result = athlete('normal')
    expect(result.decision.leaf).toBe('low')
    expect(flaggedText(result.why)).toEqual([])
  })

  it('load spike is HIGH: sprint load 1.6×, ACWR danger zone, hamstring tight', () => {
    const result = athlete('load-spike')
    expect(result.decision.leaf).toBe('high')
    expect(result.acwr?.band).toBe('danger')
    expect(result.acwr?.ratio).toBeGreaterThanOrEqual(1.5)
    const texts = flaggedText(result.why)
    expect(texts[0]).toBe('Sprint load this week 1.6× your 4-week average')
    expect(texts).toContain('Check-in mentions ‘hamstring tight’')
  })

  it('load spike without a worrying check-in drops to MEDIUM (watch and recover)', () => {
    expect(athlete('load-spike', 'Feeling good').decision.leaf).toBe('medium-recover')
  })

  it('poor sleep + soreness is MEDIUM (watch and recover); adding a warning word makes it HIGH', () => {
    const result = athlete('poor-sleep')
    expect(result.decision.leaf).toBe('medium-recover')
    expect(flaggedText(result.why).some((text) => text.startsWith('Slept 5.0 h last night (2 short nights in a row)'))).toBe(true)
    expect(athlete('poor-sleep', 'Sore and so tired').decision.leaf).toBe('high')
  })

  it('a risky movement on a normal day is MEDIUM (fix the movement)', () => {
    expect(athlete('normal', ATHLETE_CHECK_INS.normal, true).decision.leaf).toBe('medium-movement')
  })

  it('every scenario gives a different label or reason list', () => {
    const results = ATHLETE_SCENARIOS.map(({ id }) => athlete(id))
    expect(results.map((result) => result.decision.label)).toEqual(['LOW', 'HIGH', 'MEDIUM'])
  })
})

describe('coach roster', () => {
  const count = (scenario: AthleteScenario) => {
    const tally = { LOW: 0, MEDIUM: 0, HIGH: 0 }
    for (const player of buildRoster(scenario, ATHLETE_CHECK_INS[scenario], false)) {
      tally[assessAthlete(player).decision.label]++
    }
    return tally
  }
  it('matches the poster on a load-spike day: 18 green · 4 yellow · 2 red', () => {
    expect(count('load-spike')).toEqual({ LOW: 18, MEDIUM: 4, HIGH: 2 })
  })
  it('follows the demo athlete on other days', () => {
    expect(count('normal')).toEqual({ LOW: 19, MEDIUM: 4, HIGH: 1 })
    expect(count('poor-sleep')).toEqual({ LOW: 18, MEDIUM: 5, HIGH: 1 })
  })
  it('puts the demo athlete at the expected id', () => {
    expect(buildRoster('normal', '', false)[DEMO_ATHLETE_ID - 1].name).toBe('Player 7')
  })
})

describe('older-adult scenarios', () => {
  it('normal day is LOW', () => {
    expect(older('normal').decision.leaf).toBe('low')
  })

  it('walking slowing over 2 weeks is MEDIUM, with walking speed and TUG reasons', () => {
    const result = older('walking-slowing')
    expect(result.decision.leaf).toBe('medium-recover')
    const texts = flaggedText(result.why)
    expect(texts.some((text) => /^Walking speed 0\.\d\d m\/s, down from her normal \d\.\d\d over 2 weeks/.test(text))).toBe(true)
    expect(texts).toContain('Timed Up and Go 12.6 s, at or over the 12 s CDC STEADI cut-off')
    expect(result.recommendation).toMatch(/Do your balance exercises today/)
  })

  it('walking slowing plus dizziness is HIGH', () => {
    expect(older('walking-slowing', 'I felt dizzy this morning').decision.label).toBe('HIGH')
  })

  it('fall detected is HIGH, even with the check-in cleared', () => {
    expect(older('fall').decision).toMatchObject({ label: 'HIGH', override: false })
    expect(older('fall', '').decision).toMatchObject({ label: 'HIGH', override: true })
  })

  it('the movement check needs home-camera consent', () => {
    expect(older('normal', OLDER_CHECK_INS.normal, { riskyMovement: true, cameraConsent: false }).decision.leaf).toBe('low')
    expect(older('normal', OLDER_CHECK_INS.normal, { riskyMovement: true, cameraConsent: true }).decision.leaf).toBe('medium-movement')
  })
})
