import type { Mode } from '../engine/decide'

export function Start({ onPick }: { onPick: (mode: Mode) => void }) {
  return (
    <main>
      <section className="hero" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p className="kicker">AI solution proposal · BTE 371</p>
        <h1>Vitalis</h1>
        <p className="lead">
          Vitalis learns your normal from a wearable, flags big changes early, and tells the right person what to do next.
        </p>
      </section>

      <div className="loop" aria-label="The Vitalis loop">
        <span>Wearable data</span>
        <span className="arrow" aria-hidden="true">→</span>
        <span>Your baseline</span>
        <span className="arrow" aria-hidden="true">→</span>
        <span>Risk + reason</span>
        <span className="arrow" aria-hidden="true">→</span>
        <span>Next step</span>
        <span className="arrow" aria-hidden="true">→</span>
        <span>Right person told</span>
      </div>

      <h2>Pick a mode</h2>
      <button type="button" className="mode-pick athlete" onClick={() => onPick('athlete')}>
        <b>Athlete mode</b>
        <span>Player 7, a college athlete. Load, sleep and check-ins → injury risk for her and her trainer.</span>
      </button>
      <button type="button" className="mode-pick older" onClick={() => onPick('older')}>
        <b>Older adult mode</b>
        <span>Margaret, 78, lives alone. Walking speed, balance tests and falls → fall risk for her and her daughter Sarah.</span>
      </button>

      <p className="small muted">
        About 60 seconds: switch scenarios at the top and watch the label, the reasons and the alerts change. Every number is simulated. Nothing is
        sent anywhere. Not medical advice, and no accuracy has been measured for Vitalis.
      </p>
    </main>
  )
}
