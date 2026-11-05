import { RECENT_DAYS, type AthleteDay, type OlderDay } from '../engine/assess'
import { BASELINE_DAYS } from '../engine/constants'
import { normal, seededRandom } from './random'

// Seeded synthetic data. Nothing here is real health data.

const SEED = 371 // BTE 371
const HISTORY_DAYS = BASELINE_DAYS + RECENT_DAYS // 28-day baseline, then 14 days the scenarios can change
const BASELINE_CLAMP_SD = 2.5 // keep synthetic outliers out of the baseline
const RECENT_CLAMP_SD = 1.2 // a normal recent day stays well inside the |z| < 2 band
export const ROSTER_SIZE = 24
export const DEMO_ATHLETE_ID = 7

// Overlay sizes. Chosen so the poster's story holds: sprint load 1.6× the 4-week average, ACWR ≈ 1.6.
const LOAD_SPIKE_DAYS = 7
const LOAD_SPIKE_FACTOR = 2 // 7 days at 2× → acute 2.0 / chronic (21 + 14) / 28 = 1.6
const POOR_SLEEP_HOURS = [5.2, 5.0] // last two nights
const POOR_SLEEP_HRV_FACTOR = 0.78
const POOR_SLEEP_HR_RISE_BPM = 4
const WALKING_SLOWDOWN_M_S = 0.15 // over the last 14 days, ≈ 4 SD for Margaret
const WALKING_STEPS_FACTOR = 0.75

export type AthleteScenario = 'normal' | 'load-spike' | 'poor-sleep'
export type OlderScenario = 'normal' | 'walking-slowing' | 'fall'

export const ATHLETE_SCENARIOS: { id: AthleteScenario; label: string }[] = [
  { id: 'normal', label: 'Normal day' },
  { id: 'load-spike', label: 'Load spike' },
  { id: 'poor-sleep', label: 'Poor sleep + soreness' },
]
export const OLDER_SCENARIOS: { id: OlderScenario; label: string }[] = [
  { id: 'normal', label: 'Normal day' },
  { id: 'walking-slowing', label: 'Walking slowing over 2 weeks' },
  { id: 'fall', label: 'Fall detected' },
]

/** The check-in text each scenario starts with. The user can edit it. */
export const ATHLETE_CHECK_INS: Record<AthleteScenario, string> = {
  normal: 'Felt good at practice, legs fresh.',
  'load-spike': 'Hamstring feels tight after yesterday’s sprints.',
  'poor-sleep': 'Slept badly two nights. Legs a bit sore, otherwise good.',
}
export const OLDER_CHECK_INS: Record<OlderScenario, string> = {
  normal: 'Feeling good today. Walked to the shops with Sarah.',
  'walking-slowing': 'Feeling okay. Did a little gardening this morning.',
  fall: 'I fell in the kitchen and my hip hurts.',
}

type Profile<Day extends string> = Record<Day, { mean: number; sd: number }>

function generateHistory<Day extends string>(profile: Profile<Day>, random: () => number): Record<Day, number>[] {
  const metrics = Object.keys(profile) as Day[]
  return Array.from({ length: HISTORY_DAYS }, (_, dayIndex) => {
    const clamp = dayIndex < BASELINE_DAYS ? BASELINE_CLAMP_SD : RECENT_CLAMP_SD
    const day = {} as Record<Day, number>
    for (const metric of metrics) day[metric] = normal(random, profile[metric].mean, profile[metric].sd, clamp)
    return day
  })
}

function athleteProfile(random: () => number): Profile<keyof AthleteDay> {
  const load = normal(random, 520, 60, 2)
  const sprint = normal(random, 430, 70, 2)
  return {
    restingHr: { mean: normal(random, 54, 4, 2), sd: 1.8 },
    hrv: { mean: normal(random, 72, 10, 2), sd: 5 },
    steps: { mean: normal(random, 11500, 1200, 2), sd: 900 },
    sleep: { mean: normal(random, 7.6, 0.3, 2), sd: 0.35 },
    sprint: { mean: sprint, sd: sprint * 0.07 },
    load: { mean: load, sd: load * 0.07 },
  }
}

const MARGARET_PROFILE: Profile<keyof OlderDay> = {
  restingHr: { mean: 68, sd: 2 },
  hrv: { mean: 28, sd: 3 },
  steps: { mean: 5200, sd: 450 },
  sleep: { mean: 7.1, sd: 0.4 },
  walkingSpeed: { mean: 1.0, sd: 0.03 },
}

