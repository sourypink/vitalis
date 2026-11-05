import type { Reason } from './engine/assess'
import { LEAF_CAPTION, LEAF_LABEL, type Decision, type Leaf, type Mode, type RiskLabel } from './engine/decide'
import { Z_FLAG } from './engine/constants'
import type { Stat } from './engine/stats'

const LABEL_WORD: Record<RiskLabel, string> = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' }
export const COLOUR_WORD: Record<RiskLabel, string> = { HIGH: 'red', MEDIUM: 'yellow', LOW: 'green' }

/** Colour is never alone: every badge carries its text label. */
export function RiskBadge({ label }: { label: RiskLabel }) {
  return (
    <span className={`badge risk-${label}`}>
      <span className="dot" aria-hidden="true" />
      {label}
    </span>
  )
}

function RiskIcon({ label }: { label: RiskLabel }) {
  const shape =
    label === 'HIGH' ? (
      <path d="M22 4 41 38H3z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
    ) : label === 'MEDIUM' ? (
      <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="4" />
    ) : (
      <path d="M8 23l9 9 19-20" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    )
  const mark = label === 'LOW' ? null : (
    <path d={label === 'HIGH' ? 'M22 15v11M22 31v1' : 'M15 22h14'} stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
  )
  return (
    <svg className="risk-icon" viewBox="0 0 44 44" aria-hidden="true">
      {shape}
      {mark}
    </svg>
  )
}

export function RiskLabelCard({ decision, subject }: { decision: Decision; subject: string }) {
  return (
    <div className={`risk-label risk-${decision.label}`} role="status">
      <RiskIcon label={decision.label} />
      <div>
        <div className="big">{decision.label}</div>
        <div>
          <b>
            {LABEL_WORD[decision.label]} risk ({COLOUR_WORD[decision.label]})
          </b>{' '}
          · {LEAF_CAPTION[decision.leaf]} · {subject}
        </div>
      </div>
    </div>
  )
}

