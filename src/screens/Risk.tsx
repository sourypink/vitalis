import { DecisionTree, Pose, RiskLabelCard, Switch, WhyList } from '../components'
import { ACWR_DANGER, ACWR_SWEET_HIGH, ACWR_SWEET_LOW } from '../engine/constants'
import { recipients, type Demo } from '../demo'

const ACWR_SCALE_MAX = 2 // right edge of the ACWR bar

function AcwrCard({ ratio }: { ratio: number }) {
  const percent = (value: number) => `${(Math.min(value, ACWR_SCALE_MAX) / ACWR_SCALE_MAX) * 100}%`
  const segments = [
    { to: ACWR_SWEET_LOW, colour: 'var(--line)' },
    { to: ACWR_SWEET_HIGH, colour: 'var(--green)' },
    { to: ACWR_DANGER, colour: 'var(--amber)' },
    { to: ACWR_SCALE_MAX, colour: 'var(--red)' },
  ]
  let from = 0
  return (
    <section className="card">
      <div className="card-head">
        <h3>Acute:chronic workload ratio</h3>
        <span className="tag">One feature, not the rule</span>
      </div>
      <p>
        This week’s load ÷ 4-week average: <b>{ratio.toFixed(2)}</b>
      </p>
      <div className="acwr-bar" role="img" aria-label={`ACWR ${ratio.toFixed(2)} on a scale from 0 to 2. Sweet spot 0.8 to 1.3, danger zone from 1.5.`}>
        {segments.map((segment) => {
          const width = ((segment.to - from) / ACWR_SCALE_MAX) * 100
          from = segment.to
          return <span key={segment.to} style={{ width: `${width}%`, background: segment.colour }} />
        })}
        <span className="acwr-marker" style={{ left: percent(ratio) }} />
      </div>
      <div className="acwr-scale" aria-hidden="true">
        <span>0</span>
        <span>0.8</span>
        <span>1.3 · 1.5</span>
        <span>2.0</span>
      </div>
      <p className="small">
        <b>0.8–1.3</b> “sweet spot”, <b>≥1.5</b> “danger zone” (Gabbett 2016) <span className="source">[14]</span>
      </p>
      <p className="contested">
        <b>Contested.</b> Impellizzeri et al. (2020) argue ACWR has no established causal link to injury and carries statistical artefacts{' '}
        <span className="source">[15]</span>. Vitalis uses it as one input to the tree, beside your own baseline.
      </p>
    </section>
  )
}

export function Risk({ demo }: { demo: Demo }) {
  const { assessment, mode } = demo
  const { decision } = assessment
  const subject = mode === 'athlete' ? 'Player 7' : 'Margaret'
  const movementAsked = decision.branch === 'movement'
  const to = decision.label === 'LOW' ? null : recipients(mode, demo.share)

  return (
    <main>
      <RiskLabelCard decision={decision} subject={subject} />

      <section className="card">
        <h3>Next step</h3>
        <p className="recommend">{assessment.recommendation}</p>
        <p className="small muted">
          {to ? `Sent to: ${to.join(', ')}.` : 'No alert sent on a low-risk day.'} Vitalis suggests; {mode === 'athlete' ? 'the trainer' : 'Margaret and her doctor'} decide.
        </p>
      </section>

      <section className="card">
        <h3>Why</h3>
        <WhyList why={assessment.why} />
      </section>

      <section className="card">
        <div className="card-head">
          <h3>How the decision tree labelled it</h3>
          <span className="tag">Classification</span>
        </div>
        <DecisionTree decision={decision} mode={mode} />
      </section>

      <section className="card">
        <div className="card-head">
          <h3>Movement check</h3>
          <span className="tag">CNN pose estimation</span>
        </div>
        <Pose mode={mode} risky={demo.riskyMovement && (mode === 'athlete' || demo.cameraConsent)} />
        <div className="toggle-row">
          <span>
            <b>Simulate a risky movement</b>
            <br />
            <span className="small muted">{mode === 'athlete' ? 'Left knee caves in on landing' : 'Leans far forward to stand up'}</span>
          </span>
          <Switch checked={demo.riskyMovement} onChange={demo.setRiskyMovement} label="Simulate a risky movement" />
        </div>
        {mode === 'older' && !demo.cameraConsent && (
          <p className="small">
            Home camera is off, so the movement check is skipped.{' '}
            <button type="button" className="btn-quiet" onClick={() => demo.go('privacy')}>
              Change in Privacy
            </button>
          </p>
        )}
        <p className="small muted">
          {movementAsked
            ? 'The tree asks this only when there is no big change from normal.'
            : 'Not asked today: the tree already found a big change from normal.'}{' '}
          {mode === 'athlete'
            ? 'Female athletes who later tore an ACL landed with 8° more knee angle in a 3D lab study'
            : 'A recorded skeleton, not a live camera'}
          {mode === 'athlete' && <span className="source"> [16]</span>}. Simulated: no video is analysed in this demo.
        </p>
      </section>

      {mode === 'athlete' && assessment.acwr && <AcwrCard ratio={assessment.acwr.ratio} />}

      <p className="small muted">
        Simulated demo. Baseline length and the 2 SD cut-off are our design choices; no accuracy has been measured for Vitalis. Published ML injury
        models range from AUC 0.52 to 0.87 <span className="source">[23]</span>.
      </p>

      <button type="button" className="btn next" onClick={() => demo.go('dashboard')}>
        Next: {mode === 'athlete' ? 'coach dashboard' : 'Sarah’s view'} →
      </button>
    </main>
  )
}