/** Weekly Timed Up and Go tests in seconds, oldest first. */
const MARGARET_TUG: Record<OlderScenario, number[]> = {
  normal: [10.1, 10.4, 9.9, 10.2, 10.3, 10.0],
  'walking-slowing': [10.1, 10.4, 9.9, 10.2, 11.3, 12.6],
  fall: [10.1, 10.4, 9.9, 10.2, 10.3, 10.0],
}

const random = seededRandom(SEED)
const BASE_ROSTER = Array.from({ length: ROSTER_SIZE }, () => generateHistory(athleteProfile(random), random))
const BASE_MARGARET = generateHistory(MARGARET_PROFILE, random)

function withRecentDays<Day>(history: Day[], days: number, change: (day: Day, indexFromEnd: number) => Day): Day[] {
  return history.map((day, index) => {
    const indexFromEnd = history.length - 1 - index
    return indexFromEnd < days ? change(day, indexFromEnd) : day
  })
}

export function applyAthleteScenario(history: AthleteDay[], scenario: AthleteScenario): AthleteDay[] {
  if (scenario === 'load-spike') {
    return withRecentDays(history, LOAD_SPIKE_DAYS, (day) => ({
      ...day,
      sprint: day.sprint * LOAD_SPIKE_FACTOR,
      load: day.load * LOAD_SPIKE_FACTOR,
    }))
  }
  if (scenario === 'poor-sleep') {
    return withRecentDays(history, POOR_SLEEP_HOURS.length, (day, indexFromEnd) => ({
      ...day,
      sleep: POOR_SLEEP_HOURS[POOR_SLEEP_HOURS.length - 1 - indexFromEnd],
      hrv: day.hrv * POOR_SLEEP_HRV_FACTOR,
      restingHr: day.restingHr + POOR_SLEEP_HR_RISE_BPM,
    }))
  }
  return history
}

export function applyOlderScenario(history: OlderDay[], scenario: OlderScenario): OlderDay[] {
  if (scenario !== 'walking-slowing') return history
  return withRecentDays(history, RECENT_DAYS, (day, indexFromEnd) => {
    const progress = (RECENT_DAYS - indexFromEnd) / RECENT_DAYS // 1/14 … 1 (today)
    return {
      ...day,
      walkingSpeed: day.walkingSpeed - WALKING_SLOWDOWN_M_S * progress,
      steps: day.steps * (1 - (1 - WALKING_STEPS_FACTOR) * progress),
    }
  })
}

export type RosterAthlete = {
  id: number
  name: string
  history: AthleteDay[]
  checkIn: string
  riskyMovement: boolean
}

/** Fixed stories for other players, so a load-spike day reads 18 green · 4 yellow · 2 red, as on the poster. */
const ROSTER_STORIES: Record<number, { scenario: AthleteScenario; checkIn: string; riskyMovement?: boolean }> = {
  19: { scenario: 'load-spike', checkIn: 'Calf feels tight since Tuesday.' },
  3: { scenario: 'poor-sleep', checkIn: 'Bad night, a bit stiff this morning.' },
  11: { scenario: 'poor-sleep', checkIn: 'Short sleep two nights, but okay.' },
  15: { scenario: 'poor-sleep', checkIn: 'Up late studying for exams.' },
  22: { scenario: 'normal', checkIn: 'Feeling strong.', riskyMovement: true },
}

const EVERYDAY_CHECK_INS = ['Felt good today.', 'Ready for practice.', 'Normal day, legs fine.', 'Good session yesterday.', '']

export function buildRoster(demoScenario: AthleteScenario, demoCheckIn: string, demoRiskyMovement: boolean): RosterAthlete[] {
  return BASE_ROSTER.map((history, index) => {
    const id = index + 1
    const name = `Player ${id}`
    if (id === DEMO_ATHLETE_ID) {
      return { id, name, history: applyAthleteScenario(history, demoScenario), checkIn: demoCheckIn, riskyMovement: demoRiskyMovement }
    }
    const story = ROSTER_STORIES[id]
    if (story) {
      return { id, name, history: applyAthleteScenario(history, story.scenario), checkIn: story.checkIn, riskyMovement: Boolean(story.riskyMovement) }
    }
    return { id, name, history, checkIn: EVERYDAY_CHECK_INS[id % EVERYDAY_CHECK_INS.length], riskyMovement: false }
  })
}

export function demoAthleteHistory(scenario: AthleteScenario): AthleteDay[] {
  return applyAthleteScenario(BASE_ROSTER[DEMO_ATHLETE_ID - 1], scenario)
}

export function margaret(scenario: OlderScenario): { history: OlderDay[]; tug: number[]; fallDetected: boolean } {
  return {
    history: applyOlderScenario(BASE_MARGARET, scenario),
    tug: MARGARET_TUG[scenario],
    fallDetected: scenario === 'fall',
  }
}
