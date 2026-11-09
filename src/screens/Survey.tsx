import type { ReactNode } from 'react'
import { Icon } from '../components'
import {
  AGE_OPTIONS,
  DAYS_OPTIONS,
  EFFORT_OPTIONS,
  EXERCISE_TYPES,
  LEVELS,
  SESSION_OPTIONS,
  STEADI_MAX,
  STEADI_RISK_SCORE,
  WALKS_OPTIONS,
  WALK_MINUTES_OPTIONS,
  WEEKLY_MINUTES_GOAL,
  levelFromMinutes,
  steadiPage,
  steadiScore,
  stepComplete,
  surveySteps,
  weeklyMinutes,
  type Answers,
  type SurveyStep,
} from '../survey'

type Option<T> = { id: T; label: string; hint?: string }

function Choices<T>({ options, value, onPick, legend }: { options: Option<T>[]; value: T | null; onPick: (id: T) => void; legend: string }) {
  return (
    <div className="choices" role="radiogroup" aria-label={legend}>
      {options.map((option) => (
        <button key={String(option.id)} type="button" role="radio" aria-checked={value === option.id} className="choice" onClick={() => onPick(option.id)}>
          <span className="choice-mark" aria-hidden="true" />
          <span>
            {option.label}
            {option.hint && <span className="choice-hint">{option.hint}</span>}
          </span>
        </button>
      ))}
    </div>
  )
}

function Question({ title, help, children }: { title: string; help?: string; children: ReactNode }) {
  return (
    <section className="question">
      <h1>{title}</h1>
      {help && <p className="lead">{help}</p>}
      {children}
    </section>
  )
}

const SECTION: Record<SurveyStep, string> = {
  about: 'About you',
  walks: 'Your activity',
  walkMinutes: 'Your activity',
  exercises: 'Your activity',
  exerciseTypes: 'Your activity',
  effort: 'Your activity',
  often: 'Your activity',
  steadi1: 'Balance and safety',
  steadi2: 'Balance and safety',
  steadi3: 'Balance and safety',
  contacts: 'Who we tell',
  result: 'Your starting point',
}

