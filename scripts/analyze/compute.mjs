import { join } from 'node:path'
import { snapshotDir, resultsDir, snapshotDate, fileMeta, writeJson, writeFinding, ensureDir, readJson } from '../lib/fs.mjs'
import {
  loadAwesome,
  loadShop,
  pluginKey,
  isSubdir,
  starsOf,
  downloadsOf,
  scanned,
  caps,
  redLines,
  hasCredNetChip,
  hasCredNetRed,
  uniqueRepos,
  addedRange,
} from '../lib/catalog.mjs'
import { percentile, spearman } from '../lib/stats.mjs'

const CAP_KEYS = [
  'fs-read', 'network', 'fs-write', 'env', 'shell',
  'credentials', 'llm', 'host-runtime', 'dynamic-code', 'subagent',
]

function topN(plugins, keyFn, n) {
  return plugins
    .map(p => ({ key: pluginKey(p), value: keyFn(p) ?? -1, name: p.name }))
    .filter(x => x.value != null && x.value >= 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, n)
}

export function computeAll(date = snapshotDate()) {
  const dir = snapshotDir(date)
  const awesome = loadAwesome(join(dir, 'awesome-plugins.json'))
  const plugins = awesome.plugins
  const n = plugins.length
  const repos = uniqueRepos(plugins)
  const subdir = plugins.filter(isSubdir)
  const range = addedRange(plugins)
  const names = new Set(plugins.map(p => p.name).filter(Boolean))

  const scannedList = plugins.filter(scanned)
  const scannedN = scannedList.length
  const capCounts = Object.fromEntries(CAP_KEYS.map(k => [k, scannedList.filter(p => caps(p).includes(k)).length]))
  const credNetChip = scannedList.filter(hasCredNetChip)
  const credNetRed = scannedList.filter(hasCredNetRed)
  const unionCredNet = new Set([...credNetChip, ...credNetRed].map(pluginKey))
  const anyRed = scannedList.filter(p => redLines(p).length > 0)
  const postinstall = scannedList.filter(p =>
    redLines(p).some(r => /postinstall|install time/i.test(String(r))))

  const starVals = plugins.map(starsOf).filter(v => v != null)
  const starSorted = [...starVals].sort((a, b) => a - b)
  const starLt10 = starVals.filter(v => v < 10).length
  const starZero = starVals.filter(v => v === 0).length
  const byRepoStar = new Map()
  for (const p of plugins) {
    const root = (pluginKey(p) || '').match(/github\.com[/:]([^/#]+\/[^/#]+)/i)
    const repo = root ? root[1].replace(/\.git$/i, '').toLowerCase() : ''
    const s = starsOf(p) ?? 0
    if (!repo) continue
    if (!byRepoStar.has(repo)) byRepoStar.set(repo, s)
  }
  const repoStars = [...byRepoStar.values()].sort((a, b) => b - a)
  const totalRepoStars = repoStars.reduce((a, b) => a + b, 0)
  const top1pctCount = Math.max(1, Math.ceil(repoStars.length * 0.01))
  const top1pctShare = totalRepoStars ? repoStars.slice(0, top1pctCount).reduce((a, b) => a + b, 0) / totalRepoStars : null

  const both = plugins.filter(p => (starsOf(p) ?? 0) > 0 && (downloadsOf(p) ?? 0) > 0)
  const rho = spearman(both.map(starsOf), both.map(downloadsOf))
  const starTop50 = topN(plugins, starsOf, 50)
  const dlTop50 = topN(plugins.filter(p => downloadsOf(p) != null), downloadsOf, 50)
  const starTop5 = topN(plugins, starsOf, 5)
  const dlTop5 = topN(plugins.filter(p => downloadsOf(p) != null), downloadsOf, 5)
  const overlap5 = starTop5.filter(s => dlTop5.some(d => d.key === s.key)).length

  const downloadsNull = plugins.filter(p => p.downloads == null)
  const hasNpm = plugins.filter(p => typeof p.downloads === 'number')
  const subdirInStarTop50 = starTop50.filter(x => String(x.name ?? '').includes('#')).length
  let maxSubdirFromOneRepo = 0
  let maxSubdirRepo = null
  const subByRepo = new Map()
  for (const p of subdir) {
    const m = String(pluginKey(p) ?? '').match(/github\.com[/:]([^/#]+\/[^/#]+)/i)
    const root = m ? m[1].replace(/\.git$/i, '').toLowerCase() : ''
    if (!root) continue
    const arr = subByRepo.get(root) ?? []
    arr.push(p.name)
    subByRepo.set(root, arr)
    if (arr.length > maxSubdirFromOneRepo) {
      maxSubdirFromOneRepo = arr.length
      maxSubdirRepo = root
    }
  }

  let shop = { plugins: [] }
  let shopIndex = null
  try { shop = loadShop(join(dir, 'shop-plugins.json')) } catch { /* optional */ }
  try { shopIndex = readJson(join(dir, 'shop-index.json')) } catch { /* optional */ }
  const shopDeclared = shop.plugins.filter(p => (p.catalog?.capabilities ?? []).length > 0)

  let github = { total_count: null, items: [] }
  try { github = readJson(join(dir, 'github-topic-search.json')) } catch { /* optional */ }
  const ghItems = github.items ?? []
  const ghTop50InCatalog = ghItems.slice(0, 50).filter(r => repos.has(String(r.full_name ?? '').toLowerCase()))

  let npm = { total: null, packages: [] }
  try { npm = readJson(join(dir, 'npm-search.json')) } catch { /* optional */ }

  const inputs = {}
  for (const name of [
    'awesome-plugins.json', 'shop-plugins.json', 'shop-index.json',
    'github-topic-search.json', 'npm-search.json',
  ]) {
    const meta = fileMeta(join(dir, name))
    if (meta) inputs[name] = { bytes: meta.bytes, sha256: meta.sha256 }
  }

  return {
    date,
    inputs,
    scale: {
      awesomeCount: n,
      awesomeCountField: awesome.countField,
      awesomeUpdated: awesome.updated,
      uniqueRepos: repos.size,
      subdir: subdir.length,
      subdirPct: n ? subdir.length / n : null,
      added: range,
      perDay: range.days ? n / range.days : null,
      uniqueNames: names.size,
      nameGap: n - names.size,
      githubTotal: github.total_count,
      githubFetched: ghItems.length,
      githubTop50InCatalog: ghTop50InCatalog.length,
      githubTop50: 50,
      npmTotal: npm.total,
      npmFetched: (npm.packages ?? []).length,
      shopCount: shop.plugins.length,
      shopIndexCount: shopIndex?.count ?? null,
      shopRejected: shopIndex?.rejected ?? null,
      shopDeclaredCaps: shopDeclared.length,
    },
    stars: {
      n: starVals.length,
      median: starSorted.length ? percentile(starSorted, 0.5) : null,
      p90: starSorted.length ? percentile(starSorted, 0.9) : null,
      lt10: starLt10,
      lt10Pct: starVals.length ? starLt10 / starVals.length : null,
      zero: starZero,
      top1pctShare,
      top1pctCount,
      uniqueRepos: byRepoStar.size,
    },
    downloads: {
      bothPositive: both.length,
      spearman: rho,
      starTop5,
      dlTop5,
      top5Overlap: overlap5,
      hasNumericDownloads: hasNpm.length,
      downloadsNull: downloadsNull.length,
    },
    subdir: {
      count: subdir.length,
      inStarTop50: subdirInStarTop50,
      maxFromOneRepo: maxSubdirFromOneRepo,
      maxRepo: maxSubdirRepo,
    },
    trust: {
      scanned: scannedN,
      scannedPct: n ? scannedN / n : null,
      unscanned: n - scannedN,
      credNetChip: credNetChip.length,
      credNetRed: credNetRed.length,
      unionCredNet: unionCredNet.size,
      unionCredNetPct: scannedN ? unionCredNet.size / scannedN : null,
      anyRed: anyRed.length,
      anyRedPct: scannedN ? anyRed.length / scannedN : null,
      postinstall: postinstall.length,
      capCounts,
    },
  }
}

export function writeFindings(metrics, date = snapshotDate()) {
  const outDir = ensureDir(resultsDir(date))
  writeJson(join(outDir, 'metrics.json'), metrics)
  const sha = metrics.inputs
  const facts = [
    ['F-01', '四口径条数对照', {
      awesomeCount: metrics.scale.awesomeCount,
      awesomeUpdated: metrics.scale.awesomeUpdated,
      githubTotal: metrics.scale.githubTotal,
      githubFetched: metrics.scale.githubFetched,
      npmTotal: metrics.scale.npmTotal,
      shopCount: metrics.scale.shopCount,
      shopRejected: metrics.scale.shopRejected,
    }, 'A'],
    ['F-03', 'GitHub topic 前50 与目录交集', {
      githubTotal: metrics.scale.githubTotal,
      fetched: metrics.scale.githubFetched,
      top50InCatalog: metrics.scale.githubTop50InCatalog,
      top50: metrics.scale.githubTop50,
    }, 'B'],
    ['F-04', '目录基本盘', {
      count: metrics.scale.awesomeCount,
      uniqueRepos: metrics.scale.uniqueRepos,
      subdir: metrics.scale.subdir,
      added: metrics.scale.added,
      perDay: metrics.scale.perDay,
    }, 'A'],
    ['F-05', 'name 不唯一', {
      uniqueNames: metrics.scale.uniqueNames,
      gap: metrics.scale.nameGap,
    }, 'A'],
    ['F-30', 'star 分布', metrics.stars, 'A'],
    ['F-31', 'star 与下载量 Spearman', {
      n: metrics.downloads.bothPositive,
      spearman: metrics.downloads.spearman,
    }, 'A'],
    ['F-33', '两榜 top5', {
      starTop5: metrics.downloads.starTop5,
      dlTop5: metrics.downloads.dlTop5,
      overlap: metrics.downloads.top5Overlap,
    }, 'A'],
    ['F-34', '无下载量', {
      downloadsNull: metrics.downloads.downloadsNull,
      hasNumericDownloads: metrics.downloads.hasNumericDownloads,
      total: metrics.scale.awesomeCount,
    }, 'A'],
    ['F-35', '子目录借用 star', metrics.subdir, 'A'],
    ['F-40', '扫描覆盖率', {
      scanned: metrics.trust.scanned,
      scannedPct: metrics.trust.scannedPct,
      unscanned: metrics.trust.unscanned,
    }, 'A'],
    ['F-43', '读凭据+联网并集', {
      chip: metrics.trust.credNetChip,
      red: metrics.trust.credNetRed,
      union: metrics.trust.unionCredNet,
      pct: metrics.trust.unionCredNetPct,
    }, 'A'],
    ['F-44', '命中至少一条红线', {
      n: metrics.trust.anyRed,
      pct: metrics.trust.anyRedPct,
    }, 'A'],
    ['F-45', '安装期脚本红线', { n: metrics.trust.postinstall }, 'A'],
    ['F-47', '能力分布', metrics.trust.capCounts, 'A'],
    ['F-48', 'shop 自声明 capabilities', {
      shopCount: metrics.scale.shopCount,
      declared: metrics.scale.shopDeclaredCaps,
    }, 'A'],
  ]
  for (const [id, title, numbers, strength] of facts) {
    writeFinding(outDir, id, { title, numbers, evidence: strength, inputSha256: sha })
  }
  return outDir
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const date = snapshotDate()
  const metrics = computeAll(date)
  const dir = writeFindings(metrics, date)
  console.log(`wrote ${dir}`)
}
