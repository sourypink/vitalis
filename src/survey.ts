// Onboarding survey: activity questions + the CDC STEADI "Stay Independent" checklist.
// [n] = source number in research/RESEARCH.md.

/** Stay Independent: "If you scored 4 points or more, you may be at risk for falling." CDC STEADI [26]. */
export const STEADI_RISK_SCORE = 4

/** Weekly moderate-activity goal for adults 65+, in minutes. US Physical Activity Guidelines, 2nd ed. [27]. */
export const WEEKLY_MINUTES_GOAL = 150

/** Vigorous minutes count double toward the goal (75 vigorous ≈ 150 moderate) [27]. */
export const VIGOROUS_MULTIPLIER = 2

/** Above this the guidelines see "additional health benefits" [27]. */
export const WEEKLY_MINUTES_HIGH = 300

/** Below this we call someone "mostly sitting". Our design choice, not sourced. */
export const WEEKLY_MINUTES_LOW = 30

/** Daily step bands: < 5,000 sedentary, 5,000–7,499 low active, 7,500–9,999 somewhat active, ≥ 10,000 active. Tudor-Locke 2004 [28]. */
export const STEP_BANDS = [5000, 7500, 10000] as const

export type AgeBand = '65-74' | '75-84' | '85+'
export type WalkMinutes = 'under10' | '10to30' | 'over30'
export type Effort = 'light' | 'moderate' | 'vigorous'
export type DaysPerWeek = '1-2' | '3-4' | '5+'
export type SessionMinutes = 'under20' | '20to40' | 'over40'
export type ExerciseType = 'chair' | 'balance' | 'strength' | 'water' | 'dance'

export const AGE_OPTIONS: { id: AgeBand; label: string }[] = [
  { id: '65-74', label: '65 to 74' },
  { id: '75-84', label: '75 to 84' },
  { id: '85+', label: '85 or older' },
]
export const WALKS_OPTIONS: { id: number; label: string }[] = [
  { id: 0, label: 'I don’t usually walk' },
  { id: 1, label: 'Once a day' },
  { id: 2, label: 'Twice a day' },
  { id: 3, label: '3 times or more' },
]
export const WALK_MINUTES_OPTIONS: { id: WalkMinutes; label: string; minutes: number }[] = [
  { id: 'under10', label: 'Less than 10 minutes', minutes: 5 },
  { id: '10to30', label: '10 to 30 minutes', minutes: 20 },
  { id: 'over30', label: 'More than 30 minutes', minutes: 35 },
]
export const EXERCISE_TYPES: { id: ExerciseType; label: string; hint: string }[] = [
  { id: 'chair', label: 'Chair exercises or stretching', hint: 'seated moves, gentle stretches' },
  { id: 'balance', label: 'Balance', hint: 'tai chi, yoga, standing on one foot' },
  { id: 'strength', label: 'Strength', hint: 'light weights, bands, sit-to-stand' },
  { id: 'water', label: 'Swimming or water aerobics', hint: '' },
  { id: 'dance', label: 'Dancing, cycling or gardening', hint: '' },
]
/** The CDC "talk test" for effort [27]. */
export const EFFORT_OPTIONS: { id: Effort; label: string; hint: string }[] = [
  { id: 'light', label: 'Light', hint: 'I could sing while doing it' },
  { id: 'moderate', label: 'Moderate', hint: 'I can talk, but not sing' },
  { id: 'vigorous', label: 'Hard', hint: 'I can only say a few words before pausing for breath' },
]
export const DAYS_OPTIONS: { id: DaysPerWeek; label: string; days: number }[] = [
  { id: '1-2', label: '1 or 2 days a week', days: 1.5 },
  { id: '3-4', label: '3 or 4 days a week', days: 3.5 },
  { id: '5+', label: '5 days or more', days: 5 },
]
export const SESSION_OPTIONS: { id: SessionMinutes; label: string; minutes: number }[] = [
  { id: 'under20', label: 'Under 20 minutes', minutes: 15 },
  { id: '20to40', label: '20 to 40 minutes', minutes: 30 },
  { id: 'over40', label: 'Over 40 minutes', minutes: 45 },
]

