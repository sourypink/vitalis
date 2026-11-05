import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { assessAthlete, assessOlderAdult } from './engine/assess'
import type { Mode } from './engine/decide'
import {
  ATHLETE_CHECK_INS,
  ATHLETE_SCENARIOS,
  OLDER_CHECK_INS,
  OLDER_SCENARIOS,
  demoAthleteHistory,
  margaret,
  type AthleteScenario,
  type OlderScenario,
} from './data/people'
import { DEFAULT_SHARE, ROUTES, recipients, type Demo, type Route, type SentAlert, type Share } from './demo'
import { useFallEscalation, type FallStep } from './hooks'
import { showBrowserNotification } from './notify'
import { Alerts } from './screens/Alerts'
import { CheckIn } from './screens/CheckIn'
import { Dashboard } from './screens/Dashboard'
import { Live } from './screens/Live'
import { Privacy } from './screens/Privacy'
import { Risk } from './screens/Risk'
import { Start } from './screens/Start'

const TOAST_MS = 6000

type Location = { mode: Mode | null; route: Route }

function readHash(): Location {
  const [modePart, routePart] = window.location.hash.replace(/^#\/?/, '').split('/')
  const mode = modePart === 'athlete' || modePart === 'older' ? modePart : null
  const route = ROUTES.includes(routePart as Route) ? (routePart as Route) : 'live'
  return mode ? { mode, route } : { mode: null, route: 'start' }
}

function assess(mode: Mode, scenario: AthleteScenario | OlderScenario, checkIn: string, riskyMovement: boolean, cameraConsent: boolean) {
  if (mode === 'athlete') {
    const history = demoAthleteHistory(scenario as AthleteScenario)
    return { history, tug: [] as number[], assessment: assessAthlete({ history, checkIn, riskyMovement }) }
  }
  const data = margaret(scenario as OlderScenario)
  return { history: data.history, tug: data.tug, assessment: assessOlderAdult({ ...data, checkIn, riskyMovement, cameraConsent }) }
}

const NAV: { route: Route; label: (mode: Mode) => string; icon: string }[] = [
  { route: 'live', label: () => 'Live', icon: 'M3 12h4l3-7 4 14 3-7h4' },
  { route: 'checkin', label: () => 'Check-in', icon: 'M4 5h16v11H8l-4 4z' },
  { route: 'risk', label: () => 'Risk', icon: 'M12 3l9 16H3zM12 10v4M12 17v.5' },
  { route: 'dashboard', label: (mode) => (mode === 'athlete' ? 'Coach' : 'Family'), icon: 'M4 20v-2a5 5 0 0 1 10 0v2M9 9a3 3 0 1 0 0-.01M15 4a3 3 0 0 1 0 6M20 20v-2a5 5 0 0 0-3-4.6' },
  { route: 'alerts', label: () => 'Alerts', icon: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0' },
  { route: 'privacy', label: () => 'Privacy', icon: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4' },
]

export function App() {
  const [location, setLocation] = useState<Location>(readHash)
  const [athleteScenario, setAthleteScenario] = useState<AthleteScenario>('normal')
  const [olderScenario, setOlderScenario] = useState<OlderScenario>('normal')
  const [checkIns, setCheckIns] = useState<Record<Mode, string>>({ athlete: ATHLETE_CHECK_INS.normal, older: OLDER_CHECK_INS.normal })
  const [riskyMovement, setRiskyMovementState] = useState<Record<Mode, boolean>>({ athlete: false, older: false })
  const [cameraConsent, setCameraConsent] = useState(false)
  const [shares, setShares] = useState<Record<Mode, Share>>(DEFAULT_SHARE)
  const [alerts, setAlerts] = useState<SentAlert[]>([])
  const [toasts, setToasts] = useState<SentAlert[]>([])
  const nextId = useRef(1)

  useEffect(() => {
    const onHash = () => {
      setLocation(readHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const notify = useCallback((title: string, body: string, to: string[]) => {
    const alert: SentAlert = { id: nextId.current++, time: new Date(), to, title, body, browser: false }
    setToasts((current) => [...current.slice(-1), alert])
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== alert.id)), TOAST_MS)
    setAlerts((current) => [...current, alert])
    showBrowserNotification(title, body)
      .then((shown) => {
        if (shown) setAlerts((current) => current.map((entry) => (entry.id === alert.id ? { ...entry, browser: true } : entry)))
      })
      .catch((error: unknown) => console.error('Browser notification failed', error))
  }, [])

  const onFallStep = useCallback(
    (step: FallStep) => {
      if (step.id === 'ask') notify('Margaret’s watch: Are you OK?', 'A hard fall was detected. Tap “I’m OK” within 60 s to cancel.', ['Margaret'])
      if (step.id === 'family') notify('Vitalis · Margaret may have fallen', 'No response for 60 s. Call her now. Emergency call in 30 s.', ['Sarah (daughter)'])
      if (step.id === 'emergency') notify('Emergency call (mock)', 'Demo: no call is placed. A real watch would call emergency services and share her location.', ['Emergency services (mock)'])
    },
    [notify],
  )
  const fall = useFallEscalation(onFallStep)

  const mode = location.mode ?? 'athlete'
  const scenario = mode === 'athlete' ? athleteScenario : olderScenario
  const checkIn = checkIns[mode]
  const share = shares[mode]
  const current = useMemo(
    () => assess(mode, scenario, checkIn, riskyMovement[mode], cameraConsent),
    [mode, scenario, checkIn, riskyMovement, cameraConsent],
  )

  const notifyRisk = useCallback(
    (result: ReturnType<typeof assess>['assessment']) => {
      if (result.decision.label === 'LOW') return
      const who = result.mode === 'athlete' ? 'Player 7' : 'Margaret'
      const shorts = result.why.filter((reason) => reason.flagged).map((reason) => reason.short).join(', ')
      const reasons = shorts.charAt(0).toUpperCase() + shorts.slice(1)
      notify(`Vitalis · ${who}: ${result.decision.label} risk`, `${reasons}. ${result.recommendation}`, recipients(result.mode, shares[result.mode]))
    },
    [notify, shares],
  )

  const go = useCallback((route: Route) => {
    window.location.hash = route === 'start' ? '#/' : `#/${mode}/${route}`
  }, [mode])

  const setScenario = (id: AthleteScenario | OlderScenario) => {
    const text = mode === 'athlete' ? ATHLETE_CHECK_INS[id as AthleteScenario] : OLDER_CHECK_INS[id as OlderScenario]
    if (mode === 'athlete') setAthleteScenario(id as AthleteScenario)
    else setOlderScenario(id as OlderScenario)
    setCheckIns((all) => ({ ...all, [mode]: text }))
    if (mode === 'older') {
      if (id === 'fall') fall.start()
      else fall.stop()
    }
    if (id !== 'fall') notifyRisk(assess(mode, id, text, riskyMovement[mode], cameraConsent).assessment)
  }

  const demo: Demo = {
    mode,
    scenario,
    setScenario,
    checkIn,
    setCheckIn: (text) => setCheckIns((all) => ({ ...all, [mode]: text })),
    submitCheckIn: () => {
      notifyRisk(current.assessment)
      go('risk')
    },
    riskyMovement: riskyMovement[mode],
    setRiskyMovement: (on) => setRiskyMovementState((all) => ({ ...all, [mode]: on })),
    cameraConsent,
    setCameraConsent,
    share,
    setShare: (next) => setShares((all) => ({ ...all, [mode]: next })),
    history: current.history,
    tug: current.tug,
    assessment: current.assessment,
    notify,
    alerts,
    fall,
    go,
  }

  const scenarios = mode === 'athlete' ? ATHLETE_SCENARIOS : OLDER_SCENARIOS
  const onStart = location.mode === null

  return (
    <div className={`app mode-${mode}`}>
      <header className="top">
        <div className="demo-banner">Demo · simulated data</div>
        {!onStart && (
          <>
            <div className="top-row">
              <a className="wordmark" href="#/">
                Vitalis
              </a>
              <button type="button" className="mode-chip" onClick={() => go('start')} aria-label={`${mode === 'athlete' ? 'Athlete' : 'Older adult'} mode. Change mode`}>
                <span className="dot" aria-hidden="true" />
                {mode === 'athlete' ? 'Athlete mode' : 'Older adult mode'}
              </button>
            </div>
            <div className="scenarios">
              <div className="scenarios-label" id="scenario-label">
                Scenario
              </div>
              <div className="segmented" role="group" aria-labelledby="scenario-label">
                {scenarios.map((option) => (
                  <button key={option.id} type="button" aria-pressed={option.id === scenario} onClick={() => setScenario(option.id)}>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            {fall.status === 'running' && location.route !== 'alerts' && (
              <div className="fall-strip">
                <a href={`#/${mode}/alerts`}>Fall escalation running · {Math.floor(fall.elapsed)} s · open →</a>
              </div>
            )}
          </>
        )}
      </header>

      {onStart && <Start onPick={(picked) => (window.location.hash = `#/${picked}/live`)} />}
      {!onStart && location.route === 'live' && <Live demo={demo} />}
      {!onStart && location.route === 'checkin' && <CheckIn demo={demo} />}
      {!onStart && location.route === 'risk' && <Risk demo={demo} />}
      {!onStart && location.route === 'dashboard' && <Dashboard demo={demo} />}
      {!onStart && location.route === 'alerts' && <Alerts demo={demo} />}
      {!onStart && location.route === 'privacy' && <Privacy demo={demo} />}

      <div className="toasts" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast" role="status">
            <div className="toast-body">
              <span className="toast-to">To {toast.to.join(', ')}</span>
              <b>{toast.title}</b>
              <span className="small">{toast.body}</span>
            </div>
            <button type="button" aria-label="Dismiss" onClick={() => setToasts((all) => all.filter((entry) => entry.id !== toast.id))}>
              ×
            </button>
          </div>
        ))}
      </div>

      {!onStart && (
        <nav className="nav" aria-label="Screens">
          <ul>
            {NAV.map((item) => (
              <li key={item.route}>
                <a href={`#/${mode}/${item.route}`} aria-current={location.route === item.route ? 'page' : undefined}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={item.icon} />
                  </svg>
                  {item.label(mode)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}
