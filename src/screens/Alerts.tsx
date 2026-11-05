import { useState } from 'react'
import { FALL_STEPS } from '../hooks'
import { notificationSupport, requestNotifications, type PermissionState } from '../notify'
import { recipients, type Demo } from '../demo'

const PERMISSION_TEXT: Record<PermissionState, string> = {
  default: 'Not asked yet.',
  granted: 'Allowed. Alerts also appear as real browser notifications.',
  denied: 'Blocked in this browser. In-app alerts still work; you can re-allow in the site settings.',
  unsupported:
    'This browser can’t show web notifications (on iPhone, only after “Add to Home Screen”). In-app alerts still work.',
}

function FallTimeline({ demo }: { demo: Demo }) {
  const { fall } = demo
  const seconds = Math.floor(fall.elapsed)
  const asking = fall.status === 'running' && seconds < FALL_STEPS[1].at
  const nextStep = FALL_STEPS.find((step) => step.at > fall.elapsed)
  const countdown = nextStep ? Math.ceil(nextStep.at - fall.elapsed) : 0
  const currentId = fall.status === 'running' ? [...FALL_STEPS].reverse().find((step) => fall.elapsed >= step.at)?.id : undefined

  if (demo.scenario !== 'fall') {
    return (
      <section className="card">
        <h3>Fall escalation</h3>
        <p>Plays when a hard fall is detected.</p>
        <button type="button" className="btn" onClick={() => demo.setScenario('fall')}>
          Switch to “Fall detected”
        </button>
      </section>
    )
  }

  return (
    <section className="card">
      <div className="card-head">
        <h3>Fall escalation</h3>
        <span className="tag">After Apple Fall Detection [12]</span>
      </div>
      <div className="watch" aria-label="Margaret’s watch (simulated)">
        <div className="watch-face" aria-live="polite">
          {fall.status === 'cancelled' ? (
            <b>OK. Alert cancelled.</b>
          ) : fall.status === 'complete' ? (
            <b>Emergency call (mock)</b>
          ) : asking ? (
            <>
              <b>Are you OK?</b>
              <span className="count">{countdown}s</span>
              <button type="button" className="watch-ok" onClick={fall.cancel}>
                I’m OK
              </button>
              <button type="button" className="watch-help" onClick={fall.skip}>
                I need help
              </button>
            </>
          ) : fall.status === 'running' ? (
            <>
              <b>Sarah alerted</b>
              <span>Calling emergency in</span>
              <span className="count">{countdown}s</span>
              <button type="button" className="watch-ok" onClick={fall.cancel}>
                Cancel call
              </button>
            </>
          ) : (
            <b>Ready</b>
          )}
        </div>
      </div>
      <ol className="timeline">
        {FALL_STEPS.map((step) => {
          const reached = fall.status !== 'idle' && fall.elapsed >= step.at
          return (
            <li key={step.id} className={step.id === currentId ? 'current' : reached ? 'done' : undefined}>
              <time>{step.at} s</time>
              <span>
                {step.text}
                {reached && <span className="sr-only"> (done)</span>}
              </span>
            </li>
          )
        })}
      </ol>
      <div className="btn-row">
        {fall.status === 'running' ? (
          <button type="button" className="btn btn-secondary" onClick={fall.skip}>
            Skip ahead ⏭
          </button>
        ) : (
          <button type="button" className="btn" onClick={fall.start}>
            {fall.status === 'idle' ? 'Start' : 'Replay'} escalation
          </button>
        )}
      </div>
      <p className="small muted">
        Apple’s watch waits about a minute for a response after a hard fall, then counts down 30 s before calling emergency services and contacts{' '}
        <span className="source">[12]</span>. Here nothing is dialled or sent.
      </p>
    </section>
  )
}

export function Alerts({ demo }: { demo: Demo }) {
  const [permission, setPermission] = useState<PermissionState>(notificationSupport())

  return (
    <main>
      <section className="card">
        <div className="card-head">
          <h2>Notifications</h2>
        </div>
        <p>
          Medium and high risk go to <b>{recipients(demo.mode, demo.share).join(', ')}</b>. Change who in Privacy.
        </p>
        <p className="small muted">Browser notifications: {PERMISSION_TEXT[permission]}</p>
        {permission === 'default' && (
          <button type="button" className="btn" onClick={async () => setPermission(await requestNotifications())}>
            Allow notifications
          </button>
        )}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() =>
            demo.notify(
              `Vitalis · ${demo.mode === 'athlete' ? 'Player 7' : 'Margaret'}: ${demo.assessment.decision.label} risk`,
              demo.assessment.recommendation,
              recipients(demo.mode, demo.share),
            )
          }
        >
          Send a test alert
        </button>
      </section>

      {demo.mode === 'older' && <FallTimeline demo={demo} />}

      <section className="card">
        <h3>Sent this session</h3>
        {demo.alerts.length === 0 ? (
          <p className="muted">Nothing yet. Switch to a scenario with medium or high risk.</p>
        ) : (
          <ul className="log">
            {[...demo.alerts].reverse().map((alert) => (
              <li key={alert.id}>
                <span className="small muted">
                  {alert.time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })} · to {alert.to.join(', ')}
                  {alert.browser ? ' · browser notification' : ''}
                </span>
                <b>{alert.title}</b>
                <span>{alert.body}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button type="button" className="btn next" onClick={() => demo.go('privacy')}>
        Next: privacy →
      </button>
    </main>
  )
}
