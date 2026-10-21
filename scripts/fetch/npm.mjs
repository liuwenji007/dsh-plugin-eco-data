import { join } from 'node:path'
import { fetchJson } from '../lib/http.mjs'
import { ensureDir, snapshotDir, snapshotDate, writeJson } from '../lib/fs.mjs'

const BASE = 'https://registry.npmjs.org/-/v1/search?text=keywords:dsh-plugin'

async function searchPage(from, size, attempt = 0) {
  try {
    return await fetchJson(`${BASE}&size=${size}&from=${from}`)
  } catch (err) {
    const msg = String(err)
    if (attempt < 8 && /429|503|ECONN|abort/i.test(msg)) {
      const wait = Math.min(30_000, 1000 * 2 ** attempt)
      process.stderr.write(`  retry ${from} in ${wait}ms (${msg.slice(0, 80)})\n`)
      await new Promise(r => setTimeout(r, wait))
      return searchPage(from, size, attempt + 1)
    }
    throw err
  }
}

export async function fetchNpm(date = snapshotDate()) {
  const dir = ensureDir(snapshotDir(date))
  const size = 100
  process.stderr.write('npm keywords:dsh-plugin\n')
  const first = await searchPage(0, size)
  const total = first.total ?? (first.objects ?? []).length
  const objects = [...(first.objects ?? [])]
  for (let from = size; from < total; from += size) {
    process.stderr.write(`  from ${from}/${total}\n`)
    const body = await searchPage(from, size)
    objects.push(...(body.objects ?? []))
    if (!(body.objects ?? []).length) break
    await new Promise(r => setTimeout(r, 250))
  }
  const packages = objects.map(row => ({
    name: row.package?.name,
    version: row.package?.version,
    description: row.package?.description,
    keywords: row.package?.keywords,
    date: row.package?.date,
    links: row.package?.links,
    publisher: row.package?.publisher,
    searchScore: row.searchScore,
  }))
  writeJson(join(dir, 'npm-search.json'), {
    queriedAt: new Date().toISOString(),
    query: 'keywords:dsh-plugin',
    total,
    fetched: packages.length,
    packages,
  })
  return { id: 'npm', url: BASE, dest: join(dir, 'npm-search.json') }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchNpm().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
