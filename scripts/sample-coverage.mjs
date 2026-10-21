#!/usr/bin/env node
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { snapshotDate, snapshotDir, readJson, repoRootFromUrl, ROOT } from './lib/fs.mjs'
import { loadAwesome, loadShop, pluginKey, uniqueRepos } from './lib/catalog.mjs'
import { pickRandom } from './lib/stats.mjs'

const SEED = 20261020
const N = 100

function ghContents(fullName, path) {
  try {
    const raw = execFileSync('gh', ['api', `repos/${fullName}/contents/${path}`], {
      encoding: 'utf8',
      timeout: 20_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const j = JSON.parse(raw)
    if (j.encoding === 'base64' && j.content) {
      return Buffer.from(j.content.replace(/\n/g, ''), 'base64').toString('utf8')
    }
    return j.type ? `(${j.type})` : ''
  } catch {
    return null
  }
}

export function buildFrame(date = snapshotDate()) {
  const dir = snapshotDir(date)
  const awesome = loadAwesome(join(dir, 'awesome-plugins.json'))
  const shop = loadShop(join(dir, 'shop-plugins.json'))
  const github = readJson(join(dir, 'github-topic-search.json'))
  const awesomeSet = uniqueRepos(awesome.plugins)
  const shopSet = new Set()
  for (const p of shop.plugins) {
    const root = (repoRootFromUrl(p.repository?.url || p.repository || pluginKey(p)) || '').toLowerCase()
    if (root) shopSet.add(root)
  }
  const frame = (github.items ?? []).filter(r => {
    const key = String(r.full_name ?? '').toLowerCase()
    return key && !awesomeSet.has(key) && !shopSet.has(key)
  })
  return { frame, githubTotal: github.total_count, fetched: (github.items ?? []).length, awesomeN: awesome.plugins.length, shopN: shop.plugins.length }
}

export function sampleCoverage({ prefetch = false, date = snapshotDate() } = {}) {
  const { frame, githubTotal, fetched } = buildFrame(date)
  const sample = pickRandom(frame, N, SEED)
  const rows = sample.map((r, i) => {
    let hasDshField = ''
    let hasCordis = ''
    let readmeMentionsDsh = ''
    if (prefetch) {
      process.stderr.write(`prefetch ${i + 1}/${sample.length} ${r.full_name}\n`)
      const pkg = ghContents(r.full_name, 'package.json')
      if (pkg == null) hasDshField = 'missing'
      else {
        try {
          const j = JSON.parse(pkg)
          hasDshField = j.dsh ? 'yes' : 'no'
        } catch { hasDshField = 'unreadable' }
      }
      const cordis = ghContents(r.full_name, 'cordis.patch.yml')
      hasCordis = cordis == null ? 'no' : 'yes'
      const readme = ghContents(r.full_name, 'README.md') || ghContents(r.full_name, 'README.zh.md') || ''
      readmeMentionsDsh = /dsh|deepseek\s*harness/i.test(readme) ? 'yes' : (readme ? 'no' : 'missing')
    }
    return {
      i: i + 1,
      full_name: r.full_name,
      html_url: r.html_url,
      stars: r.stargazers_count,
      description: (r.description ?? '').replace(/[\r\n]+/g, ' ').slice(0, 180),
      has_dsh_field: hasDshField,
      has_cordis_patch: hasCordis,
      readme_mentions_dsh: readmeMentionsDsh,
      label: '',
      notes: '',
    }
  })
  const header = [
    'i', 'full_name', 'html_url', 'stars', 'description',
    'has_dsh_field', 'has_cordis_patch', 'readme_mentions_dsh',
    'label', 'notes',
  ]
  const csv = [
    header.join(','),
    ...rows.map(r => header.map(k => csvCell(r[k])).join(',')),
  ].join('\n')
  const dest = join(ROOT, 'sampling', `coverage-${date}.csv`)
  writeFileSync(dest, `${csv}\n`)
  writeFileSync(join(ROOT, 'sampling', `coverage-${date}.meta.json`), `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    seed: SEED,
    n: N,
    frameSize: frame.length,
    githubTotal,
    githubFetched: fetched,
    note: 'GitHub search API only returns the first 1000 by stars, so the frame is high-star biased.',
    prefetch,
  }, null, 2)}\n`)
  return dest
}

function csvCell(v) {
  const s = v == null ? '' : String(v)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const prefetch = process.argv.includes('--prefetch')
  const dest = sampleCoverage({ prefetch })
  console.log(dest)
}