export function Survey({
  draft,
  step,
  setDraft,
  go,
  onExit,
  onFinish,
}: {
  draft: Answers
  step: number
  setDraft: (answers: Answers) => void
  go: (step: number) => void
  onExit: () => void
  onFinish: () => void
}) {
  const steps = surveySteps(draft)
  const index = Math.min(step, steps.length) - 1
  const current = steps[index]
  const set = (patch: Partial<Answers>) => setDraft({ ...draft, ...patch })
  const isLast = current === 'result'
  const questionCount = steps.length - 1

  let body: ReactNode
  switch (current) {
    case 'about':
      body = (
        <Question title="Let’s get to know you" help="This sets up Vitalis for you. It takes about 3 minutes.">
          <label className="field">
            <span>Your first name</span>
            <input value={draft.name} onChange={(event) => set({ name: event.target.value })} autoComplete="given-name" placeholder="e.g. Margaret" />
          </label>
          <p className="field-label" id="age-label">
            Your age
          </p>
          <Choices legend="Your age" options={AGE_OPTIONS} value={draft.age} onPick={(age) => set({ age })} />
        </Question>
      )
      break
    case 'walks':
      body = (
        <Question title="On a typical day, how many times do you go for a walk?" help="Count walks outside or around a store or mall, not moving around the house.">
          <Choices legend="Walks per day" options={WALKS_OPTIONS} value={draft.walksPerDay} onPick={(walksPerDay) => set({ walksPerDay })} />
        </Question>
      )
      break
    case 'walkMinutes':
      body = (
        <Question title="About how long is each walk?">
          <Choices legend="Minutes per walk" options={WALK_MINUTES_OPTIONS} value={draft.walkMinutes} onPick={(walkMinutes) => set({ walkMinutes })} />
        </Question>
      )
      break
    case 'exercises':
      body = (
        <Question title="Do you exercise, besides walking?" help="Classes, exercises at home, swimming, gardening: anything that gets you moving on purpose.">
          <Choices
            legend="Exercise besides walking"
            options={[
              { id: true, label: 'Yes' },
              { id: false, label: 'No, not really' },
            ]}
            value={draft.exercises}
            onPick={(exercises) => set({ exercises })}
          />
        </Question>
      )
      break
    case 'exerciseTypes':
      body = (
        <Question title="What kind of exercise?" help="Pick all that apply.">
          <div className="choices" role="group" aria-label="Kinds of exercise">
            {EXERCISE_TYPES.map((type) => {
              const on = draft.exerciseTypes.includes(type.id)
              return (
                <button
                  key={type.id}
                  type="button"
                  aria-pressed={on}
                  className="choice multi"
                  onClick={() => set({ exerciseTypes: on ? draft.exerciseTypes.filter((id) => id !== type.id) : [...draft.exerciseTypes, type.id] })}
                >
                  <span className="choice-mark" aria-hidden="true">
                    {on && <Icon name="check" size={18} />}
                  </span>
                  <span>
                    {type.label}
                    {type.hint && <span className="choice-hint">{type.hint}</span>}
                  </span>
                </button>
              )
            })}
          </div>
        </Question>
      )
      break
    case 'effort':
      body = (
        <Question title="How hard does it usually feel?" help="Try the talk test: how easy is it to talk while you exercise?">
          <Choices legend="Effort" options={EFFORT_OPTIONS} value={draft.effort} onPick={(effort) => set({ effort })} />
        </Question>
      )
      break
    case 'often':
      body = (
        <Question title="How often, and for how long?">
          <p className="field-label">How many days a week?</p>
          <Choices legend="Days per week" options={DAYS_OPTIONS} value={draft.daysPerWeek} onPick={(daysPerWeek) => set({ daysPerWeek })} />
          <p className="field-label">How long each time?</p>
          <Choices legend="Minutes per session" options={SESSION_OPTIONS} value={draft.sessionMinutes} onPick={(sessionMinutes) => set({ sessionMinutes })} />
        </Question>
      )
      break
    case 'steadi1':
    case 'steadi2':
    case 'steadi3':
      body = (
        <Question title="Is this true for you?" help="From the CDC’s “Stay Independent” checklist. There are no wrong answers.">
          <ul className="yesno-list">
            {steadiPage(current).map((item) => {
              const value = draft.steadi[item.id]
              const answer = (yes: boolean) => set({ steadi: { ...draft.steadi, [item.id]: yes } })
              return (
                <li key={item.id} className="yesno">
                  <p>{item.text}</p>
                  <div className="yesno-buttons" role="radiogroup" aria-label={item.text}>
                    <button type="button" role="radio" aria-checked={value === true} onClick={() => answer(true)}>
                      Yes
                    </button>
                    <button type="button" role="radio" aria-checked={value === false} onClick={() => answer(false)}>
                      No
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </Question>
      )
      break
    case 'contacts':
      body = (
        <Question title="Who should we tell if something changes?" help="Vitalis can alert a family member and send reports to your doctor. You choose what they see later, in Settings.">
          <label className="field">
            <span>Family member or friend</span>
            <input value={draft.familyName} onChange={(event) => set({ familyName: event.target.value })} placeholder="e.g. Sarah" />
          </label>
          <label className="field">
            <span>How are they related to you? (optional)</span>
            <input value={draft.familyRelation} onChange={(event) => set({ familyRelation: event.target.value })} placeholder="e.g. daughter" />
          </label>
          <label className="field">
            <span>Your doctor (optional)</span>
            <input value={draft.doctorName} onChange={(event) => set({ doctorName: event.target.value })} placeholder="e.g. Dr. Lee" />
          </label>
        </Question>
      )
      break
    case 'result':
      body = <Result answers={draft} />
      break
  }

  return (
    <main className="survey">
      <div className="survey-top">
        <button type="button" className="btn-ghost" onClick={() => (index === 0 ? onExit() : go(index))}>
          <Icon name="back" size={20} /> Back
        </button>
        {!isLast && (
          <span className="small muted">
            {SECTION[current]} · {index + 1} of {questionCount}
          </span>
        )}
      </div>
      {!isLast && (
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={questionCount} aria-valuenow={index} aria-label="Survey progress">
          <span style={{ width: `${(index / questionCount) * 100}%` }} />
        </div>
      )}
      {body}
      <div className="survey-next">
        {isLast ? (
          <button type="button" className="btn btn-block" onClick={onFinish}>
            Continue
          </button>
        ) : (
          <button type="button" className="btn btn-block" disabled={!stepComplete(current, draft)} onClick={() => go(index + 2)}>
            Next
          </button>
        )}
      </div>
    </main>
  )
}

function Result({ answers }: { answers: Answers }) {
  const minutes = weeklyMinutes(answers)
  const level = levelFromMinutes(minutes)
  const score = steadiScore(answers)
  const atRisk = score >= STEADI_RISK_SCORE
  return (
    <section className="question">
      <h1>Thanks, {answers.name.trim() || 'there'}. Here’s your starting point.</h1>

      <div className="card">
        <p className="overline">Activity level</p>
        <ol className="level-scale" aria-label={`Activity level: ${level.name}, step ${level.id + 1} of ${LEVELS.length}`}>
          {LEVELS.map((entry) => (
            <li key={entry.id} className={entry.id === level.id ? 'on' : entry.id < level.id ? 'below' : undefined}>
              {entry.name}
            </li>
          ))}
        </ol>
        <p>
          About <b>{minutes} active minutes a week</b>. The goal for adults over 65 is {WEEKLY_MINUTES_GOAL} <span className="source">[27]</span>.
        </p>
        <div className="meter" aria-hidden="true">
          <span style={{ width: `${Math.min(100, (minutes / WEEKLY_MINUTES_GOAL) * 100)}%` }} />
        </div>
      </div>

      <div className={`card ${atRisk ? 'card-warn' : ''}`}>
        <p className="overline">Balance checklist</p>
        <p className="stat">
          {score} <small>of {STEADI_MAX} points</small>
        </p>
        <p>
          {atRisk
            ? `A score of ${STEADI_RISK_SCORE} or more means you may be at risk of falling. It’s worth talking to your doctor. Vitalis will add this to your tips.`
            : `Under ${STEADI_RISK_SCORE} points. Good news, and Vitalis will keep watching for changes.`}{' '}
          <span className="source">[26]</span>
        </p>
      </div>

      <p className="small muted">This is a starting estimate from your answers. Once your watch is connected, Vitalis measures your activity and learns your normal over 4 weeks.</p>
    </section>
  )
}
