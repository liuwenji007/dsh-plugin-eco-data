import { join } from 'node:path'
import { writeFileSync } from 'node:fs'
import { snapshotDate, snapshotDir, resultsDir, ensureDir } from '../lib/fs.mjs'
import { loadAwesome } from '../lib/catalog.mjs'

function isoWeek(d) {
  const date = new Date(`${d.slice(0, 10)}T00:00:00Z`)
  const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = tmp.getUTCDay() || 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7)
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

const date = snapshotDate()
const { plugins, updated } = loadAwesome(join(snapshotDir(date), 'awesome-plugins.json'))
const byWeek = new Map()
for (const p of plugins) {
  if (!p.added) continue
  const w = isoWeek(p.added)
  byWeek.set(w, (byWeek.get(w) || 0) + 1)
}
const weeks = [...byWeek.entries()].sort(([a], [b]) => a.localeCompare(b))
let cum = 0
const rows = weeks.map(([week, added]) => {
  cum += added
  return { week, added, cumulative: cum }
})

const dir = ensureDir(resultsDir(date))
const csv = ['week,added,cumulative', ...rows.map(r => `${r.week},${r.added},${r.cumulative}`)].join('\n')
writeFileSync(join(dir, 'growth-from-added.csv'), `${csv}\n`)
writeFileSync(join(dir, 'F-21.json'), `${JSON.stringify({
  id: 'F-21',
  title: '目录按 added 的周增长',
  generatedAt: new Date().toISOString(),
  evidence: 'A',
  numbers: {
    source: 'awesome plugins[].added',
    catalogUpdated: updated,
    n: plugins.length,
    missingAdded: plugins.filter(p => !p.added).length,
    rows,
  },
  note: 'added 是目录收录日期，不是 git 活跃。W42 一周 1,462 条像是集中补录。',
}, null, 2)}\n`)
console.log(csv)
