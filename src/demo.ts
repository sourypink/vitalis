import type { Assessment, Day } from './engine/assess'
import type { Scenario } from './data/simulate'
import type { Device } from './devices'
import type { FallEscalation } from './hooks'
import type { Answers, Level } from './survey'

export type Route = 'welcome' | 'survey' | 'connect' | 'today' | 'activity' | 'reports' | 'tips' | 'settings'
export const ROUTES: Route[] = ['welcome', 'survey', 'connect', 'today', 'activity', 'reports', 'tips', 'settings']

export type Person = 'family' | 'doctor'
export type ShareRow = 'label' | 'details' | 'alerts'
export const SHARE_ROWS: { id: ShareRow; label: string }[] = [
  { id: 'label', label: 'Sees your risk level' },
  { id: 'details', label: 'Sees the reasons and check-ins' },
  { id: 'alerts', label: 'Gets alerts' },
]
export type Share = Record<ShareRow, Record<Person, boolean>>
export const DEFAULT_SHARE: Share = {
  label: { family: true, doctor: true },
  details: { family: true, doctor: true },
  alerts: { family: true, doctor: false },
}

export type TextSize = 'large' | 'xl'

/** Everything kept between visits (localStorage). */
export type Saved = {
  /** Answers while the survey is in progress. */
  draft: Answers
  /** Set when the survey is finished: the user is "signed in". */
  answers: Answers | null
  deviceId: string | null
  textSize: TextSize
  doneTips: string[]
  share: Share
  cameraConsent: boolean
}

export type SentItem = { id: number; time: Date; kind: 'alert' | 'report'; to: string[]; title: string; body: string; browser: boolean }

/** What every signed-in screen gets. */
export type Ctx = {
  saved: Saved
  update: (patch: Partial<Saved>) => void
  answers: Answers
  /** "Sarah (daughter)". */
  familyLabel: string
  device: Device | null
  surveyLevel: Level
  weeklyMinutes: number
  scenario: Scenario
  setScenario: (scenario: Scenario) => void
  riskyMovement: boolean
  setRiskyMovement: (on: boolean) => void
  checkIn: string
  setCheckIn: (text: string) => void
  saveCheckIn: () => void
  /** Null until a watch or phone is connected. */
  history: Day[] | null
  tug: number[]
  assessment: Assessment | null
  notify: (title: string, body: string, to: string[], kind: SentItem['kind']) => void
  sent: SentItem[]
  alertRecipients: string[]
  fall: FallEscalation
  go: (route: Route, step?: number) => void
  signOut: () => void
}
