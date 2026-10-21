export function percentile(sorted, p) {
  if (!sorted.length) return null
  const i = (sorted.length - 1) * p
  const lo = Math.floor(i)
  const hi = Math.ceil(i)
  if (lo === hi) return sorted[lo]
  return sorted[lo] * (hi - i) + sorted[hi] * (i - lo)
}

export function median(values) {
  const s = [...values].sort((a, b) => a - b)
  return percentile(s, 0.5)
}

export function spearman(xs, ys) {
  if (xs.length !== ys.length || xs.length < 2) return null
  const rx = ranks(xs)
  const ry = ranks(ys)
  const n = xs.length
  let num = 0
  let dx = 0
  let dy = 0
  const mx = mean(rx)
  const my = mean(ry)
  for (let i = 0; i < n; i++) {
    const a = rx[i] - mx
    const b = ry[i] - my
    num += a * b
    dx += a * a
    dy += b * b
  }
  if (dx === 0 || dy === 0) return null
  return num / Math.sqrt(dx * dy)
}

function ranks(values) {
  const idx = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0])
  const out = Array(values.length)
  for (let i = 0; i < idx.length; ) {
    let j = i
    while (j < idx.length && idx[j][0] === idx[i][0]) j++
    const avg = (i + j - 1) / 2 + 1
    for (let k = i; k < j; k++) out[idx[k][1]] = avg
    i = j
  }
  return out
}

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

export function wilsonInterval(successes, n, z = 1.96) {
  if (n <= 0) return null
  const p = successes / n
  const z2 = z * z
  const denom = 1 + z2 / n
  const centre = p + z2 / (2 * n)
  const adj = z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)
  return {
    n,
    successes,
    p,
    low: Math.max(0, (centre - adj) / denom),
    high: Math.min(1, (centre + adj) / denom),
  }
}

export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a += 0x6D2B79F5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pickRandom(items, n, seed) {
  const copy = items.slice()
  const rand = mulberry32(seed)
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}
