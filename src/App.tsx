import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon, type ICONS } from './components'
import { CHECK_INS, simulate, type Scenario } from './data/simulate'
import { DEFAULT_SHARE, ROUTES, type Ctx, type Route, type Saved, type SentItem } from './demo'
import { findDevice } from './devices'
import { assess } from './engine/assess'
import { useFallEscalation, type FallStep } from './hooks'
import { showBrowserNotification } from './notify'
import { Activity } from './screens/Activity'
import { Connect } from './screens/Connect'
import { Reports } from './screens/Reports'
import { Settings } from './screens/Settings'
import { Survey } from './screens/Survey'
import { Tips } from './screens/Tips'
import { Today } from './screens/Today'
import { Welcome } from './screens/Welcome'
import { DEMO_ANSWERS, EMPTY_ANSWERS, levelFromMinutes, weeklyMinutes } from './survey'

const TOAST_MS = 6000
const STORAGE_KEY = 'vitalis-app-v2'
const DEFAULT_SAVED: Saved = {
  draft: EMPTY_ANSWERS,
  answers: null,
  deviceId: null,
  textSize: 'large',
  doneTips: [],
  share: DEFAULT_SHARE,
  cameraConsent: false,
}

// Storage can be missing (private windows); the app then simply forgets on reload.
function loadSaved(): Saved {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULT_SAVED, ...(JSON.parse(raw) as Partial<Saved>) } : DEFAULT_SAVED
  } catch (error) {
    console.warn('Vitalis: could not read saved settings', error)
    return DEFAULT_SAVED
  }
}
function storeSaved(saved: Saved) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
  } catch (error) {
    console.warn('Vitalis: could not save settings', error)
  }
}

type Location = { route: Route; step: number }