/** The 12 Stay Independent statements, verbatim, with their points for "Yes". CDC STEADI brochure [26]. */
export const STEADI_ITEMS = [
  { id: 'fell', points: 2, text: 'I have fallen in the past year.' },
  { id: 'cane', points: 2, text: 'I use or have been advised to use a cane or walker to get around safely.' },
  { id: 'unsteady', points: 1, text: 'Sometimes I feel unsteady when I am walking.' },
  { id: 'furniture', points: 1, text: 'I steady myself by holding onto furniture when walking at home.' },
  { id: 'worried', points: 1, text: 'I am worried about falling.' },
  { id: 'pushUp', points: 1, text: 'I need to push with my hands to stand up from a chair.' },
  { id: 'curb', points: 1, text: 'I have some trouble stepping up onto a curb.' },
  { id: 'toilet', points: 1, text: 'I often have to rush to the toilet.' },
  { id: 'feet', points: 1, text: 'I have lost some feeling in my feet.' },
  { id: 'medsDizzy', points: 1, text: 'I take medicine that sometimes makes me feel light-headed or more tired than usual.' },
  { id: 'medsSleep', points: 1, text: 'I take medicine to help me sleep or improve my mood.' },
  { id: 'sad', points: 1, text: 'I often feel sad or depressed.' },
] as const
export type SteadiId = (typeof STEADI_ITEMS)[number]['id']
export const STEADI_MAX = STEADI_ITEMS.reduce((sum, item) => sum + item.points, 0)

export type Answers = {
  name: string
  age: AgeBand | null
  walksPerDay: number | null
  walkMinutes: WalkMinutes | null
  exercises: boolean | null
  exerciseTypes: ExerciseType[]
  effort: Effort | null
  daysPerWeek: DaysPerWeek | null
  sessionMinutes: SessionMinutes | null
  steadi: Partial<Record<SteadiId, boolean>>
  familyName: string
  familyRelation: string
  doctorName: string
}

export const EMPTY_ANSWERS: Answers = {
  name: '',
  age: null,
  walksPerDay: null,
  walkMinutes: null,
  exercises: null,
  exerciseTypes: [],
  effort: null,
  daysPerWeek: null,
  sessionMinutes: null,
  steadi: {},
  familyName: '',
  familyRelation: '',
  doctorName: '',
}

/** "Sign in" lands as this demo user. Illustrative, not a real person. */
export const DEMO_ANSWERS: Answers = {
  name: 'Margaret',
  age: '75-84',
  walksPerDay: 1,
  walkMinutes: 'under10',
  exercises: true,
  exerciseTypes: ['chair', 'balance'],
  effort: 'moderate',
  daysPerWeek: '1-2',
  sessionMinutes: '20to40',
  steadi: {
    fell: false, cane: false, unsteady: true, furniture: false, worried: true, pushUp: true,
    curb: false, toilet: false, feet: false, medsDizzy: true, medsSleep: false, sad: false,
  },
  familyName: 'Sarah',
  familyRelation: 'daughter',
  doctorName: 'Dr. Lee',
}

export type Level = { id: 0 | 1 | 2 | 3; name: string; description: string; typicalSteps: number }

/** One four-step scale for both the survey estimate and the watch measurement. Typical steps are simulation choices inside each Tudor-Locke band [28]. */
export const LEVELS: Level[] = [
  { id: 0, name: 'Mostly sitting', description: 'Little walking or exercise most days', typicalSteps: 3800 },
  { id: 1, name: 'Lightly active', description: 'Some activity, below the 150-minute weekly goal', typicalSteps: 6000 },
  { id: 2, name: 'Active', description: 'Meets the 150-minute weekly goal', typicalSteps: 8500 },
  { id: 3, name: 'Very active', description: 'Over 300 active minutes a week', typicalSteps: 10800 },
]

