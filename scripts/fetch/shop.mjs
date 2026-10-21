import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fetchBuf, fetchJson } from '../lib/http.mjs'
import { ensureDir, snapshotDir, snapshotDate, sha256Buf, writeJson } from '../lib/fs.mjs'

const INDEX = 'https://LivXue.github.io/dsh-plugin-shop/v1/index.json'
const BASE = 'https://LivXue.github.io/dsh-plugin-shop/v1/'

export async function fetchShop(date = snapshotDate()) {
  const dir = ensureDir(snapshotDir(date))
  process.stderr.write(`shop index ${INDEX}\n`)
  const index = await fetchJson(INDEX)
  writeJson(join(dir, 'shop-index.json'), index)

  const jobs = [
    ['plugins', index.plugins],
    ['stars', index.stars],
  ]
  for (const [name, spec] of jobs) {
    if (!spec?.url || !spec?.sha256) throw new Error(`shop index missing ${name}`)
    const url = new URL(spec.url, BASE).href
    process.stderr.write(`shop ${name} ${url}\n`)
    const buf = await fetchBuf(url, { timeoutMs: 300_000 })
    const sha = sha256Buf(buf)
    if (sha !== spec.sha256) {
      throw new Error(`shop ${name} sha mismatch: got ${sha} want ${spec.sha256}`)
    }
    writeFileSync(join(dir, `shop-${name}.json`), buf)
  }
  return { id: 'shop', url: INDEX, dest: join(dir, 'shop-index.json') }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchShop().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