function readHash(): Location {
  const [routePart, stepPart] = window.location.hash.replace(/^#\/?/, '').split('/')
  const route = ROUTES.includes(routePart as Route) ? (routePart as Route) : 'welcome'
  return { route, step: Math.max(1, Number(stepPart) || 1) }
}

const TABS: { route: Route; label: string; icon: keyof typeof ICONS }[] = [
  { route: 'today', label: 'Today', icon: 'today' },
  { route: 'activity', label: 'Activity', icon: 'activity' },
  { route: 'reports', label: 'Reports', icon: 'reports' },
  { route: 'tips', label: 'Tips', icon: 'tips' },
  { route: 'settings', label: 'Settings', icon: 'settings' },
]

export function App() {
  const [location, setLocation] = useState<Location>(readHash)
  const [saved, setSaved] = useState<Saved>(loadSaved)
  const [scenario, setScenarioState] = useState<Scenario>('normal')
  const [checkIn, setCheckIn] = useState(CHECK_INS.normal)
  const [riskyMovement, setRiskyMovement] = useState(false)
  const [sent, setSent] = useState<SentItem[]>([])
  const [toasts, setToasts] = useState<SentItem[]>([])
  const nextId = useRef(1)

  useEffect(() => {
    const onHash = () => {
      setLocation(readHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => storeSaved(saved), [saved])
  useEffect(() => {
    document.documentElement.dataset.textSize = saved.textSize
  }, [saved.textSize])

  const update = useCallback((patch: Partial<Saved>) => setSaved((current) => ({ ...current, ...patch })), [])
  const go = useCallback((route: Route, step?: number) => {
    window.location.hash = route === 'welcome' ? '#/' : step ? `#/${route}/${step}` : `#/${route}`
  }, [])

  const answers = saved.answers ?? DEMO_ANSWERS
  const familyLabel = `${answers.familyName || 'Family'}${answers.familyRelation ? ` (${answers.familyRelation})` : ''}`
  const name = answers.name || 'You'
  const device = findDevice(saved.deviceId)
  const minutes = weeklyMinutes(answers)
  const surveyLevel = levelFromMinutes(minutes)
  const alertRecipients = [
    `${name} (you)`,
    ...(saved.share.alerts.family ? [familyLabel] : []),
    ...(saved.share.alerts.doctor && answers.doctorName ? [answers.doctorName] : []),
  ]

  const notify = useCallback((title: string, body: string, to: string[], kind: SentItem['kind']) => {
    const item: SentItem = { id: nextId.current++, time: new Date(), kind, to, title, body, browser: false }
    setToasts((current) => [...current.slice(-1), item])
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== item.id)), TOAST_MS)
    setSent((current) => [...current, item])
    showBrowserNotification(title, body)
      .then((shown) => {
        if (shown) setSent((current) => current.map((entry) => (entry.id === item.id ? { ...entry, browser: true } : entry)))
      })
      .catch((error: unknown) => console.error('Browser notification failed', error))
  }, [])

  const onFallStep = useCallback(
    (step: FallStep) => {
      if (step.id === 'ask') notify('Your watch: Are you OK?', 'A hard fall was detected. Tap “I’m OK” within 60 s to cancel.', [`${name} (you)`], 'alert')
      if (step.id === 'family') notify(`Vitalis · ${name} may have fallen`, 'No response for 60 s. Call now. Emergency call in 30 s.', [familyLabel], 'alert')
      if (step.id === 'emergency') notify('Emergency call (mock)', 'Demo: no call is placed. A real watch would call emergency services and share the location.', ['Emergency services (mock)'], 'alert')
    },
    [notify, name, familyLabel],
  )
  const fall = useFallEscalation(onFallStep)

  const typicalSteps = surveyLevel.typicalSteps
  const data = useMemo(() => simulate(scenario, typicalSteps), [scenario, typicalSteps])
  const assessment = useMemo(
    () => (device ? assess({ ...data, checkIn, riskyMovement, cameraConsent: saved.cameraConsent }) : null),
    [device, data, checkIn, riskyMovement, saved.cameraConsent],
  )

  const alertIfRisky = (result: ReturnType<typeof assess> | null) => {
    if (!result || result.decision.label === 'LOW') return
    const reasons = result.why.filter((reason) => reason.flagged).map((reason) => reason.short).join(', ')
    notify(`Vitalis · ${name}: ${result.decision.label.toLowerCase()} fall risk`, `${reasons.charAt(0).toUpperCase()}${reasons.slice(1)}. ${result.recommendation}`, alertRecipients, 'alert')
  }

  const setScenario = (next: Scenario) => {
    setScenarioState(next)
    setCheckIn(CHECK_INS[next])
    if (next === 'fall') fall.start()
    else {
      fall.stop()
      if (device) alertIfRisky(assess({ ...simulate(next, typicalSteps), checkIn: CHECK_INS[next], riskyMovement, cameraConsent: saved.cameraConsent }))
    }
  }

  const signOut = () => {
    fall.stop()
    setScenarioState('normal')
    setCheckIn(CHECK_INS.normal)
    setSent([])
    setSaved(DEFAULT_SAVED)
    go('welcome')
  }

  const ctx: Ctx = {
    saved,
    update,
    answers,
    familyLabel,
    device,
    surveyLevel,
    weeklyMinutes: minutes,
    scenario,
    setScenario,
    riskyMovement,
    setRiskyMovement,
    checkIn,
    setCheckIn,
    saveCheckIn: () => alertIfRisky(assessment),
    history: device ? data.history : null,
    tug: data.tug,
    assessment,
    notify,
    sent,
    alertRecipients,
    fall,
    go,
    signOut,
  }

  // No account yet: everything past the survey sends you back to the start.
  const signedIn = saved.answers !== null
  const route: Route = !signedIn && location.route !== 'survey' ? 'welcome' : location.route
  const inApp = signedIn && TABS.some((tab) => tab.route === route)

  let screen
  if (route === 'welcome')
    screen = (
      <Welcome
        signedIn={signedIn}
        onSignIn={() => {
          if (signedIn) return go('today')
          update({ answers: DEMO_ANSWERS, draft: DEMO_ANSWERS, deviceId: saved.deviceId ?? 'apple' })
          go('today')
        }}
        onCreate={() => {
          update({ answers: null, draft: EMPTY_ANSWERS, deviceId: null, doneTips: [] })
          go('survey', 1)
        }}
      />
    )
  else if (route === 'survey')
    screen = (
      <Survey
        draft={saved.draft}
        step={location.step}
        setDraft={(draft) => update({ draft })}
        go={(step) => go('survey', step)}
        onExit={() => go(signedIn ? 'settings' : 'welcome')}
        onFinish={() => {
          update({ answers: saved.draft })
          go(saved.deviceId ? 'today' : 'connect')
        }}
      />
    )
  else if (route === 'connect') screen = <Connect ctx={ctx} />
  else if (route === 'today') screen = <Today ctx={ctx} />
  else if (route === 'activity') screen = <Activity ctx={ctx} />
  else if (route === 'reports') screen = <Reports ctx={ctx} />
  else if (route === 'tips') screen = <Tips ctx={ctx} />
  else screen = <Settings ctx={ctx} />

  return (
    <div className={`app${inApp ? ' in-app' : ''}`}>
      {inApp && (
        <nav className="nav" aria-label="Main">
          <a className="nav-brand" href="#/today">
            Vitalis
          </a>
          <ul>
            {TABS.map((tab) => (
              <li key={tab.route}>
                <a href={`#/${tab.route}`} aria-current={route === tab.route ? 'page' : undefined}>
                  <Icon name={tab.icon} />
                  {tab.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="nav-foot">Prototype · simulated data</p>
        </nav>
      )}

      <div className="content">
        {inApp && fall.status === 'running' && route !== 'today' && (
          <a className="fall-strip" href="#/today">
            Possible fall · help is being called · {Math.floor(fall.elapsed)} s · open
          </a>
        )}
        {screen}
        <p className="footnote">Prototype · simulated data · not medical advice</p>
      </div>

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
    </div>
  )
}
