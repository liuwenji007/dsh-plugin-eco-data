import { createHash } from 'node:crypto'
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  statSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')

export function snapshotDate() {
  const env = process.env.SNAPSHOT_DATE
  if (env) return env
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function snapshotDir(date = snapshotDate()) {
  return join(ROOT, 'snapshots', date)
}

export function resultsDir(date = snapshotDate()) {
  return join(ROOT, 'results', date)
}

export function ensureDir(dir) {
  mkdirSync(dir, { recursive: true })
  return dir
}

export function sha256File(path) {
  const buf = readFileSync(path)
  return createHash('sha256').update(buf).digest('hex')
}

export function sha256Buf(buf) {
  return createHash('sha256').update(buf).digest('hex')
}

export function writeJson(path, value) {
  ensureDir(dirname(path))
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function fileMeta(path) {
  if (!existsSync(path)) return null
  const st = statSync(path)
  return {
    path,
    bytes: st.size,
    sha256: sha256File(path),
    mtime: st.mtime.toISOString(),
  }
}

export function repoRootFromUrl(url) {
  if (!url || typeof url !== 'string') return null
  const m = url.match(/github\.com[/:]([^/#]+\/[^/#]+)/i)
  if (!m) return null
  return m[1].replace(/\.git$/i, '').replace(/\/+$/, '')
}

export function writeFinding(dir, id, payload) {
  ensureDir(dir)
  const out = {
    id,
    generatedAt: new Date().toISOString(),
    ...payload,
  }
  writeJson(join(dir, `${id}.json`), out)
  return out
}
