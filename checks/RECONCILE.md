# Reconcile 2026-10-20

Node `metrics.json` vs Python `metrics.py.json`.

| key | node | python | match |
|---|---|---|---|
| `scale.awesomeCount` | 6084 | 6084 | yes |
| `scale.uniqueRepos` | 5867 | 5867 | yes |
| `scale.subdir` | 625 | 625 | yes |
| `scale.uniqueNames` | 5641 | 5641 | yes |
| `scale.nameGap` | 443 | 443 | yes |
| `scale.githubTotal` | 21342 | 21342 | yes |
| `scale.npmTotal` | 9195 | 9195 | yes |
| `scale.shopCount` | 15872 | 15872 | yes |
| `scale.shopDeclaredCaps` | 16 | 16 | yes |
| `stars.median` | 2 | 2 | yes |
| `stars.p90` | 19 | 19 | yes |
| `stars.lt10` | 5016 | 5016 | yes |
| `stars.zero` | 1658 | 1658 | yes |
| `stars.top1pctShare` | 0.867252 | 0.867252 | yes |
| `downloads.bothPositive` | 2370 | 2370 | yes |
| `downloads.spearman` | 0.50298 | 0.50298 | yes |
| `downloads.top5Overlap` | 0 | 0 | yes |
| `downloads.downloadsNull` | 2970 | 2970 | yes |
| `subdir.count` | 625 | 625 | yes |
| `subdir.inStarTop50` | 27 | 27 | yes |
| `trust.scanned` | 5552 | 5552 | yes |
| `trust.unscanned` | 532 | 532 | yes |
| `trust.credNetChip` | 563 | 563 | yes |
| `trust.credNetRed` | 503 | 503 | yes |
| `trust.unionCredNet` | 598 | 598 | yes |
| `trust.anyRed` | 626 | 626 | yes |
| `trust.postinstall` | 23 | 23 | yes |

## capCounts

| key | node | python | match |
|---|---|---|---|
| `trust.capCounts.credentials` | 624 | 624 | yes |
| `trust.capCounts.dynamic-code` | 298 | 298 | yes |
| `trust.capCounts.env` | 3105 | 3105 | yes |
| `trust.capCounts.fs-read` | 3963 | 3963 | yes |
| `trust.capCounts.fs-write` | 3083 | 3083 | yes |
| `trust.capCounts.host-runtime` | 427 | 427 | yes |
| `trust.capCounts.llm` | 509 | 509 | yes |
| `trust.capCounts.network` | 3128 | 3128 | yes |
| `trust.capCounts.shell` | 2067 | 2067 | yes |
| `trust.capCounts.subagent` | 135 | 135 | yes |

- match: **37**
- mismatch: **0**
- skip: 0

