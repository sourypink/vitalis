/** mulberry32: a small deterministic PRNG, so the demo looks the same every time. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let mixed = state
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

/** Standard normal draw (Box–Muller). */
export function gaussian(random: () => number): number {
  const u = 1 - random() // (0, 1], avoids log(0)
  const v = random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/** Normal draw with mean and SD, clamped to ±limit SDs. */
export function normal(random: () => number, mean: number, sd: number, limit = Infinity): number {
  const z = Math.max(-limit, Math.min(limit, gaussian(random)))
  return mean + z * sd
}
