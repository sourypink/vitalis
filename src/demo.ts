import type { Assessment, AthleteDay, OlderDay } from './engine/assess'
import type { Mode } from './engine/decide'
import type { AthleteScenario, OlderScenario } from './data/people'
import type { FallEscalation } from './hooks'

export type Route = 'start' | 'live' | 'checkin' | 'risk' | 'dashboard' | 'alerts' | 'privacy'
export const ROUTES: Route[] = ['start', 'live', 'checkin', 'risk', 'dashboard', 'alerts', 'privacy']

export type ShareRow = 'label' | 'details' | 'alerts'
export const SHARE_ROWS: { id: ShareRow; label: string }[] = [
  { id: 'label', label: 'Risk colour' },
  { id: 'details', label: 'Reasons and check-in text' },
  { id: 'alerts', label: 'Gets alerts' },
]

export const AUDIENCE: Record<Mode, { self: string; others: { id: string; label: string }[] }> = {
  athlete: {
    self: 'Athlete',
    others: [
      { id: 'trainer', label: 'Trainer' },
      { id: 'coach', label: 'Coach' },
    ],
  },
  older: {
    self: 'Margaret',
    others: [
      { id: 'sarah', label: 'Sarah' },
      { id: 'doctor', label: 'Doctor' },
    ],
  },
}

export type Share = Record<ShareRow, Record<string, boolean>>

export const DEFAULT_SHARE: Record<Mode, Share> = {
  athlete: {
    label: { trainer: true, coach: true },
    details: { trainer: true, coach: true },
    alerts: { trainer: true, coach: false },
  },
  older: {
    label: { sarah: true, doctor: false },
    details: { sarah: true, doctor: false },
    alerts: { sarah: true, doctor: false },
  },
}

const RECIPIENT_NAMES: Record<string, string> = {
  trainer: 'athletic trainer',
  coach: 'coach',
  sarah: 'Sarah (daughter)',
  doctor: 'her doctor',
}

/** Who a risk alert goes to: the person, plus whoever they allowed. */
export function recipients(mode: Mode, share: Share): string[] {
  const self = mode === 'athlete' ? 'Player 7 (you)' : 'Margaret'
  const allowed = Object.entries(share.alerts)
    .filter(([, on]) => on)
    .map(([id]) => RECIPIENT_NAMES[id])
  return [self, ...allowed]
}

export type SentAlert = { id: number; time: Date; to: string[]; title: string; body: string; browser: boolean }

export type Demo = {
  mode: Mode
  scenario: AthleteScenario | OlderScenario
  setScenario: (id: AthleteScenario | OlderScenario) => void
  checkIn: string
  setCheckIn: (text: string) => void
  submitCheckIn: () => void
  riskyMovement: boolean
  setRiskyMovement: (on: boolean) => void
  cameraConsent: boolean
  setCameraConsent: (on: boolean) => void
  share: Share
  setShare: (share: Share) => void
  history: AthleteDay[] | OlderDay[]
  tug: number[]
  assessment: Assessment<keyof AthleteDay> | Assessment<keyof OlderDay>
  notify: (title: string, body: string, to: string[]) => void
  alerts: SentAlert[]
  fall: FallEscalation
  go: (route: Route) => void
}
