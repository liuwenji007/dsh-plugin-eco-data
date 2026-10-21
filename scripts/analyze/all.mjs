import { computeAll, writeFindings } from './compute.mjs'
import { snapshotDate } from '../lib/fs.mjs'

const date = snapshotDate()
const metrics = computeAll(date)
writeFindings(metrics, date)
console.log(JSON.stringify({
  date,
  awesome: metrics.scale.awesomeCount,
  shop: metrics.scale.shopCount,
  github: metrics.scale.githubTotal,
  npm: metrics.scale.npmTotal,
  scannedPct: metrics.trust.scannedPct,
}, null, 2))
