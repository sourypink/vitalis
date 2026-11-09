import { useState } from 'react'
import { Switch } from '../components'
import { SCENARIOS } from '../data/simulate'
import { SHARE_ROWS, type Ctx, type Person, type ShareRow, type TextSize } from '../demo'
import { notificationSupport, requestNotifications, type PermissionState } from '../notify'
import { AGE_OPTIONS } from '../survey'

const TEXT_SIZES: { id: TextSize; label: string }[] = [
  { id: 'large', label: 'Large' },
  { id: 'xl', label: 'Extra large' },
]

const PERMISSION_TEXT: Record<PermissionState, string> = {
  default: 'Not turned on yet.',
  granted: 'On. Alerts also show as phone notifications.',
  denied: 'Blocked in this browser. Alerts still show inside the app.',
  unsupported: 'This browser can’t show notifications (on iPhone, add Vitalis to your Home Screen first). Alerts still show inside the app.',
}

export function Settings({ ctx }: { ctx: Ctx }) {
  const { answers, saved, device } = ctx
  const [permission, setPermission] = useState<PermissionState>(notificationSupport())
  const people: { id: Person; label: string }[] = [
    { id: 'family', label: answers.familyName || 'Family' },
    ...(answers.doctorName ? [{ id: 'doctor' as const, label: answers.doctorName }] : []),
  ]
  const setShare = (row: ShareRow, person: Person, on: boolean) => ctx.update({ share: { ...saved.share, [row]: { ...saved.share[row], [person]: on } } })

  return (
    <main>
      <header className="page-head">
        <h1>Settings</h1>
      </header>

      <section className="card">
        <h2>Profile</h2>
        <dl className="kv">
          <div>
            <dt>Name</dt>
            <dd>{answers.name}</dd>
          </div>
          <div>
            <dt>Age</dt>
            <dd>{AGE_OPTIONS.find((option) => option.id === answers.age)?.label ?? '—'}</dd>
          </div>
          <div>
            <dt>Activity level</dt>
            <dd>{ctx.surveyLevel.name}</dd>
          </div>
          <div>
            <dt>Family contact</dt>
            <dd>{ctx.familyLabel}</dd>
          </div>
          <div>
            <dt>Doctor</dt>
            <dd>{answers.doctorName || '—'}</dd>
          </div>
        </dl>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            ctx.update({ draft: answers })
            ctx.go('survey', 1)
          }}
        >
          Update my answers
        </button>
      </section>

      <section className="card">
        <h2>Watch</h2>
        <p>{device ? `${device.name} · connected (simulated)` : 'No watch connected.'}</p>
        <div className="btn-row">
          <button type="button" className="btn btn-secondary" onClick={() => ctx.go('connect')}>
            {device ? 'Change watch' : 'Connect a watch'}
          </button>
          {device && (
            <button type="button" className="btn btn-secondary" onClick={() => ctx.update({ deviceId: null })}>
              Disconnect
            </button>
          )}
        </div>
      </section>

      <section className="card">
        <h2>Who sees what</h2>
        <table className="matrix">
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">Permission</span>
              </th>
              {people.map((person) => (
                <th key={person.id} scope="col">
                  {person.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SHARE_ROWS.map((row) => (
              <tr key={row.id}>
                <th scope="row">{row.label}</th>
                {people.map((person) => (
                  <td key={person.id}>
                    <Switch checked={saved.share[row.id][person.id]} onChange={(on) => setShare(row.id, person.id, on)} label={`${person.label}: ${row.label}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="toggle-row">
          <span>
            <b>Home camera check</b>
            <span className="block small muted">Watches how you stand up. Off unless you turn it on; video stays on the device and is deleted.</span>
          </span>
          <Switch checked={saved.cameraConsent} onChange={(on) => ctx.update({ cameraConsent: on })} label="Home camera check" />
        </div>
      </section>

      <section className="card">
        <h2>Display and alerts</h2>
        <p className="field-label">Text size</p>
        <div className="segmented two" role="group" aria-label="Text size">
          {TEXT_SIZES.map((size) => (
            <button key={size.id} type="button" aria-pressed={saved.textSize === size.id} onClick={() => ctx.update({ textSize: size.id })}>
              {size.label}
            </button>
          ))}
        </div>
        <p className="field-label">Phone notifications</p>
        <p className="small">{PERMISSION_TEXT[permission]}</p>
        {permission === 'default' && (
          <button type="button" className="btn btn-secondary" onClick={async () => setPermission(await requestNotifications())}>
            Turn on notifications
          </button>
        )}
      </section>

      <section className="card demo-card">
        <h2>Demo controls</h2>
        <p className="small muted">For presenting: replay the watch data as a different situation.</p>
        <div className="segmented" role="group" aria-label="Scenario">
          {SCENARIOS.map((option) => (
            <button key={option.id} type="button" aria-pressed={ctx.scenario === option.id} disabled={!device} onClick={() => ctx.setScenario(option.id)}>
              {option.label}
            </button>
          ))}
        </div>
        <div className="toggle-row">
          <span>Camera sees an unsteady stand-up</span>
          <Switch checked={ctx.riskyMovement} onChange={ctx.setRiskyMovement} label="Camera sees an unsteady stand-up" />
        </div>
        {!device && <p className="small muted">Connect a watch first.</p>}
      </section>

      <button type="button" className="btn btn-secondary btn-block" onClick={ctx.signOut}>
        Sign out
      </button>
    </main>
  )
}
