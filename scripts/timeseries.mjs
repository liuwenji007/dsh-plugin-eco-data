#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, snapshotDate, resultsDir, ensureDir } from './lib/fs.mjs'

const REPO = 'https://github.com/awesome-dsh-plugin/awesome-dsh-plugin.git'
const SRC_PREFERRED = join(ROOT, 'sources', 'awesome-dsh-plugin')
let SRC = SRC_PREFERRED

function git(args, opts = {}) {
  return execFileSync('git', args, {
    cwd: SRC,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    ...opts,
  })
}

function ensureClone() {
  if (process.env.TIMESERIES_SRC && existsSync(join(process.env.TIMESERIES_SRC, '.git'))) {
    SRC = process.env.TIMESERIES_SRC
    return
  }
  mkdirSync(join(ROOT, 'sources'), { recursive: true })
  if (existsSync(join(SRC_PREFERRED, '.git'))) {
    SRC = SRC_PREFERRED
    if (process.env.TIMESERIES_NO_FETCH === '1') return
    try {
      execFileSync('git', ['fetch', '--all', '--prune'], { cwd: SRC, stdio: 'inherit', timeout: 120_000 })
    } catch (err) {
      process.stderr.write(`fetch failed, using local clone as-is: ${err.message}\n`)
    }
    return
  }
  execFileSync('git', ['clone', '--filter=blob:none', REPO, SRC_PREFERRED], {
    stdio: 'inherit',
    timeout: 180_000,
  })
  SRC = SRC_PREFERRED
}

function isoWeek(d) {
  const date = new Date(d)
  const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = tmp.getUTCDay() || 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7)
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function countPluginFiles(hash) {
  try {
    const raw = git(['ls-tree', '-r', '--name-only', hash, '--', 'data/plugins'])
    return raw.split('\n').filter(n => /\.(yml|yaml)$/.test(n)).length
  } catch {
    return 0
  }
}

export function runTimeseries() {
  ensureClone()
  const log = git(['log', '--format=%H %cI', '--', 'data/plugins'])
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const i = line.indexOf(' ')
      return { hash: line.slice(0, i), at: line.slice(i + 1) }
    })
    .reverse()

  const lastByWeek = new Map()
  for (const row of log) lastByWeek.set(isoWeek(row.at), row)
  const weeks = [...lastByWeek.entries()].sort(([a], [b]) => a.localeCompare(b))

  const rows = []
  let prevListed = 0
  for (const [week, { hash, at }] of weeks) {
    const listed = countPluginFiles(hash)
    rows.push({
      week,
      at,
      hash,
      listed,
      newListed: prevListed ? listed - prevListed : null,
    })
    prevListed = listed
  }

  const date = snapshotDate()
  const outDir = ensureDir(resultsDir(date))
  const csv = [
    'week,at,hash,listed,newListed',
    ...rows.map(r => [r.week, r.at, r.hash, r.listed, r.newListed].join(',')),
  ].join('\n')
  writeFileSync(join(outDir, 'timeseries-listed.csv'), `${csv}\n`)
  return rows
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = runTimeseries()
  console.log(`weeks ${rows.length} last ${JSON.stringify(rows.at(-1))}`)
}
