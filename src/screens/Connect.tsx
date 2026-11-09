import { useEffect, useState } from 'react'
import { Icon } from '../components'
import type { Ctx } from '../demo'
import { DEVICES, PHONE_ONLY, SENSORS, type Device } from '../devices'

const PAIRING_MS = 1800 // simulated pairing time

const FALL_TEXT: Record<Device['fallDetection'], string> = {
  always: 'Fall detection, 24/7',
  'during workouts': 'Fall detection only during workouts',
  none: 'No fall detection',
}

function Feature({ ok, children }: { ok: boolean; children: string }) {
  return (
    <li className={ok ? 'ok' : 'no'}>
      <span className="feature-mark" aria-hidden="true">
        {ok ? '✓' : '–'}
      </span>
      <span>
        <span className="sr-only">{ok ? 'Yes: ' : 'No: '}</span>
        {children}
      </span>
    </li>
  )
}

function DeviceCard({ device, current, pairing, onConnect }: { device: Device; current: boolean; pairing: boolean; onConnect: () => void }) {
  return (
    <li className={`device${device.recommended ? ' recommended' : ''}${current ? ' current' : ''}`}>
      <div className="device-head">
        <div>
          <h3>{device.name}</h3>
          <p className="small muted">{device.models}</p>
        </div>
        {device.recommended && <span className="tag">Best for falls</span>}
      </div>
      <ul className="features">
        <Feature ok={device.fallDetection === 'always'}>{FALL_TEXT[device.fallDetection]}</Feature>
        <Feature ok={device.gyroscope !== 'no'}>{device.gyroscope === 'some models' ? 'Gyroscope on some models' : device.gyroscope === 'yes' ? 'Gyroscope' : 'No gyroscope'}</Feature>
        <Feature ok={device.heartRate}>Heart rate</Feature>
        <Feature ok={device.sleep}>Sleep</Feature>
        <Feature ok>{device.gait}</Feature>
      </ul>
      <p className="small">{device.note}</p>
      <p className="source">
        Data: {device.dataPath} {device.source}
      </p>
      <button type="button" className={`btn ${current ? 'btn-secondary' : ''}`} disabled={pairing} onClick={onConnect}>
        {current ? 'Connected ✓' : pairing ? 'Connecting…' : `Connect ${device.name}`}
      </button>
    </li>
  )
}

export function Connect({ ctx }: { ctx: Ctx }) {
  const [pairing, setPairing] = useState<string | null>(null)
  const { update, go } = ctx

  useEffect(() => {
    if (!pairing) return
    const timer = window.setTimeout(() => {
      update({ deviceId: pairing })
      setPairing(null)
      go('today')
    }, PAIRING_MS)
    return () => window.clearTimeout(timer)
  }, [pairing, update, go])

  const firstTime = ctx.saved.deviceId === null

  return (
    <main className="connect">
      <div className="survey-top">
        {!firstTime && (
          <button type="button" className="btn-ghost" onClick={() => ctx.go('settings')}>
            <Icon name="back" size={20} /> Back
          </button>
        )}
      </div>
      <section className="question">
        <h1>Connect your watch</h1>
        <p className="lead">Vitalis reads your steps, walking and heart rate from a smartwatch. A watch with fall detection can also call for help.</p>
      </section>

      {pairing && (
        <div className="pairing" role="status">
          <span className="spinner" aria-hidden="true" />
          Connecting to {DEVICES.find((device) => device.id === pairing)?.name ?? PHONE_ONLY.name}… (simulated)
        </div>
      )}

      <ul className="device-list">
        {DEVICES.map((device) => (
          <DeviceCard key={device.id} device={device} current={ctx.saved.deviceId === device.id} pairing={pairing !== null} onConnect={() => setPairing(device.id)} />
        ))}
      </ul>

      <section className="card">
        <h2>No watch?</h2>
        <p>{PHONE_ONLY.note}</p>
        <button type="button" className="btn btn-secondary" disabled={pairing !== null} onClick={() => setPairing(PHONE_ONLY.id)}>
          {ctx.saved.deviceId === PHONE_ONLY.id ? 'Using phone only ✓' : 'Use my iPhone only'}
        </button>
      </section>

      <details className="card">
        <summary>
          <h2>What each sensor is for</h2>
        </summary>
        <dl className="sensor-list">
          {SENSORS.map((sensor) => (
            <div key={sensor.name}>
              <dt>{sensor.name}</dt>
              <dd>{sensor.use}</dd>
            </div>
          ))}
        </dl>
        <p className="small muted">
          A web page can’t read Apple Health or Health Connect, so the real Vitalis would be a phone app. Here, connecting loads simulated data.
        </p>
      </details>

      {firstTime && (
        <button type="button" className="btn-ghost center" onClick={() => ctx.go('today')}>
          Skip for now
        </button>
      )}
    </main>
  )
}
