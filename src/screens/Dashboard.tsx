import { useMemo, useState } from 'react'
import { COLOUR_WORD, RiskBadge, WhyList } from '../components'
import { assessAthlete } from '../engine/assess'
import type { RiskLabel } from '../engine/decide'
import { DEMO_ATHLETE_ID, buildRoster, type AthleteScenario } from '../data/people'
import type { Demo } from '../demo'

const RISK_ORDER: Record<RiskLabel, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }

function Coach({ demo }: { demo: Demo }) {
  const [open, setOpen] = useState<number | null>(DEMO_ATHLETE_ID)
  const roster = useMemo(() => {
    const players = buildRoster(demo.scenario as AthleteScenario, demo.checkIn, demo.riskyMovement)
    return players
      .map((player) => ({ player, result: assessAthlete(player) }))
      .sort((a, b) => RISK_ORDER[a.result.decision.label] - RISK_ORDER[b.result.decision.label] || a.player.id - b.player.id)
  }, [demo.scenario, demo.checkIn, demo.riskyMovement])

  const tally = { LOW: 0, MEDIUM: 0, HIGH: 0 }
  for (const { result } of roster) tally[result.decision.label]++
  const coachSeesLabel = demo.share.label.coach
  const coachSeesDetails = demo.share.details.coach

  return (
    <main>
      <section className="card">
        <div className="card-head">
          <h2>Coach dashboard · Today</h2>
          <span className="tag">Decision support</span>
        </div>
        <p className="muted">
          {roster.length} players · {tally.LOW} green · {tally.MEDIUM} yellow · {tally.HIGH} red. Sorted by risk. Tap a player for the detail.
        </p>
        <ul className="roster">
          {roster.map(({ player, result }) => {
            const isYou = player.id === DEMO_ATHLETE_ID
            const hidden = isYou && !coachSeesLabel
            const detailsHidden = isYou && !coachSeesDetails
            const flagged = result.why.filter((reason) => reason.flagged).map((reason) => reason.short)
            const expanded = open === player.id
            return (
              <li key={player.id}>
                <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : player.id)}>
                  {hidden ? <span className="badge">HIDDEN</span> : <RiskBadge label={result.decision.label} />}
                  <span className="name">{player.name}</span>
                  {isYou && <span className="you">YOU</span>}
                  <span className="short">{hidden || detailsHidden ? 'details private' : flagged.join(', ') || 'normal: full training'}</span>
                </button>
                {expanded && (
                  <div className="player-detail">
                    {hidden ? (
                      <p>Player 7 has not shared her risk colour with the coach. The athletic trainer still sees it.</p>
                    ) : (
                      <>
                        <p>
                          <b>
                            {player.name} · {result.decision.label} ({COLOUR_WORD[result.decision.label]})
                          </b>
                        </p>
                        {detailsHidden ? (
                          <p className="muted">Reasons and check-in text are private to Player 7 and her trainer (Privacy settings).</p>
                        ) : (
                          <>
                            <WhyList why={result.why} />
                            {player.checkIn && <p className="small muted">Check-in: “{player.checkIn}”</p>}
                          </>
                        )}
                        <p className="recommend">{result.recommendation}</p>
                      </>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>
      <p className="fair-use">No scholarship, playing-time or roster decisions from this score. The trainer decides.</p>
      <p className="small muted">Other players’ data and sharing settings are simulated. Player 7 follows the scenario at the top.</p>
      <button type="button" className="btn next" onClick={() => demo.go('alerts')}>
        Next: notifications →
      </button>
    </main>
  )
}

function Family({ demo }: { demo: Demo }) {
  const { assessment } = demo
  const label = assessment.decision.label
  const seesLabel = demo.share.label.sarah
  const seesDetails = demo.share.details.sarah
  const flagged = assessment.why.filter((reason) => reason.flagged)
  const summary = flagged.length > 0 ? flagged.map((reason) => reason.text).join('. ') : 'Walking, balance and check-ins look like her normal'

  return (
    <main>
      <div className="phone family-phone" aria-label="Sarah’s phone (simulated)">
        <span className="phone-notch" aria-hidden="true" />
        <div className="phone-screen">
          <span className="overline">Sarah’s phone · Vitalis</span>
          {seesLabel ? (
            <>
              <h3>Mom’s fall risk: {label.toLowerCase()}</h3>
              <RiskBadge label={label} />
              {seesDetails ? <p>{summary}.</p> : <p className="muted">Margaret keeps the reasons private.</p>}
              <p className="recommend">{assessment.recommendation}</p>
            </>
          ) : (
            <p>Margaret has not shared her fall risk with you.</p>
          )}
        </div>
        <button type="button" className="btn" onClick={() => demo.notify('Call Mom (mock)', 'Demo: no call is placed.', ['Sarah (daughter)'])}>
          Call Mom
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => demo.notify('Shared with her doctor (mock)', `Fall-risk summary: ${label}. Demo: nothing is sent.`, ['her doctor'])}
        >
          Share with her doctor
        </button>
      </div>
      <p className="small muted">
        Exercise cuts the rate of falls by 23% (59 trials) <span className="source">[21]</span>. Vitalis’ job is to get the exercise done before the fall.
      </p>
      <button type="button" className="btn next" onClick={() => demo.go('alerts')}>
        Next: notifications →
      </button>
    </main>
  )
}

export function Dashboard({ demo }: { demo: Demo }) {
  return demo.mode === 'athlete' ? <Coach demo={demo} /> : <Family demo={demo} />
}
