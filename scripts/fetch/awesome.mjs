import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { ensureDir, snapshotDir, snapshotDate } from '../lib/fs.mjs'

const URL = 'https://awesome-dsh-plugin.com/plugins.json'

export async function fetchAwesome(date = snapshotDate()) {
  const dir = ensureDir(snapshotDir(date))
  const dest = join(dir, 'awesome-plugins.json')
  process.stderr.write(`awesome-dsh-plugin ${URL}\n`)
  // Full GET with decompression. Do not mix --compressed with Range (that truncates).
  execFileSync('curl', ['-fsSL', '--compressed', '--max-time', '600', '-o', dest, URL], {
    stdio: 'inherit',
  })
  const j = JSON.parse(readFileSync(dest, 'utf8'))
  const n = Array.isArray(j) ? j.length : (j.plugins ?? []).length
  const declared = j.count ?? n
  if (n !== declared) {
    throw new Error(`awesome plugins length ${n} != count ${declared}`)
  }
  process.stderr.write(`  parsed ${n} plugins, updated ${j.updated}\n`)
  return { id: 'awesome', url: URL, dest }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchAwesome().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
