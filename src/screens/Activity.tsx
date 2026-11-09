import { BaselineChart, StepsBars } from '../components'
import type { Ctx } from '../demo'
import { BASELINE_DAYS, TUG_RISK_SECONDS } from '../engine/constants'
import { mean } from '../engine/stats'
import { LEVELS, WEEKLY_MINUTES_GOAL, levelFromSteps, type Level } from '../survey'

const WEEK = 7
const DAY_MS = 86_400_000

function LevelScale({ level }: { level: Level }) {
  return (
    <ol className="level-scale" aria-label={`Activity level: ${level.name}, step ${level.id + 1} of ${LEVELS.length}`}>
      {LEVELS.map((entry) => (
        <li key={entry.id} className={entry.id === level.id ? 'on' : entry.id < level.id ? 'below' : undefined}>
          {entry.name}
        </li>
      ))}
    </ol>
  )
}

export function Activity({ ctx }: { ctx: Ctx }) {
  const { history, assessment, surveyLevel } = ctx
  const minutesPercent = Math.min(100, (ctx.weeklyMinutes / WEEKLY_MINUTES_GOAL) * 100)

  const header = (
    <header className="page-head">
      <h1>Activity</h1>
    </header>
  )

  if (!history || !assessment) {
    return (
      <main>
        {header}
        <section className="card">
          <p className="overline">From your survey</p>
          <h2>{surveyLevel.name}</h2>
          <LevelScale level={surveyLevel} />
          <p>{surveyLevel.description}.</p>
        </section>
        <section className="card card-accent">
          <h2>Connect a watch to measure your activity</h2>
          <button type="button" className="btn" onClick={() => ctx.go('connect')}>
            Connect a watch
          </button>
        </section>
      </main>
    )
  }

  const lastWeek = history.slice(-WEEK)
  const previousWeek = history.slice(-2 * WEEK, -WEEK)
  const weekSteps = mean(lastWeek.map((day) => day.steps))
  const change = Math.round((weekSteps / mean(previousWeek.map((day) => day.steps)) - 1) * 100)
  const measured = levelFromSteps(weekSteps)
  const days = lastWeek.map((day, index) => ({
    label: index === WEEK - 1 ? 'Today' : new Date(Date.now() - (WEEK - 1 - index) * DAY_MS).toLocaleDateString('en-US', { weekday: 'short' }),
    steps: day.steps,
  }))

  return (
    <main>
      {header}

      <section className="card">
        <p className="overline">Your activity level this week</p>
        <h2>{measured.name}</h2>
        <LevelScale level={measured} />
        <p>
          <b>{Math.round(weekSteps).toLocaleString('en-US')} steps a day</b> on average, {change === 0 ? 'the same as' : `${Math.abs(change)}% ${change > 0 ? 'more than' : 'fewer than'}`} last
          week. <span className="source">[28]</span>
        </p>
        {measured.id < surveyLevel.id && <p className="note-warn">That’s lower than the “{surveyLevel.name}” you described in your survey.</p>}
      </section>

      <section className="card">
        <h2>Steps, last 7 days</h2>
        <StepsBars days={days} usual={assessment.baseline.steps.mean} />
      </section>

      <section className="card">
        <h2>Active minutes</h2>
        <p>
          About <b>{ctx.weeklyMinutes} active minutes</b> a week, from your survey{ctx.weeklyMinutes >= WEEKLY_MINUTES_GOAL ? ': over the goal' : ''}. The goal for adults over 65 is 150 minutes of moderate activity, plus balance and strength work{' '}
          <span className="source">[27]</span>.
        </p>
        <div className="meter" role="img" aria-label={`${Math.round(minutesPercent)}% of the weekly goal`}>
          <span style={{ width: `${minutesPercent}%` }} />
        </div>
      </section>

      <section className="card">
        <h2>Walking speed</h2>
        <p className="muted">Walking that slows over days or weeks is a sign that fall risk is building. The green band is your normal.</p>
        <BaselineChart values={history.map((day) => day.walkingSpeed)} stat={assessment.baseline.walkingSpeed} baselineDays={BASELINE_DAYS} label="Daily walking speed" higherIsRisk={false} />
      </section>

      <section className="card">
        <h2>Weekly stand-up-and-walk test</h2>
        <p className="muted">Stand up from a chair, walk 3 meters, turn, walk back and sit down. Your phone times it. {TUG_RISK_SECONDS} seconds or more means a higher fall risk <span className="source">[17]</span>.</p>
        <ol className="tug-list">
          {ctx.tug.map((seconds, index) => (
            <li key={index} className={seconds >= TUG_RISK_SECONDS ? 'flagged' : undefined}>
              <span>{index === ctx.tug.length - 1 ? 'This week' : `${ctx.tug.length - 1 - index} wk ago`}</span>
              <span className="tug-bar">
                <span style={{ width: `${Math.min(100, (seconds / (TUG_RISK_SECONDS * 1.25)) * 100)}%` }} />
              </span>
              <b>{seconds.toFixed(1)} s</b>
            </li>
          ))}
        </ol>
      </section>
    </main>
  )
}
