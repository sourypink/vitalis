import { useMemo } from 'react'
import { BaselineChart } from '../components'
import { RECENT_DAYS, type AthleteDay, type OlderDay } from '../engine/assess'
import { BASELINE_DAYS, TUG_RISK_SECONDS, Z_FLAG } from '../engine/constants'
import type { Stat } from '../engine/stats'
import { zScore } from '../engine/stats'
import { seededRandom } from '../data/random'
import type { Demo } from '../demo'
import { useHeartRateStrap, useTicker } from '../hooks'

const LIVE_SEED = 2026
const AWAKE_HR_ABOVE_RESTING = 12 // bpm: sitting, awake, vs this morning's resting HR
const HR_JITTER_BPM = 3
const HRV_JITTER_MS = 2
const SPEED_JITTER_M_S = 0.015
const STEPS_SO_FAR = 0.7 // share of today's steps already walked when the demo opens
const MAX_STEPS_PER_TICK = 3

type Tile = { name: string; value: string; unit: string; note: string; flagged: boolean }

function describe(value: number, stat: Stat, riskDirection: 1 | -1, format: (n: number) => string): { note: string; flagged: boolean } {
  const { z } = zScore(value, stat)
  const flagged = z * riskDirection >= Z_FLAG
  const range = `${format(stat.mean - Z_FLAG * stat.sd)}–${format(stat.mean + Z_FLAG * stat.sd)}`
  return { note: flagged ? `Outside your normal ${range}` : `Normal ${range}`, flagged }
}

export function Live({ demo }: { demo: Demo }) {
  const tick = useTicker()
  const strap = useHeartRateStrap()
  const { assessment } = demo
  const today = assessment.today as Record<string, number>
  const base = assessment.baseline as Record<string, Stat>

  const live = useMemo(() => {
    const random = seededRandom(LIVE_SEED + tick)
    const jitter = (size: number) => (random() * 2 - 1) * size
    let steps = 0
    const stepsRandom = seededRandom(LIVE_SEED)
    for (let count = 0; count < tick; count++) steps += Math.floor(stepsRandom() * (MAX_STEPS_PER_TICK + 1))
    return {
      hr: today.restingHr + AWAKE_HR_ABOVE_RESTING + jitter(HR_JITTER_BPM),
      hrv: today.hrv + jitter(HRV_JITTER_MS),
      steps: today.steps * STEPS_SO_FAR + steps,
      speed: today.walkingSpeed + jitter(SPEED_JITTER_M_S),
    }
  }, [tick, today])

  const whole = (n: number) => Math.round(n).toLocaleString('en-US')
  const oneDecimal = (n: number) => n.toFixed(1)
  const twoDecimals = (n: number) => n.toFixed(2)

  const hrTile: Tile = {
    name: strap.bpm !== null ? `Heart rate · ${strap.deviceName}` : 'Heart rate now',
    value: whole(strap.bpm ?? live.hr),
    unit: 'bpm',
    ...describe(today.restingHr, base.restingHr, 1, whole),
  }
  hrTile.note = `Resting ${whole(today.restingHr)} this morning · ${hrTile.note.toLowerCase()}`

  const tiles: Tile[] = [
    hrTile,
    { name: 'HRV (RMSSD)', value: whole(live.hrv), unit: 'ms', ...describe(today.hrv, base.hrv, -1, whole) },
    { name: 'Steps today', value: whole(live.steps), unit: '', note: `Usually ${whole(base.steps.mean)} a day`, flagged: false },
    { name: 'Sleep last night', value: oneDecimal(today.sleep), unit: 'h', ...describe(today.sleep, base.sleep, -1, oneDecimal) },
  ]
  if (demo.mode === 'athlete') {
    tiles.push(
      { name: 'Sprint distance', value: whole(today.sprint), unit: 'm', ...describe(today.sprint, base.sprint, 1, whole) },
      {
        name: 'Training load',
        value: whole(today.load),
        unit: 'AU',
        note: `ACWR ${assessment.acwr?.ratio.toFixed(2)} (7 vs 28 days)`,
        flagged: assessment.acwr?.band === 'danger',
      },
    )
  } else {
    tiles.push({ name: 'Walking speed', value: twoDecimals(live.speed), unit: 'm/s', ...describe(today.walkingSpeed, base.walkingSpeed, -1, twoDecimals) })
    const latestTug = demo.tug[demo.tug.length - 1]
    tiles.push({ name: 'Timed Up and Go', value: oneDecimal(latestTug), unit: 's', note: `Weekly test · risk at ≥${TUG_RISK_SECONDS} s [17]`, flagged: latestTug >= TUG_RISK_SECONDS })
  }

  const chartMetric = demo.mode === 'athlete' ? 'load' : 'walkingSpeed'
  const chartValues =
    demo.mode === 'athlete'
      ? (demo.history as AthleteDay[]).map((day) => day.load)
      : (demo.history as OlderDay[]).map((day) => day.walkingSpeed)

  return (
    <main>
      <div className="phone" aria-label="Simulated wearable">
        <span className="phone-notch" aria-hidden="true" />
        <div className="phone-screen">
          <div className="card-head">
            <span className="overline">{demo.mode === 'athlete' ? 'Player 7 · watch + GPS vest' : 'Margaret · watch'}</span>
            <span className="live-pill">Live · simulated</span>
          </div>
          <div className="metrics">
            {tiles.map((tile) => (
              <div key={tile.name} className={`metric${tile.flagged ? ' flagged' : ''}`}>
                <span className="metric-name">{tile.name}</span>
                <span className="metric-value">
                  {tile.value}
                  {tile.unit && <small>{tile.unit}</small>}
                </span>
                <span className="metric-note">
                  {tile.flagged && <b>Flagged · </b>}
                  {tile.note}
                </span>
              </div>
            ))}
          </div>
          {strap.supported && strap.bpm === null && (
            <button type="button" className="btn btn-secondary" onClick={strap.connect}>
              Connect HR strap (Bluetooth)
            </button>
          )}
          {strap.error && <p className="small" role="alert">Strap not connected: {strap.error}</p>}
          {strap.bpm !== null && <p className="small muted">Heart rate is live from your strap. The risk engine still uses the simulated data.</p>}
        </div>
      </div>

      <section className="card">
        <div className="card-head">
          <h3>{demo.mode === 'athlete' ? 'Training load vs your normal' : 'Walking speed vs her normal'}</h3>
          <span className="tag">Anomaly detection</span>
        </div>
        <BaselineChart
          values={chartValues}
          stat={base[chartMetric]}
          baselineDays={BASELINE_DAYS}
          label={demo.mode === 'athlete' ? 'Daily training load' : 'Daily walking speed'}
          higherIsRisk={demo.mode === 'athlete'}
        />
        <p className="small muted">
          Vitalis learns a {BASELINE_DAYS}-day personal baseline, then flags days more than {Z_FLAG} SD from it. The last {RECENT_DAYS} days are what each scenario
          changes. Baseline length and the {Z_FLAG} SD cut-off are our tunable design choices.
        </p>
      </section>

      <button type="button" className="btn next" onClick={() => demo.go('checkin')}>
        Next: daily check-in →
      </button>
    </main>
  )
}
