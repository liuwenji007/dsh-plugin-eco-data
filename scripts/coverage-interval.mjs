#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, snapshotDate, resultsDir, ensureDir, writeJson } from './lib/fs.mjs'
import { wilsonInterval } from './lib/stats.mjs'

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/)
  const header = splitCsvLine(lines[0])
  return lines.slice(1).map(line => {
    const cells = splitCsvLine(line)
    const row = {}
    header.forEach((h, i) => { row[h] = cells[i] ?? '' })
    return row
  })
}

function splitCsvLine(line) {
  const out = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (c === '"') q = false
      else cur += c
    } else if (c === '"') q = true
    else if (c === ',') { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out
}

const date = snapshotDate()
const csvPath = join(ROOT, 'sampling', `coverage-${date}.csv`)
const rows = parseCsv(readFileSync(csvPath, 'utf8'))
const labels = rows.map(r => r.label.trim().toLowerCase())
const yes = labels.filter(x => x === '是' || x === 'yes' || x === 'y').length
const no = labels.filter(x => x === '否' || x === 'no' || x === 'n').length
const unsure = labels.filter(x => x === '不确定' || x === 'unsure' || x === '?').length
const labeled = yes + no
const interval = wilsonInterval(yes, labeled)

const out = {
  csv: csvPath,
  n: rows.length,
  yes,
  no,
  unsure,
  unlabeled: rows.length - yes - no - unsure,
  amongLabeledPluginShare: interval,
  note: 'This is the share of sampled off-catalog GitHub-topic repos that are real plugins. It is not a point estimate of catalog coverage of the whole ecosystem. Frame is the first 1000 GitHub search hits by stars, minus those already in awesome or shop.',
}

const dir = ensureDir(resultsDir(date))
writeJson(join(dir, 'F-22.json'), {
  id: 'F-22',
  title: '覆盖率抽样 Wilson 区间',
  generatedAt: new Date().toISOString(),
  numbers: out,
  evidence: labeled ? 'B' : 'C',
})
writeFileSync(join(dir, 'coverage-interval.json'), `${JSON.stringify(out, null, 2)}\n`)
console.log(JSON.stringify(out, null, 2))
if (!labeled) {
  console.error('no labels yet; fill sampling/coverage-*.csv column `label`')
  process.exitCode = 2
}
