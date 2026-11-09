// The poster's decision tree:
//   Big change from their normal?
//     yes → Worrying check-in?   yes → HIGH (act today)        no → MEDIUM (watch and recover)
//     no  → Risky movement?      yes → MEDIUM (fix the movement) no → LOW (normal day)

export type RiskLabel = 'HIGH' | 'MEDIUM' | 'LOW'
export type Leaf = 'high' | 'medium-recover' | 'medium-movement' | 'low'

export type Features = {
  /** Load or gait anomaly: any flagged change from the personal baseline. */
  anomaly: boolean
  worryingCheckIn: boolean
  /** Simulated pose result. Never true without video consent. */
  riskyMovement: boolean
  /** A detected hard fall is always HIGH, even with no check-in (safety override). */
  fallDetected?: boolean
}

export type Decision = {
  label: RiskLabel
  leaf: Leaf
  /** Which second-level question was asked. */
  branch: 'checkin' | 'movement'
  /** True when the fall override set HIGH and the tree alone would not have. */
  override: boolean
}

export const LEAF_LABEL: Record<Leaf, RiskLabel> = {
  high: 'HIGH',
  'medium-recover': 'MEDIUM',
  'medium-movement': 'MEDIUM',
  low: 'LOW',
}

export const LEAF_CAPTION: Record<Leaf, string> = {
  high: 'act today',
  'medium-recover': 'watch and recover',
  'medium-movement': 'fix the movement',
  low: 'normal day',
}

export function decide(features: Features): Decision {
  const anomaly = features.anomaly || Boolean(features.fallDetected)
  if (anomaly) {
    const treeLeaf: Leaf = features.worryingCheckIn ? 'high' : 'medium-recover'
    const override = Boolean(features.fallDetected) && treeLeaf !== 'high'
    const leaf: Leaf = override ? 'high' : treeLeaf
    return { label: LEAF_LABEL[leaf], leaf, branch: 'checkin', override }
  }
  const leaf: Leaf = features.riskyMovement ? 'medium-movement' : 'low'
  return { label: LEAF_LABEL[leaf], leaf, branch: 'movement', override: false }
}

export type RecommendContext = { leaf?: Leaf; fallDetected?: boolean }

/** One plain-language next step for the older adult. Exercise cuts falls 23% [21]. */
export function recommend(label: RiskLabel, context: RecommendContext = {}): string {
  if (context.fallDetected) return 'Stay where you are if you are hurt. Your family contact is being alerted, then emergency services.'
  if (label === 'HIGH') return 'Call your doctor today, and avoid walking alone until you have been checked.'
  if (label === 'MEDIUM' && context.leaf === 'medium-movement') return 'Do your sit-to-stand practice today and use the chair arms to stand up.'
  if (label === 'MEDIUM') return 'Do your balance exercises today, and consider a doctor visit about the slower walking.'
  return 'Normal day. Keep up your balance exercises and a daily walk.'
}
