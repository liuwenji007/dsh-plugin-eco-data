import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const UA = 'dsh-plugin-eco-data/0.1 (https://github.com/liuwenji007/dsh-plugin-eco-data)'

export async function fetchBuf(url, { headers = {}, timeoutMs = 120_000 } = {}) {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, ...headers },
      signal: ac.signal,
      redirect: 'follow',
    })
    if (!res.ok && res.status !== 206) {
      throw new Error(`${res.status} ${res.statusText} ${url}`)
    }
    return Buffer.from(await res.arrayBuffer())
  } finally {
    clearTimeout(t)
  }
}

export async function fetchText(url, opts) {
  return (await fetchBuf(url, opts)).toString('utf8')
}

export async function fetchJson(url, opts) {
  return JSON.parse(await fetchText(url, opts))
}

export async function headLength(url) {
  const res = await fetch(url, {
    method: 'HEAD',
    headers: { 'user-agent': UA },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HEAD ${res.status} ${url}`)
  const len = res.headers.get('content-length')
  if (!len) throw new Error(`no content-length for ${url}`)
  return Number(len)
}

/**
 * Download without transparent gzip, in 256 KiB raw ranges.
 * Previously `--compressed` + Range mixed and corrupted the file.
 */
export async function downloadRanged(url, dest, { chunk = 256 * 1024, retries = 5 } = {}) {
  const total = await headLength(url)
  const parts = []
  for (let start = 0; start < total; start += chunk) {
    const end = Math.min(start + chunk - 1, total - 1)
    let lastErr
    for (let i = 0; i < retries; i++) {
      try {
        const buf = await fetchBuf(url, {
          headers: {
            Range: `bytes=${start}-${end}`,
            'Accept-Encoding': 'identity',
          },
          timeoutMs: 60_000,
        })
        const expect = end - start + 1
        if (buf.length !== expect) {
          throw new Error(`chunk ${start}-${end} got ${buf.length} want ${expect}`)
        }
        parts.push(buf)
        lastErr = null
        break
      } catch (err) {
        lastErr = err
        await new Promise(r => setTimeout(r, 500 * (i + 1)))
      }
    }
    if (lastErr) throw lastErr
    process.stderr.write(`\r  ranged ${Math.min(end + 1, total)}/${total}`)
  }
  process.stderr.write('\n')
  const out = Buffer.concat(parts)
  if (out.length !== total) throw new Error(`assembled ${out.length} want ${total}`)
  writeFileSync(dest, out)
  return { bytes: out.length }
}

export function ghJson(path, { paginate = false } = {}) {
  const args = paginate
    ? ['api', '--paginate', path]
    : ['api', path]
  const raw = execFileSync('gh', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 180_000,
  })
  // --paginate concatenates JSON arrays; if multiple arrays, wrap
  const trimmed = raw.trim()
  if (!trimmed) return paginate ? [] : null
  try {
    return JSON.parse(trimmed)
  } catch {
    // gh --paginate may emit concatenated arrays: ][
    const glued = `[${trimmed.replace(/\]\s*\[/g, ',')}]`
    const chunks = JSON.parse(glued)
    return chunks.flat()
  }
}
