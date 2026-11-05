import { checkInFlags, type CheckInResult } from './checkin'
import { ACWR_ACUTE_DAYS, ACWR_CHRONIC_DAYS, TUG_RISK_SECONDS, WALKING_SPEED_DROP_SD, Z_FLAG } from './constants'
import { decide, recommend, type Decision, type Features, type Mode } from './decide'
import { acwr, acwrBand, baseline, mean, zScore, type AcwrBand, type Baseline } from './stats'

/** Days at the end of each history that scenarios may change; the baseline is the 28 days before them. */
export const RECENT_DAYS = 14

export type AthleteDay = { restingHr: number; hrv: number; steps: number; sleep: number; sprint: number; load: number }
export type OlderDay = { restingHr: number; hrv: number; steps: number; sleep: number; walkingSpeed: number }

export type Reason = {
  text: string
  /** Short form for roster rows and notifications. */
  short: string
  flagged: boolean
  source?: string
}

export type Assessment<Day extends string> = {
  mode: Mode
  today: Record<Day, number>
  baseline: Baseline<Day>
  features: Features
  decision: Decision
  checkIn: CheckInResult
  why: Reason[]
  recommendation: string
  acwr?: { ratio: number; band: AcwrBand }
}

const round = (value: number, digits: number) => value.toFixed(digits)
const percentBelow = (value: number, reference: number) => Math.round((1 - value / reference) * 100)

function splitHistory<Day extends string>(history: Record<Day, number>[]) {
  if (history.length <= RECENT_DAYS) throw new Error(`history needs more than ${RECENT_DAYS} days`)
  return { base: baseline(history.slice(0, -RECENT_DAYS)), today: history[history.length - 1] }
}

function quoteWords(result: CheckInResult): string {
  const words = result.hits.filter((hit) => hit.category === 'body' || hit.warning).map((hit) => hit.word.toLowerCase())
  return [...new Set(words)].join(' ')
}

function checkInReason(result: CheckInResult, mode: Mode): Reason {
  if (result.hits.length === 0 && result.score === 0) {
    return { text: 'No warning words in today’s check-in', short: 'check-in normal', flagged: false }
  }
  if (result.warnings.length > 0) {
    const quoted = `‘${quoteWords(result)}’`
    return { text: `Check-in mentions ${quoted}`, short: `check-in: ${quoted}`, flagged: true }
  }
  if (result.sentiment === 'negative') {
    return { text: 'Check-in sounds negative overall', short: 'negative check-in', flagged: true }
  }
  const mild = result.hits.filter((hit) => hit.category === 'soreness' && !hit.negated)
  if (mild.length > 0) {
    const note = mode === 'athlete' ? 'normal after training' : 'noted'
    return {
      text: `Check-in mentions ‘${mild.map((hit) => hit.word.toLowerCase()).join(', ')}’ (${note}, not a warning word)`,
      short: 'mild soreness',
      flagged: false,
    }
  }
  return { text: `Check-in sounds ${result.sentiment}`, short: `${result.sentiment} check-in`, flagged: false }
}

function trailingCount<T>(items: T[], test: (item: T) => boolean): number {
  let count = 0
  for (let index = items.length - 1; index >= 0 && test(items[index]); index--) count++
  return count
}

function finish<Day extends string>(
  partial: Omit<Assessment<Day>, 'decision' | 'recommendation' | 'why'>,
  why: Reason[],
): Assessment<Day> {
  const decision = decide(partial.features)
  const ordered = [...why.filter((reason) => reason.flagged), ...why.filter((reason) => !reason.flagged)]
  if (!ordered.some((reason) => reason.flagged)) {
    ordered.unshift({ text: 'Everything is within your normal range', short: 'all normal', flagged: false })
  }
  return {
    ...partial,
    decision,
    why: ordered,
    recommendation: recommend(decision.label, partial.mode, { leaf: decision.leaf, fallDetected: partial.features.fallDetected }),
  }
}

