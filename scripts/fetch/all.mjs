import { join } from 'node:path'
import { writeFileSync } from 'node:fs'
import { snapshotDate, snapshotDir, fileMeta, ensureDir } from '../lib/fs.mjs'
import { fetchAwesome } from './awesome.mjs'
import { fetchShop } from './shop.mjs'
import { fetchGithub } from './github.mjs'
import { fetchNpm } from './npm.mjs'

const FILES = [
  'awesome-plugins.json',
  'shop-index.json',
  'shop-plugins.json',
  'github-topic-search.json',
  'npm-search.json',
]

function rel(path) {
  return path.replace(`${process.cwd()}/`, '')
}

export async function fetchAll(date = snapshotDate()) {
  const dir = ensureDir(snapshotDir(date))
  const started = new Date().toISOString()
  const results = []
  const jobs = [
    ['awesome', fetchAwesome],
    ['shop', fetchShop],
    ['github', fetchGithub],
    ['npm', fetchNpm],
  ]
  for (const [name, fn] of jobs) {
    const t0 = Date.now()
    try {
      const r = await fn(date)
      results.push({ name, ok: true, ms: Date.now() - t0, ...r })
    } catch (err) {
      results.push({ name, ok: false, ms: Date.now() - t0, error: String(err?.stack ?? err) })
      process.stderr.write(`FAIL ${name}: ${err}\n`)
    }
  }

  const files = []
  for (const name of FILES) {
    const meta = fileMeta(join(dir, name))
    if (meta) files.push({ name, bytes: meta.bytes, sha256: meta.sha256, mtime: meta.mtime })
  }

  const md = [
    `# Snapshot ${date}`,
    '',
    `- started: ${started}`,
    `- finished: ${new Date().toISOString()}`,
    `- dir: snapshots/${date}/`,
    '',
    '## Jobs',
    '',
    '| source | ok | ms | notes |',
    '|---|---|---|---|',
    ...results.map(r => `| ${r.name} | ${r.ok ? 'yes' : 'NO'} | ${r.ms} | ${(r.error ?? r.url ?? '').replace(/\|/g, '/').slice(0, 120)} |`),
    '',
    '## Files',
    '',
    '| file | bytes | sha256 |',
    '|---|---|---|',
    ...files.map(f => `| ${f.name} | ${f.bytes} | \`${f.sha256}\` |`),
    '',
    '原始 JSON 默认不入库。要复现某一周的数字，需要 sha256 与上表一致的本地快照。',
    '',
  ].join('\n')
  writeFileSync(join(dir, 'MANIFEST.md'), `${md}\n`)
  console.log(`wrote ${rel(join(dir, 'MANIFEST.md'))}`)
  if (results.some(r => !r.ok)) process.exitCode = 1
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchAll().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
