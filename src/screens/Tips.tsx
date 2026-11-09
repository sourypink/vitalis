import { Icon } from '../components'
import type { Ctx } from '../demo'
import { TIP_GROUPS, buildTips } from '../tips'

export function Tips({ ctx }: { ctx: Ctx }) {
  const tips = buildTips(ctx.answers, ctx.surveyLevel)
  const done = new Set(ctx.saved.doneTips)
  const toggle = (id: string) => ctx.update({ doneTips: done.has(id) ? [...done].filter((entry) => entry !== id) : [...done, id] })

  return (
    <main>
      <header className="page-head">
        <div>
          <h1>Tips for you</h1>
          <p className="muted">
            Based on your survey{ctx.assessment ? ' and this week’s watch data' : ''}. {done.size} of {tips.length} done.
          </p>
        </div>
      </header>

      {ctx.assessment && (
        <section className="card card-accent">
          <p className="overline">Today</p>
          <p className="today-tip">{ctx.assessment.recommendation}</p>
        </section>
      )}

      {TIP_GROUPS.map((group) => {
        const groupTips = tips.filter((tip) => tip.group === group.id)
        if (groupTips.length === 0) return null
        return (
          <section key={group.id} className="card">
            <h2>{group.id}</h2>
            <p className="muted">{group.intro}</p>
            <ul className="tip-list">
              {groupTips.map((tip) => {
                const isDone = done.has(tip.id)
                return (
                  <li key={tip.id} className={isDone ? 'done' : undefined}>
                    <button type="button" className="tip-check" role="checkbox" aria-checked={isDone} aria-label={`Done: ${tip.title}`} onClick={() => toggle(tip.id)}>
                      {isDone && <Icon name="check" size={20} />}
                    </button>
                    <div>
                      <b>{tip.title}</b>
                      <p>
                        {tip.why} <span className="source">{tip.source}</span>
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}

      <p className="small muted">Tips are general advice from the CDC and published studies, not a medical plan. Check with your doctor before starting new exercise.</p>
    </main>
  )
}
