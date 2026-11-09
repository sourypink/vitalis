import { checkInFlags, type CheckInResult } from './checkin'
import { TUG_RISK_SECONDS, WALKING_SPEED_DROP_SD } from './constants'
import { decide, recommend, type Decision, type Features } from './decide'
import { baseline, zScore, type Baseline } from './stats'

/** Days at the end of each history that scenarios may change; the baseline is the 28 days before them. */
export const RECENT_DAYS = 14

export type Day = { restingHr: number; steps: number; sleep: number; walkingSpeed: number }

export type Reason = {
  text: string
  /** Short form for alerts and reports. */
  short: string
  flagged: boolean
  source?: string
}

export type Assessment = {
  today: Day
  baseline: Baseline<keyof Day>
  features: Features
  decision: Decision
  checkIn: CheckInResult
  why: Reason[]
  recommendation: string
}

const round = (value: number, digits: number) => value.toFixed(digits)

function checkInReason(result: CheckInResult): Reason {
  if (result.hits.length === 0 && result.score === 0) {
    return { text: 'No warning words in today’s check-in', short: 'check-in normal', flagged: false }
  }
  if (result.warnings.length > 0) {
    const words = [...new Set(result.warnings.map((hit) => hit.word.toLowerCase()))].join(', ')
    return { text: `Check-in mentions ‘${words}’`, short: `check-in: ‘${words}’`, flagged: true }
  }
  if (result.sentiment === 'negative') {
    return { text: 'Check-in sounds negative overall', short: 'negative check-in', flagged: true }
  }
  return { text: `Check-in sounds ${result.sentiment}`, short: `${result.sentiment} check-in`, flagged: false }
}

export function assess(input: {
  history: Day[]
  /** Timed Up and Go results in seconds, oldest first. */
  tug: number[]
  checkIn: string
  riskyMovement: boolean
  cameraConsent: boolean
  fallDetected: boolean
}): Assessment {
  if (input.history.length <= RECENT_DAYS) throw new Error(`history needs more than ${RECENT_DAYS} days`)
  const base = baseline(input.history.slice(0, -RECENT_DAYS))
  const today = input.history[input.history.length - 1]
  const why: Reason[] = []

  if (input.fallDetected) why.push({ text: 'Hard fall detected by the watch', short: 'fall detected', flagged: true, source: '[12]' })

  const speedZ = zScore(today.walkingSpeed, base.walkingSpeed)
  const slowWalking = speedZ.z <= -WALKING_SPEED_DROP_SD
  if (slowWalking) {
    const twoWeeksAgo = input.history[input.history.length - RECENT_DAYS].walkingSpeed
    const overTwoWeeks = twoWeeksAgo - today.walkingSpeed > base.walkingSpeed.sd
    why.push({
      text: `Walking speed ${round(today.walkingSpeed, 2)} m/s, down from your normal ${round(base.walkingSpeed.mean, 2)}${overTwoWeeks ? ' over 2 weeks' : ''}`,
      short: overTwoWeeks ? 'walking slowed over 2 weeks' : 'slower walking',
      flagged: true,
    })
  }

  const latestTug = input.tug[input.tug.length - 1]
  if (latestTug === undefined) throw new Error('assess() needs at least one TUG result')
  const tugRisk = latestTug >= TUG_RISK_SECONDS
  why.push({
    text: `Stand-up-and-walk test ${round(latestTug, 1)} s${tugRisk ? `, at or over the ${TUG_RISK_SECONDS} s CDC cut-off` : `, under the ${TUG_RISK_SECONDS} s cut-off`}`,
    short: `TUG ${round(latestTug, 1)} s`,
    flagged: tugRisk,
    source: '[17]',
  })

  const checkIn = checkInFlags(input.checkIn)
  why.push(checkInReason(checkIn))

  const anomaly = slowWalking || tugRisk
  const movementSeen = input.riskyMovement && input.cameraConsent
  if (!anomaly && !input.fallDetected && input.riskyMovement) {
    why.push(
      input.cameraConsent
        ? { text: 'Video: leans far forward to stand up', short: 'unsteady stand-up', flagged: true }
        : { text: 'Home camera is off (no consent), so the movement check is skipped', short: 'camera off', flagged: false },
    )
  }

  const features: Features = { anomaly, worryingCheckIn: checkIn.worrying, riskyMovement: movementSeen, fallDetected: input.fallDetected }
  const decision = decide(features)
  const ordered = [...why.filter((reason) => reason.flagged), ...why.filter((reason) => !reason.flagged)]
  if (!ordered.some((reason) => reason.flagged)) {
    ordered.unshift({ text: 'Everything is within your normal range', short: 'all normal', flagged: false })
  }
  return {
    today,
    baseline: base,
    features,
    decision,
    checkIn,
    why: ordered,
    recommendation: recommend(decision.label, { leaf: decision.leaf, fallDetected: input.fallDetected }),
  }
}
