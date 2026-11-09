import { useEffect, useRef, useState } from 'react'
import { DecisionTree, Icon, WhyList, type ICONS } from '../components'
import type { Ctx } from '../demo'
import { Z_FLAG } from '../engine/constants'
import { zScore, type Stat } from '../engine/stats'
import { FALL_STEPS } from '../hooks'

const QUICK_PHRASES = ['I feel good', 'I feel dizzy', 'I’m in pain', 'I’m very tired', 'I feel unsteady', 'I started a new medicine']
const RISK_TITLE = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' } as const
const RISK_LINE = {
  LOW: 'Your walking and balance look like your normal.',
  MEDIUM: 'Something has changed. Worth keeping an eye on.',
  HIGH: 'Your risk of falling is higher than usual today.',
} as const

function greeting(): string {
  const hour = new Date().getHours()
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}

// ---- Speech input (Web Speech API, where the browser has it) ----
type Recognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
  start: () => void
  stop: () => void
}
type RecognitionWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }

function CheckIn({ ctx }: { ctx: Ctx }) {
  const Speech = (window as RecognitionWindow).SpeechRecognition ?? (window as RecognitionWindow).webkitSpeechRecognition
  const [listening, setListening] = useState(false)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const recognition = useRef<Recognition | null>(null)
  useEffect(() => () => recognition.current?.stop(), [])

  const text = ctx.checkIn
  const edit = (next: string) => {
    ctx.setCheckIn(next)
    setSaved(false)
  }
  const toggle = (phrase: string) => {
    const parts = text.split(/\.\s*/).map((part) => part.trim()).filter(Boolean)
    const next = parts.includes(phrase) ? parts.filter((part) => part !== phrase) : [...parts, phrase]
    edit(next.length ? `${next.join('. ')}.` : '')
  }
  const toggleMic = () => {
    if (!Speech) return
    if (listening) return recognition.current?.stop()
    setSpeechError(null)
    const session = new Speech()
    session.lang = 'en-US'
    session.interimResults = false
    session.continuous = false
    session.onresult = (event) => edit([text.trim(), Array.from(event.results, (alternatives) => alternatives[0].transcript).join(' ')].filter(Boolean).join(' '))
    session.onerror = (event) => setSpeechError(event.error)
    session.onend = () => setListening(false)
    recognition.current = session
    session.start()
    setListening(true)
  }
  const noticed = ctx.assessment?.checkIn.warnings.map((hit) => hit.word.toLowerCase()) ?? []

  return (
    <section className="card">
      <h2>How are you feeling today?</h2>
      <div className="chips" role="group" aria-label="Quick answers">
        {QUICK_PHRASES.map((phrase) => (
          <button key={phrase} type="button" className="chip" aria-pressed={text.includes(phrase)} onClick={() => toggle(phrase)}>
            {phrase}
          </button>
        ))}
      </div>
      <label className="field">
        <span>Or tell us in your own words</span>
        <textarea value={text} onChange={(event) => edit(event.target.value)} rows={3} />
      </label>
      {noticed.length > 0 && (
        <p className="noticed">
          Vitalis noticed: <b>{[...new Set(noticed)].join(', ')}</b>
        </p>
      )}
      <div className="btn-row">
        {Speech && (
          <button type="button" className="btn btn-secondary" aria-pressed={listening} onClick={toggleMic}>
            <Icon name="mic" size={20} /> {listening ? 'Listening… tap to stop' : 'Speak'}
          </button>
        )}
        <button
          type="button"
          className="btn"
          onClick={() => {
            ctx.saveCheckIn()
            setSaved(true)
          }}
        >
          {saved ? 'Saved ✓' : 'Save check-in'}
        </button>
      </div>
      {speechError && (
        <p className="small" role="alert">
          Microphone problem: {speechError}
        </p>
      )}
    </section>
  )
}

function FallAlert({ ctx }: { ctx: Ctx }) {
  const { fall } = ctx
  if (ctx.scenario !== 'fall') return null
  const asking = fall.status === 'running' && fall.elapsed < FALL_STEPS[1].at
  const nextStep = FALL_STEPS.find((step) => step.at > fall.elapsed)
  const countdown = nextStep ? Math.ceil(nextStep.at - fall.elapsed) : 0
  return (
    <section className="fall-alert" role="alert">
      {fall.status === 'cancelled' ? (
        <>
          <h2>Glad you’re OK</h2>
          <p>The alert was cancelled. Nobody was called.</p>
        </>
      ) : fall.status === 'complete' ? (
        <>
          <h2>Help is on the way (mock)</h2>
          <p>{ctx.familyLabel} was alerted and emergency services were called. Demo: nothing was dialled.</p>
        </>
      ) : asking ? (
        <>
          <h2>Are you OK?</h2>
          <p>Your watch felt a hard fall. If you don’t answer, we’ll alert {ctx.familyLabel} in {countdown} s.</p>
        </>
      ) : (
        <>
          <h2>{ctx.familyLabel} has been alerted</h2>
          <p>Calling emergency services in {countdown} s.</p>
        </>
      )}
      {fall.status === 'running' && (
        <div className="btn-row">
          <button type="button" className="btn btn-light" onClick={fall.cancel}>
            I’m OK
          </button>
          <button type="button" className="btn btn-outline-light" onClick={fall.skip}>
            {asking ? 'I need help' : 'Call now'}
          </button>
        </div>
      )}
      <ol className="timeline">
        {FALL_STEPS.map((step) => (
          <li key={step.id} className={fall.status !== 'idle' && fall.elapsed >= step.at ? 'done' : undefined}>
            <time>{step.at} s</time> {step.text}
          </li>
        ))}
      </ol>
      <p className="small">
        Timing follows Apple Watch Fall Detection <span className="source">[12]</span>.
      </p>
    </section>
  )
}