export function assessAthlete(input: { history: AthleteDay[]; checkIn: string; riskyMovement: boolean }): Assessment<keyof AthleteDay> {
  const { base, today } = splitHistory(input.history)
  const why: Reason[] = []

  const loads = input.history.map((day) => day.load)
  const ratio = acwr(loads.slice(-ACWR_ACUTE_DAYS), loads.slice(-ACWR_CHRONIC_DAYS))
  const band = acwrBand(ratio)
  const loadSpike = band === 'danger'
  why.push({
    text: `Training load ratio (ACWR) ${round(ratio, 2)}${loadSpike ? ', in the ≥1.5 danger zone' : ''}`,
    short: `ACWR ${round(ratio, 1)}`,
    flagged: loadSpike,
    source: '[14][15]',
  })

  const sprintZ = zScore(today.sprint, base.sprint)
  const sprintSpike = sprintZ.z >= Z_FLAG
  const sprints = input.history.map((day) => day.sprint)
  const sprintRatio = mean(sprints.slice(-ACWR_ACUTE_DAYS)) / mean(sprints.slice(-ACWR_CHRONIC_DAYS))
  if (sprintSpike) {
    why.unshift({ text: `Sprint load this week ${round(sprintRatio, 1)}× your 4-week average`, short: `load ${round(sprintRatio, 1)}× normal`, flagged: true })
  }

  const sleepZ = zScore(today.sleep, base.sleep)
  const shortSleep = sleepZ.z <= -Z_FLAG
  if (shortSleep) {
    const nights = trailingCount(input.history, (day) => zScore(day.sleep, base.sleep).z <= -Z_FLAG)
    why.push({
      text: `Slept ${round(today.sleep, 1)} h last night${nights > 1 ? ` (${nights} short nights in a row)` : ''}; your normal is ${round(base.sleep.mean, 1)} h`,
      short: nights > 1 ? `short sleep ${nights} nights` : 'short sleep',
      flagged: true,
    })
  }

  const hrvZ = zScore(today.hrv, base.hrv)
  const lowHrv = hrvZ.z <= -Z_FLAG
  if (lowHrv) {
    why.push({ text: `HRV ${Math.round(today.hrv)} ms, ${percentBelow(today.hrv, base.hrv.mean)}% below your normal`, short: 'low HRV', flagged: true })
  }

  const hrZ = zScore(today.restingHr, base.restingHr)
  const highHr = hrZ.z >= Z_FLAG
  if (highHr) {
    why.push({
      text: `Resting heart rate ${Math.round(today.restingHr)} bpm, ${Math.round(today.restingHr - base.restingHr.mean)} above your normal`,
      short: 'high resting HR',
      flagged: true,
    })
  }

  const checkIn = checkInFlags(input.checkIn)
  why.push(checkInReason(checkIn, 'athlete'))

  const anomaly = loadSpike || sprintSpike || shortSleep || lowHrv || highHr
  if (!anomaly && input.riskyMovement) {
    why.push({ text: 'Video: left knee caves in on landing', short: 'knee caves in', flagged: true, source: '[16]' })
  }

  return finish(
    {
      mode: 'athlete',
      today,
      baseline: base,
      features: { anomaly, worryingCheckIn: checkIn.worrying, riskyMovement: input.riskyMovement },
      checkIn,
      acwr: { ratio, band },
    },
    why,
  )
}

export function assessOlderAdult(input: {
  history: OlderDay[]
  /** Timed Up and Go results in seconds, oldest first. */
  tug: number[]
  checkIn: string
  riskyMovement: boolean
  cameraConsent: boolean
  fallDetected: boolean
}): Assessment<keyof OlderDay> {
  const { base, today } = splitHistory(input.history)
  const why: Reason[] = []

  if (input.fallDetected) why.push({ text: 'Hard fall detected by the watch', short: 'fall detected', flagged: true, source: '[12]' })

  const speedZ = zScore(today.walkingSpeed, base.walkingSpeed)
  const slowWalking = speedZ.z <= -WALKING_SPEED_DROP_SD
  if (slowWalking) {
    const twoWeeksAgo = input.history[input.history.length - RECENT_DAYS].walkingSpeed
    const overTwoWeeks = twoWeeksAgo - today.walkingSpeed > base.walkingSpeed.sd
    why.push({
      text: `Walking speed ${round(today.walkingSpeed, 2)} m/s, down from her normal ${round(base.walkingSpeed.mean, 2)}${overTwoWeeks ? ' over 2 weeks' : ''} (${round(speedZ.z, 1)} SD)`,
      short: overTwoWeeks ? 'walking slowed over 2 weeks' : 'slower walking',
      flagged: true,
    })
  }

  const latestTug = input.tug[input.tug.length - 1]
  if (latestTug === undefined) throw new Error('assessOlderAdult() needs at least one TUG result')
  const tugRisk = latestTug >= TUG_RISK_SECONDS
  why.push({
    text: `Timed Up and Go ${round(latestTug, 1)} s${tugRisk ? `, at or over the ${TUG_RISK_SECONDS} s CDC STEADI cut-off` : `, under the ${TUG_RISK_SECONDS} s cut-off`}`,
    short: `TUG ${round(latestTug, 1)} s`,
    flagged: tugRisk,
    source: '[17]',
  })

  const checkIn = checkInFlags(input.checkIn)
  why.push(checkInReason(checkIn, 'older'))

  const anomaly = slowWalking || tugRisk
  const movementSeen = input.riskyMovement && input.cameraConsent
  if (!anomaly && !input.fallDetected && input.riskyMovement) {
    why.push(
      input.cameraConsent
        ? { text: 'Video: leans far forward to stand up', short: 'unsteady stand-up', flagged: true }
        : { text: 'Home camera is off (no consent), so the movement check is skipped', short: 'camera off', flagged: false },
    )
  }

  return finish(
    {
      mode: 'older',
      today,
      baseline: base,
      features: { anomaly, worryingCheckIn: checkIn.worrying, riskyMovement: movementSeen, fallDetected: input.fallDetected },
      checkIn,
    },
    why,
  )
}
