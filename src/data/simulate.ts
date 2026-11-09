import { RECENT_DAYS, type Day } from '../engine/assess'
import { BASELINE_DAYS } from '../engine/constants'
import { normal, seededRandom } from './random'

// Seeded synthetic watch data for the demo user. Nothing here is real health data.

const SEED = 371 // BTE 371
const HISTORY_DAYS = BASELINE_DAYS + RECENT_DAYS // 28-day baseline, then 14 days the scenarios can change
const BASELINE_CLAMP_SD = 2.5 // keep synthetic outliers out of the baseline
const RECENT_CLAMP_SD = 1.2 // a normal recent day stays well inside the |z| < 2 band
const STEPS_CV = 0.087 // day-to-day step variation as a share of the mean (450 / 5,200 in the original profile)
const WALKING_SLOWDOWN_M_S = 0.15 // over the last 14 days, ≈ 4 SD
const WALKING_STEPS_FACTOR = 0.75 // steps fall to 75% as walking slows

export type Scenario = 'normal' | 'walking-slowing' | 'fall'

export const SCENARIOS: { id: Scenario; label: string }[] = [
  { id: 'normal', label: 'Normal day' },
  { id: 'walking-slowing', label: 'Walking slowing over 2 weeks' },
  { id: 'fall', label: 'Fall detected' },
]

/** The check-in text each scenario starts with. The user can edit it. */
export const CHECK_INS: Record<Scenario, string> = {
  normal: '',
  'walking-slowing': 'Feeling okay. Did a little gardening this morning.',
  fall: 'I fell in the kitchen and my hip hurts.',
}

/** Weekly Timed Up and Go tests in seconds, oldest first. */
const TUG: Record<Scenario, number[]> = {
  normal: [10.1, 10.4, 9.9, 10.2, 10.3, 10.0],
  'walking-slowing': [10.1, 10.4, 9.9, 10.2, 11.3, 12.6],
  fall: [10.1, 10.4, 9.9, 10.2, 10.3, 10.0],
}

function profile(typicalSteps: number): Record<keyof Day, { mean: number; sd: number }> {
  return {
    restingHr: { mean: 68, sd: 2 },
    steps: { mean: typicalSteps, sd: typicalSteps * STEPS_CV },
    sleep: { mean: 7.1, sd: 0.4 },
    walkingSpeed: { mean: 1.0, sd: 0.03 },
  }
}

function generateHistory(typicalSteps: number): Day[] {
  const random = seededRandom(SEED)
  const metrics = profile(typicalSteps)
  const names = Object.keys(metrics) as (keyof Day)[]
  return Array.from({ length: HISTORY_DAYS }, (_, dayIndex) => {
    const clamp = dayIndex < BASELINE_DAYS ? BASELINE_CLAMP_SD : RECENT_CLAMP_SD
    const day = {} as Day
    for (const name of names) day[name] = normal(random, metrics[name].mean, metrics[name].sd, clamp)
    return day
  })
}

function applyScenario(history: Day[], scenario: Scenario): Day[] {
  if (scenario !== 'walking-slowing') return history
  return history.map((day, index) => {
    const indexFromEnd = history.length - 1 - index
    if (indexFromEnd >= RECENT_DAYS) return day
    const progress = (RECENT_DAYS - indexFromEnd) / RECENT_DAYS // 1/14 … 1 (today)
    return {
      ...day,
      walkingSpeed: day.walkingSpeed - WALKING_SLOWDOWN_M_S * progress,
      steps: day.steps * (1 - (1 - WALKING_STEPS_FACTOR) * progress),
    }
  })
}

/** 42 days of watch data (oldest first), weekly TUG results and the fall flag for one scenario. */
export function simulate(scenario: Scenario, typicalSteps: number): { history: Day[]; tug: number[]; fallDetected: boolean } {
  return {
    history: applyScenario(generateHistory(typicalSteps), scenario),
    tug: TUG[scenario],
    fallDetected: scenario === 'fall',
  }
}