type Tile = { name: string; icon: keyof typeof ICONS; value: string; unit: string; note: string; flagged: boolean }

function vsNormal(value: number, stat: Stat, lowIsBad: boolean, lowWord: string, highWord: string): { note: string; flagged: boolean } {
  const { z } = zScore(value, stat)
  if (z <= -Z_FLAG) return { note: `${lowWord} than usual`, flagged: lowIsBad }
  if (z >= Z_FLAG) return { note: `${highWord} than usual`, flagged: !lowIsBad }
  return { note: 'Normal for you', flagged: false }
}

export function Today({ ctx }: { ctx: Ctx }) {
  const { assessment, device, answers } = ctx
  const [showWhy, setShowWhy] = useState(false)

  const tiles: Tile[] = []
  if (assessment && device) {
    const { today, baseline } = assessment
    const stepsPercent = Math.round((today.steps / baseline.steps.mean) * 100)
    tiles.push({
      name: 'Steps',
      icon: 'steps',
      value: Math.round(today.steps).toLocaleString('en-US'),
      unit: '',
      note: `${stepsPercent}% of your usual ${Math.round(baseline.steps.mean).toLocaleString('en-US')}`,
      flagged: zScore(today.steps, baseline.steps).z <= -Z_FLAG,
    })
    tiles.push({ name: 'Walking speed', icon: 'walk', value: today.walkingSpeed.toFixed(2), unit: 'm/s', ...vsNormal(today.walkingSpeed, baseline.walkingSpeed, true, 'Slower', 'Faster') })
    if (device.sleep) tiles.push({ name: 'Sleep', icon: 'sleep', value: today.sleep.toFixed(1), unit: 'hours', ...vsNormal(today.sleep, baseline.sleep, true, 'Less', 'More') })
    if (device.heartRate) tiles.push({ name: 'Resting heart rate', icon: 'heart', value: String(Math.round(today.restingHr)), unit: 'bpm', ...vsNormal(today.restingHr, baseline.restingHr, false, 'Lower', 'Higher') })
  }

  const label = assessment?.decision.label
  const flagged = assessment?.why.filter((reason) => reason.flagged) ?? []

  return (
    <main>
      <header className="page-head">
        <div>
          <p className="muted">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1>
            {greeting()}, {answers.name || 'there'}
          </h1>
        </div>
        {device && (
          <a className="sync-chip" href="#/connect">
            <Icon name="watch" size={18} /> {device.name} · synced
          </a>
        )}
      </header>

      <FallAlert ctx={ctx} />

      {!assessment || !label ? (
        <section className="card card-accent">
          <h2>Connect your watch to start</h2>
          <p>Vitalis needs a few weeks of your walking data to learn your normal. Until then, your tips come from the survey.</p>
          <button type="button" className="btn" onClick={() => ctx.go('connect')}>
            Connect a watch
          </button>
        </section>
      ) : (
        <section className={`card risk-card risk-${label}`}>
          <div className="risk-card-head">
            <div>
              <p className="overline">Your fall risk today</p>
              <p className="risk-word">{RISK_TITLE[label]}</p>
            </div>
          </div>
          <p className="risk-line">{flagged.length ? flagged.map((reason) => reason.text).join('. ') + '.' : RISK_LINE[label]}</p>
          <div className="today-step">
            <p className="overline">Your step for today</p>
            <p>{assessment.recommendation}</p>
          </div>
          <button type="button" className="btn-ghost" aria-expanded={showWhy} onClick={() => setShowWhy(!showWhy)}>
            {showWhy ? 'Hide' : 'Why'} Vitalis says this
          </button>
          {showWhy && (
            <div className="why-panel">
              <WhyList why={assessment.why} />
              <DecisionTree decision={assessment.decision} />
              <p className="small muted">Vitalis compares today with your own last 4 weeks. It supports, but never replaces, your doctor’s judgement.</p>
            </div>
          )}
        </section>
      )}

      {tiles.length > 0 && (
        <section aria-label="Today’s numbers" className="tiles">
          {tiles.map((tile) => (
            <div key={tile.name} className={`tile${tile.flagged ? ' flagged' : ''}`}>
              <span className="tile-name">
                <Icon name={tile.icon} size={20} /> {tile.name}
              </span>
              <span className="tile-value">
                {tile.value}
                {tile.unit && <small> {tile.unit}</small>}
              </span>
              <span className="tile-note">
                {tile.flagged && <b>Check · </b>}
                {tile.note}
              </span>
            </div>
          ))}
        </section>
      )}

      <CheckIn ctx={ctx} />
    </main>
  )
}