export function WhyList({ why }: { why: Reason[] }) {
  return (
    <ul className="why">
      {why.map((reason) => (
        <li key={reason.text} className={reason.flagged ? 'flagged' : undefined}>
          <span className="why-mark" aria-hidden="true">
            {reason.flagged ? '!' : '·'}
          </span>
          <span>
            <span className="sr-only">{reason.flagged ? 'Flagged: ' : 'Checked: '}</span>
            {reason.text}
            {reason.source && <span className="source"> {reason.source}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

const ROOT_DETAIL: Record<Mode, string> = {
  athlete: 'Load spike, e.g. ACWR ≥1.5 [14], short sleep or low HRV',
  older: 'Slower walking or TUG ≥12 s [17], or a fall',
}
const LEAVES: Leaf[] = ['high', 'medium-recover', 'medium-movement', 'low']

/** The same tree as on the poster, with today's path drawn heavier. */
export function DecisionTree({ decision, mode }: { decision: Decision; mode: Mode }) {
  const left = decision.branch === 'checkin'
  const leafIndex = LEAVES.indexOf(decision.leaf)
  return (
    <div className="tree" aria-label={`Decision path: ${pathText(decision)}`}>
      <div className="tree-node on">
        <b>Big change from their normal?</b>
        {ROOT_DETAIL[mode]}
      </div>
      <div className="tree-link" aria-hidden="true">
        <span className={left ? 'on' : undefined}>Yes</span>
        <span className={left ? undefined : 'on'}>No</span>
      </div>
      <div className="tree-row two">
        <div className={`tree-node${left ? ' on' : ''}`}>
          <b>Worrying check-in?</b>
          pain, dizziness or fatigue words
        </div>
        <div className={`tree-node${left ? '' : ' on'}`}>
          <b>Risky movement on video?</b>
          {mode === 'athlete' ? 'knee caving in' : 'unsteady stand-up'}
        </div>
      </div>
      <div className="tree-link four" aria-hidden="true">
        {['Yes', 'No', 'Yes', 'No'].map((word, index) => (
          <span key={index} className={index === leafIndex ? 'on' : undefined}>
            {word}
          </span>
        ))}
      </div>
      <div className="tree-row four">
        {LEAVES.map((leaf) => {
          const on = leaf === decision.leaf
          return (
            <div key={leaf} className={`tree-leaf risk-${LEAF_LABEL[leaf]}${on ? ' on' : ''}`}>
              <b>{LEAF_LABEL[leaf]}</b>
              {LEAF_CAPTION[leaf]}
              {on && <div className="you-are-here">Today</div>}
            </div>
          )
        })}
      </div>
      {decision.override && (
        <p className="small" style={{ marginTop: 8 }}>
          <b>Safety rule:</b> a detected fall is always HIGH, even when the check-in is empty.
        </p>
      )}
    </div>
  )
}

function pathText(decision: Decision): string {
  const first = decision.branch === 'checkin' ? 'big change, yes; worrying check-in' : 'big change, no; risky movement'
  const answer = decision.leaf === 'high' || decision.leaf === 'medium-movement' ? 'yes' : 'no'
  return `${first}, ${answer}; ${decision.label}, ${LEAF_CAPTION[decision.leaf]}`
}

// Baseline chart: the 28-day baseline, the ±2 SD "normal" band, then the last 14 days.
const CHART_WIDTH = 340
const CHART_HEIGHT = 150
const CHART_PAD = { top: 12, right: 8, bottom: 22, left: 8 }

export function BaselineChart({
  values,
  stat,
  baselineDays,
  label,
  higherIsRisk,
}: {
  values: number[]
  stat: Stat
  baselineDays: number
  label: string
  higherIsRisk: boolean
}) {
  const bandLow = stat.mean - Z_FLAG * stat.sd
  const bandHigh = stat.mean + Z_FLAG * stat.sd
  const min = Math.min(bandLow, ...values)
  const max = Math.max(bandHigh, ...values)
  const span = max - min || 1
  const innerWidth = CHART_WIDTH - CHART_PAD.left - CHART_PAD.right
  const innerHeight = CHART_HEIGHT - CHART_PAD.top - CHART_PAD.bottom
  const x = (index: number) => CHART_PAD.left + (index / (values.length - 1)) * innerWidth
  const y = (value: number) => CHART_PAD.top + (1 - (value - min) / span) * innerHeight
  const flagged = (value: number) => (higherIsRisk ? value >= bandHigh : value <= bandLow)
  const splitX = (x(baselineDays - 1) + x(baselineDays)) / 2
  const line = values.map((value, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)} ${y(value).toFixed(1)}`).join('')
  const today = values[values.length - 1]
  return (
    <figure style={{ margin: 0 }}>
      <svg
        className="chart"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label={`${label}: ${baselineDays}-day baseline with a shaded normal band, then the last ${values.length - baselineDays} days. Today is ${flagged(today) ? 'outside' : 'inside'} the band.`}
      >
        <rect x={CHART_PAD.left} y={y(bandHigh)} width={innerWidth} height={y(bandLow) - y(bandHigh)} fill="var(--green-tint)" />
        <line x1={splitX} x2={splitX} y1={CHART_PAD.top} y2={CHART_HEIGHT - CHART_PAD.bottom} stroke="var(--line-2)" strokeDasharray="4 4" />
        <path d={line} fill="none" stroke="var(--muted)" strokeWidth="2" />
        {values.map((value, index) => (
          <circle
            key={index}
            cx={x(index)}
            cy={y(value)}
            r={index === values.length - 1 ? 5 : 3}
            fill={flagged(value) ? 'var(--red)' : index >= baselineDays ? 'var(--accent)' : 'var(--line-2)'}
          />
        ))}
        <text x={CHART_PAD.left} y={CHART_HEIGHT - 6} fontSize="12" fill="var(--muted)">
          {baselineDays}-day baseline
        </text>
        <text x={CHART_WIDTH - CHART_PAD.right} y={CHART_HEIGHT - 6} fontSize="12" fill="var(--muted)" textAnchor="end">
          last {values.length - baselineDays} days → today
        </text>
      </svg>
      <figcaption className="legend">
        <span>
          <span className="swatch" style={{ background: 'var(--green-tint)', border: '1px solid var(--green)' }} />
          Normal band (±{Z_FLAG} SD)
        </span>
        <span>
          <span className="swatch" style={{ background: 'var(--red)' }} />
          Outside it (flagged)
        </span>
      </figcaption>
    </figure>
  )
}

/** Recorded pose skeletons from the poster (simulated; no camera is used). */
export function Pose({ mode, risky }: { mode: Mode; risky: boolean }) {
  if (mode === 'athlete') {
    return (
      <svg className="pose" viewBox="0 0 400 220" role="img" aria-label={risky ? 'Pose skeleton of an athlete landing with the left knee caving inward' : 'Pose skeleton of an athlete landing with knees in line'}>
        <text x="14" y="28" fontSize="18" fill="#E6EBF0">Athlete · jump landing</text>
        <text x="386" y="28" textAnchor="end" fontSize="18" fontWeight="700" fill={risky ? '#F49A90' : '#9FD8A4'}>
          {risky ? '1 risk flagged' : 'No risk flagged'}
        </text>
        <path d="M130 204h140" stroke="#5B6875" strokeWidth="2" />
        <g stroke="#8EC5F0" strokeWidth="3" strokeLinecap="round" fill="none">
          <circle cx="200" cy="54" r="14" />
          <path d="M200 68v52M174 80h52M174 80l-14 24-8 22M226 80l14 24 8 22M186 120h28M214 120l4 40 4 40" />
          {!risky && <path d="M186 120l-4 40-4 40" />}
        </g>
        {risky && (
          <>
            <path d="M186 120l-4 80" stroke="#F49A90" strokeWidth="1.5" strokeDasharray="4 4" />
            <path d="M186 120l12 40-18 40" stroke="#F06A5E" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <circle cx="198" cy="160" r="7" fill="#F06A5E" />
          </>
        )}
        <g fill="#FFFFFF">
          {[[174, 80], [226, 80], [160, 104], [240, 104], [186, 120], [214, 120], [218, 160], [222, 200], [risky ? 180 : 178, 200]].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4" />
          ))}
          {!risky && <circle cx="182" cy="160" r="4" />}
        </g>
      </svg>
    )
  }
  return (
    <svg className="pose" viewBox="0 0 400 220" role="img" aria-label={risky ? 'Pose skeleton of an older adult leaning far forward and pushing off a chair to stand' : 'Pose skeleton of an older adult standing up from a chair steadily'}>
      <text x="14" y="28" fontSize="18" fill="#E6EBF0">Older adult · standing up</text>
      <text x="386" y="28" textAnchor="end" fontSize="18" fontWeight="700" fill={risky ? '#F2C94C' : '#9FD8A4'}>
        {risky ? '1 change flagged' : 'No change flagged'}
      </text>
      <path d="M120 204h160" stroke="#5B6875" strokeWidth="2" />
      <g stroke="#8A96A3" strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M146 84v120M146 146h52M196 146v58" />
      </g>
      {risky ? (
        <>
          <path d="M200 146v-70" stroke="#F2C94C" strokeWidth="1.5" strokeDasharray="4 4" />
          <path d="M200 106a40 40 0 0 1 22 -6" stroke="#F2C94C" strokeWidth="1.5" fill="none" />
          <g stroke="#8EC5F0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <circle cx="244" cy="64" r="13" />
            <path d="M200 146l34 10 2 46M234 90l-18 28-14 22" />
          </g>
          <path d="M200 146l34 -56" stroke="#F2C94C" strokeWidth="5" strokeLinecap="round" />
          <g fill="#FFFFFF">
            {[[234, 90], [216, 118], [202, 140], [234, 156], [236, 202]].map(([cx, cy]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4" />
            ))}
          </g>
          <circle cx="200" cy="146" r="7" fill="#F2C94C" />
        </>
      ) : (
        <>
          <g stroke="#8EC5F0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <circle cx="222" cy="52" r="13" />
            <path d="M216 66l-6 64M210 130l14 30 0 42M214 80l-14 30M214 80l12 30" />
          </g>
          <g fill="#FFFFFF">
            {[[214, 80], [210, 130], [224, 160], [224, 202], [200, 110], [226, 110]].map(([cx, cy]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4" />
            ))}
          </g>
        </>
      )}
    </svg>
  )
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (on: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      className="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  )
}
