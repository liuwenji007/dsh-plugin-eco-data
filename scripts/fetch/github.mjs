import { join } from 'node:path'
import { ghJson } from '../lib/http.mjs'
import { ensureDir, snapshotDir, snapshotDate, writeJson } from '../lib/fs.mjs'

export async function fetchGithub(date = snapshotDate()) {
  const dir = ensureDir(snapshotDir(date))
  process.stderr.write('github topic:dsh-plugin (first 1000 by stars)\n')
  const first = ghJson('search/repositories?q=topic:dsh-plugin&sort=stars&order=desc&per_page=100&page=1')
  const items = [...(first.items ?? [])]
  const total = first.total_count ?? items.length
  const pages = Math.min(10, Math.ceil(total / 100))
  for (let page = 2; page <= pages; page++) {
    process.stderr.write(`  page ${page}/${pages}\n`)
    const body = ghJson(`search/repositories?q=topic:dsh-plugin&sort=stars&order=desc&per_page=100&page=${page}`)
    items.push(...(body.items ?? []))
  }
  const slim = items.map(r => ({
    full_name: r.full_name,
    html_url: r.html_url,
    stargazers_count: r.stargazers_count,
    forks_count: r.forks_count,
    pushed_at: r.pushed_at,
    created_at: r.created_at,
    description: r.description,
    topics: r.topics,
    archived: r.archived,
    default_branch: r.default_branch,
  }))
  writeJson(join(dir, 'github-topic-search.json'), {
    queriedAt: new Date().toISOString(),
    query: 'topic:dsh-plugin',
    total_count: total,
    incomplete_results: first.incomplete_results ?? null,
    fetched: slim.length,
    note: 'GitHub search API returns at most 1000 results; total_count is the denominator.',
    items: slim,
  })
  return { id: 'github', url: 'https://api.github.com/search/repositories?q=topic:dsh-plugin', dest: join(dir, 'github-topic-search.json') }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchGithub().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
