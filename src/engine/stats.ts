import {
  ACWR_DANGER,
  ACWR_SWEET_HIGH,
  ACWR_SWEET_LOW,
  BASELINE_DAYS,
  Z_FLAG,
} from './constants'

export type Stat = { mean: number; sd: number }
export type Baseline<K extends string> = Record<K, Stat>

export function mean(values: number[]): number {
  if (values.length === 0) throw new Error('mean() needs at least one value')
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/** Sample standard deviation (n − 1). */
export function sd(values: number[]): number {
  if (values.length < 2) throw new Error('sd() needs at least two values')
  const average = mean(values)
  return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1))
}

/** Mean and SD per metric over the last `days` records of one person's series. */
export function baseline<K extends string>(series: Record<K, number>[], days = BASELINE_DAYS): Baseline<K> {
  if (series.length < days) throw new Error(`baseline() needs ${days} days, got ${series.length}`)
  const window = series.slice(-days)
  const metrics = Object.keys(window[0]) as K[]
  const result = {} as Baseline<K>
  for (const metric of metrics) {
    const values = window.map((day) => day[metric])
    result[metric] = { mean: mean(values), sd: sd(values) }
  }
  return result
}

/** How many SDs today sits from the baseline mean; flagged when |z| >= Z_FLAG. */
export function zScore(today: number, stat: Stat): { z: number; flagged: boolean } {
  const z = stat.sd === 0 ? (today === stat.mean ? 0 : Math.sign(today - stat.mean) * Infinity) : (today - stat.mean) / stat.sd
  return { z, flagged: Math.abs(z) >= Z_FLAG }
}

/** Acute:chronic workload ratio: mean of the 7-day window over mean of the 28-day window. Gabbett 2016 [14]. */
export function acwr(load7d: number[], load28d: number[]): number {
  const chronic = mean(load28d)
  if (chronic === 0) throw new Error('acwr() chronic load is zero')
  return mean(load7d) / chronic
}

export type AcwrBand = 'under' | 'sweet' | 'caution' | 'danger'

/** Gabbett 2016 bands [14]: < 0.8 under-loaded, 0.8–1.3 sweet spot, 1.3–1.5 caution, >= 1.5 danger. */
export function acwrBand(ratio: number): AcwrBand {
  if (ratio >= ACWR_DANGER) return 'danger'
  if (ratio > ACWR_SWEET_HIGH) return 'caution'
  if (ratio >= ACWR_SWEET_LOW) return 'sweet'
  return 'under'
}
