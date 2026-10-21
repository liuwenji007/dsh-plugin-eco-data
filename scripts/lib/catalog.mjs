import { readJson, repoRootFromUrl } from './fs.mjs'

export function loadAwesome(path) {
  const j = readJson(path)
  const plugins = Array.isArray(j) ? j : (j.plugins ?? [])
  return {
    updated: j.updated ?? null,
    countField: j.count ?? null,
    plugins,
  }
}

export function loadShop(path) {
  const j = readJson(path)
  const plugins = Array.isArray(j) ? j : (j.plugins ?? [])
  return {
    schemaVersion: j.schemaVersion ?? null,
    denied: j.denied ?? null,
    notAShop: j.notAShop ?? null,
    plugins,
  }
}

export function pluginKey(p) {
  return p.url || p.html_url || p.repository?.url || p.repository || p.name
}

export function isSubdir(p) {
  return typeof p.name === 'string' && p.name.includes('#')
}

export function starsOf(p) {
  const v = p.stars ?? p.stargazers_count ?? p.star
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function downloadsOf(p) {
  const v = p.downloads
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function scanned(p) {
  return Boolean(p.capabilityCheckedAt)
}

export function caps(p) {
  return Array.isArray(p.capabilities) ? p.capabilities : []
}

export function redLines(p) {
  return Array.isArray(p.capabilityRedLines) ? p.capabilityRedLines : []
}

export const CRED_NET_RED = 'reads credentials/secrets AND has network access'

export function hasCredNetChip(p) {
  const c = caps(p)
  return c.includes('credentials') && c.includes('network')
}

export function hasCredNetRed(p) {
  return redLines(p).some(r => String(r).includes('credentials') && String(r).includes('network'))
}

export function uniqueRepos(plugins) {
  const set = new Set()
  for (const p of plugins) {
    const root = repoRootFromUrl(pluginKey(p)) || String(pluginKey(p) ?? '')
    if (root) set.add(root.toLowerCase())
  }
  return set
}

export function addedRange(plugins) {
  const dates = plugins.map(p => p.added).filter(Boolean).sort()
  if (!dates.length) return { min: null, max: null, days: null }
  const min = dates[0].slice(0, 10)
  const max = dates[dates.length - 1].slice(0, 10)
  const days = Math.round((Date.parse(max) - Date.parse(min)) / 86400000) + 1
  return { min, max, days }
}
