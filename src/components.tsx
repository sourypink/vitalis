import type { Reason } from './engine/assess'
import { LEAF_CAPTION, LEAF_LABEL, type Decision, type Leaf, type RiskLabel } from './engine/decide'
import { Z_FLAG } from './engine/constants'
import type { Stat } from './engine/stats'

/** Colour is never alone: every badge carries its text label. */
export function RiskBadge({ label }: { label: RiskLabel }) {
  return (
    <span className={`badge risk-${label}`}>
      <span className="dot" aria-hidden="true" />
      {label}
    </span>
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

const LEAVES: Leaf[] = ['high', 'medium-recover', 'medium-movement', 'low']

/** The same tree as on the poster, with today's path drawn heavier. */
export function DecisionTree({ decision }: { decision: Decision }) {
  const left = decision.branch === 'checkin'
  const leafIndex = LEAVES.indexOf(decision.leaf)
  return (
    <div className="tree" aria-label={`Decision path: ${pathText(decision)}`}>
      <div className="tree-node on">
        <b>Walking or balance below your normal?</b>
        slower walking, stand-up test ≥12 s [17], or a fall
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
          unsteady standing up (camera opt-in)
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

// Daily steps, last 7 days, with the personal "usual" as a dashed line.
const BARS_WIDTH = 340
const BARS_HEIGHT = 160
const BARS_PAD = { top: 16, bottom: 26 }
const BAR_GAP = 10

export function StepsBars({ days, usual }: { days: { label: string; steps: number }[]; usual: number }) {
  const max = Math.max(usual, ...days.map((day) => day.steps)) * 1.1
  const innerHeight = BARS_HEIGHT - BARS_PAD.top - BARS_PAD.bottom
  const barWidth = (BARS_WIDTH - BAR_GAP * (days.length - 1)) / days.length
  const y = (steps: number) => BARS_PAD.top + (1 - steps / max) * innerHeight
  return (
    <figure style={{ margin: 0 }}>
      <svg
        className="chart"
        viewBox={`0 0 ${BARS_WIDTH} ${BARS_HEIGHT}`}
        role="img"
        aria-label={`Steps per day, last ${days.length} days: ${days.map((day) => `${day.label} ${Math.round(day.steps)}`).join(', ')}. Your usual is ${Math.round(usual)}.`}
      >
        {days.map((day, index) => {
          const x = index * (barWidth + BAR_GAP)
          const today = index === days.length - 1
          return (
            <g key={day.label + index}>
              <rect x={x} y={y(day.steps)} width={barWidth} height={y(0) - y(day.steps)} rx="6" fill={today ? 'var(--accent)' : 'var(--accent-soft)'} />
              <text x={x + barWidth / 2} y={BARS_HEIGHT - 6} fontSize="13" textAnchor="middle" fill="var(--muted)" fontWeight={today ? 700 : 400}>
                {day.label}
              </text>
            </g>
          )
        })}
        <line x1="0" x2={BARS_WIDTH} y1={y(usual)} y2={y(usual)} stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="5 4" />
      </svg>
      <figcaption className="legend">
        <span>
          <span className="swatch" style={{ background: 'var(--accent)' }} />
          Today
        </span>
        <span>
          <span className="swatch dashed" />
          Your usual ({Math.round(usual).toLocaleString('en-US')})
        </span>
      </figcaption>
    </figure>
  )
}

/** Simple line icons (24 × 24, stroke). */
export const ICONS = {
  today: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  activity: 'M3 12h4l3-7 4 14 3-7h4',
  reports: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  tips: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  watch: 'M8 6h8v12H8zM9 6l1-4h4l1 4M9 18l1 4h4l1-4M12 10v2l1 1',
  steps: 'M8 4c1.7 0 2.5 1.6 2.5 3.5S9.5 12 8 12s-2.5-2.6-2.5-4.5S6.3 4 8 4zM16 9c1.7 0 2.5 1.6 2.5 3.5S17.5 17 16 17s-2.5-2.6-2.5-4.5S14.3 9 16 9zM6 15h4v3a2 2 0 0 1-4 0zM14 20h4',
  walk: 'M13 4a1.5 1.5 0 1 0 0-.01M10 21l2-6 3 3v3M9 12l2-4h3l2 4 2 1M11 8l-2 5',
  sleep: 'M20 14A8 8 0 1 1 10 4a6.5 6.5 0 0 0 10 10z',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  check: 'M5 12l5 5 9-10',
  send: 'M4 12l16-8-6 16-2-7z',
  mic: 'M9 3h6v12H9zM5 11a7 7 0 0 0 14 0M12 18v3',
  back: 'M15 5l-7 7 7 7',
} as const

export function Icon({ name, size = 24 }: { name: keyof typeof ICONS; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  )
}