const option = <T extends { id: unknown }>(options: T[], id: unknown) => options.find((entry) => entry.id === id)

/** Weekly minutes that count toward the 150-minute goal. Walking counts as moderate (our assumption); light exercise doesn't count [27]. */
export function weeklyMinutes(answers: Answers): number {
  const walks = (answers.walksPerDay ?? 0) * (option(WALK_MINUTES_OPTIONS, answers.walkMinutes)?.minutes ?? 0) * 7
  if (!answers.exercises || !answers.effort || answers.effort === 'light') return Math.round(walks)
  const days = option(DAYS_OPTIONS, answers.daysPerWeek)?.days ?? 0
  const minutes = option(SESSION_OPTIONS, answers.sessionMinutes)?.minutes ?? 0
  const weight = answers.effort === 'vigorous' ? VIGOROUS_MULTIPLIER : 1
  return Math.round(walks + days * minutes * weight)
}

export function levelFromMinutes(minutes: number): Level {
  if (minutes >= WEEKLY_MINUTES_HIGH) return LEVELS[3]
  if (minutes >= WEEKLY_MINUTES_GOAL) return LEVELS[2]
  if (minutes >= WEEKLY_MINUTES_LOW) return LEVELS[1]
  return LEVELS[0]
}

export function levelFromSteps(stepsPerDay: number): Level {
  const band = STEP_BANDS.filter((threshold) => stepsPerDay >= threshold).length
  return LEVELS[band]
}

export function steadiScore(answers: Answers): number {
  return STEADI_ITEMS.reduce((sum, item) => sum + (answers.steadi[item.id] ? item.points : 0), 0)
}

export const said = (answers: Answers, id: SteadiId) => answers.steadi[id] === true

// Survey screens. Exercise detail screens are skipped when the answer is "No".
export type SurveyStep = 'about' | 'walks' | 'walkMinutes' | 'exercises' | 'exerciseTypes' | 'effort' | 'often' | 'steadi1' | 'steadi2' | 'steadi3' | 'contacts' | 'result'
const ALL_STEPS: SurveyStep[] = ['about', 'walks', 'walkMinutes', 'exercises', 'exerciseTypes', 'effort', 'often', 'steadi1', 'steadi2', 'steadi3', 'contacts', 'result']
export const STEADI_PAGE_SIZE = 4

export function surveySteps(answers: Answers): SurveyStep[] {
  return ALL_STEPS.filter((step) => {
    if (step === 'walkMinutes') return answers.walksPerDay !== 0
    if (step === 'exerciseTypes' || step === 'effort' || step === 'often') return answers.exercises !== false
    return true
  })
}

export function steadiPage(step: SurveyStep) {
  const page = Number(step.slice(-1)) - 1
  return STEADI_ITEMS.slice(page * STEADI_PAGE_SIZE, (page + 1) * STEADI_PAGE_SIZE)
}

/** Whether the screen has every answer it needs before "Next". */
export function stepComplete(step: SurveyStep, answers: Answers): boolean {
  switch (step) {
    case 'about':
      return answers.name.trim() !== '' && answers.age !== null
    case 'walks':
      return answers.walksPerDay !== null
    case 'walkMinutes':
      return answers.walkMinutes !== null
    case 'exercises':
      return answers.exercises !== null
    case 'exerciseTypes':
      return answers.exerciseTypes.length > 0
    case 'effort':
      return answers.effort !== null
    case 'often':
      return answers.daysPerWeek !== null && answers.sessionMinutes !== null
    case 'steadi1':
    case 'steadi2':
    case 'steadi3':
      return steadiPage(step).every((item) => answers.steadi[item.id] !== undefined)
    case 'contacts':
      return answers.familyName.trim() !== ''
    case 'result':
      return true
  }
}
