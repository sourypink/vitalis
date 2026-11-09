import { useState } from 'react'
import { Icon, RiskBadge } from '../components'
import type { Ctx, Person } from '../demo'
import { mean } from '../engine/stats'

const PERIODS = [
  { id: 'week', label: 'This week', days: 7 },
  { id: 'month', label: 'Last 4 weeks', days: 28 },
] as const
const DAY_MS = 86_400_000

const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export function Reports({ ctx }: { ctx: Ctx }) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>(PERIODS[0])
  const [to, setTo] = useState<Record<Person, boolean>>({ family: true, doctor: Boolean(ctx.answers.doctorName) })
  const { history, assessment, answers, device } = ctx
  const people: { id: Person; label: string }[] = [
    { id: 'family', label: ctx.familyLabel },
    ...(answers.doctorName ? [{ id: 'doctor' as const, label: answers.doctorName }] : []),
  ]
  const chosen = people.filter((person) => to[person.id])

  const header = (
    <header className="page-head">
      <h1>Reports</h1>
    </header>
  )

  const log = (
    <section className="card">
      <h2>Sent</h2>
      {ctx.sent.length === 0 ? (
        <p className="muted">Nothing sent yet. Alerts go out by themselves when your risk goes up.</p>
      ) : (
        <ul className="log">
          {[...ctx.sent].reverse().map((item) => (
            <li key={item.id}>
              <span className="small muted">
                {item.kind === 'report' ? 'Report' : 'Alert'} · {item.time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · to {item.to.join(', ')}
                {item.browser ? ' · phone notification' : ''}
              </span>
              <b>{item.title}</b>
              <span>{item.body}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )

  if (!history || !assessment || !device) {
    return (
      <main>
        {header}
        <section className="card card-accent">
          <h2>Reports start once a watch is connected</h2>
          <button type="button" className="btn" onClick={() => ctx.go('connect')}>
            Connect a watch
          </button>
        </section>
        {log}
      </main>
    )
  }

  const recent = history.slice(-period.days)
  const before = history.slice(-2 * period.days, -period.days)
  const steps = mean(recent.map((day) => day.steps))
  const stepsChange = before.length ? Math.round((steps / mean(before.map((day) => day.steps)) - 1) * 100) : 0
  const speed = mean(recent.map((day) => day.walkingSpeed))
  const normalSpeed = assessment.baseline.walkingSpeed.mean
  const sleep = mean(recent.map((day) => day.sleep))
  const tug = ctx.tug[ctx.tug.length - 1]
  const start = new Date(Date.now() - (period.days - 1) * DAY_MS)
  const title = `${answers.name || 'Your'} · ${period.label.toLowerCase()} (${formatDate(start)}–${formatDate(new Date())})`
  const label = assessment.decision.label

  const lines = [
    `Fall risk today: ${label.toLowerCase()}`,
    `Steps: ${Math.round(steps).toLocaleString('en-US')} a day (${stepsChange >= 0 ? '+' : ''}${stepsChange}% vs the period before)`,
    `Walking speed: ${speed.toFixed(2)} m/s (normal ${normalSpeed.toFixed(2)})`,
    `Stand-up-and-walk test: ${tug.toFixed(1)} s`,
    ...(device.sleep ? [`Sleep: ${sleep.toFixed(1)} h a night`] : []),
    `Tips done: ${ctx.saved.doneTips.length}`,
  ]

  const send = () =>
    ctx.notify(
      `Vitalis report: ${title}`,
      `${lines.join(' · ')}. Demo: nothing is actually sent.`,
      chosen.map((person) => person.label),
      'report',
    )

  return (
    <main>
      {header}

      <section className="card">
        <h2>Send a report</h2>
        <p className="field-label">Time period</p>
        <div className="segmented two" role="group" aria-label="Time period">
          {PERIODS.map((option) => (
            <button key={option.id} type="button" aria-pressed={option.id === period.id} onClick={() => setPeriod(option)}>
              {option.label}
            </button>
          ))}
        </div>
        <p className="field-label">Send to</p>
        <div className="chips">
          {people.map((person) => (
            <button key={person.id} type="button" className="chip" aria-pressed={to[person.id]} onClick={() => setTo({ ...to, [person.id]: !to[person.id] })}>
              {to[person.id] && <Icon name="check" size={18} />} {person.label}
            </button>
          ))}
        </div>
      </section>

      <section className="report" aria-label="Report preview">
        <div className="report-head">
          <span className="overline">Preview</span>
          <RiskBadge label={label} />
        </div>
        <h2>{title}</h2>
        <dl className="report-stats">
          <div>
            <dt>Steps a day</dt>
            <dd>
              {Math.round(steps).toLocaleString('en-US')}
              <small>
                {stepsChange >= 0 ? '+' : ''}
                {stepsChange}%
              </small>
            </dd>
          </div>
          <div>
            <dt>Walking speed</dt>
            <dd>
              {speed.toFixed(2)}
              <small>m/s · normal {normalSpeed.toFixed(2)}</small>
            </dd>
          </div>
          <div>
            <dt>Stand-up test</dt>
            <dd>
              {tug.toFixed(1)}
              <small>s · risk at 12</small>
            </dd>
          </div>
          {device.sleep && (
            <div>
              <dt>Sleep</dt>
              <dd>
                {sleep.toFixed(1)}
                <small>h a night</small>
              </dd>
            </div>
          )}
        </dl>
        <p>
          <b>Today:</b> {assessment.recommendation}
        </p>
        {ctx.checkIn.trim() && <p className="small muted">Latest check-in: “{ctx.checkIn.trim()}”</p>}
      </section>

      <button type="button" className="btn btn-block" disabled={chosen.length === 0} onClick={send}>
        <Icon name="send" size={20} /> {chosen.length ? `Send to ${chosen.map((person) => person.label).join(' and ')}` : 'Pick who to send it to'}
      </button>
      <p className="small muted center">Prototype: the report shows up as a notification here. Nothing leaves this device.</p>

      {log}
    </main>
  )
}
