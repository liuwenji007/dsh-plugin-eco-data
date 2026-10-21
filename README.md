# DSH 插件生态数据（2026-10-20）

讨论区帖子和文章里数字的出处。目录是 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 2026-10-19 那一版，共 6,084 条。

## 这份仓库有什么

- `results/2026-10-20/`：已复核的计数（规模、星数、下载量、扫描覆盖率、能力分布、风险提示比例）。
- `charts/`：增长、星数、能力分布图，中英各一份。
- `sampling/`：从 GitHub `dsh-plugin` 标签里抽的 100 个仓库，以及「是否和 DSH 相关」的标注。
- `scripts/`、`checks/`：拉取、计算、对账脚本。每个数字用 Node 和 Python 各算一遍。
- `snapshots/2026-10-20/MANIFEST.md`：当时拉取的文件大小和 sha256。原始 JSON 不放在这个仓库里。

口径和局限见 [METHODS.md](METHODS.md)。

## 来源

这些都是社区维护的第三方，不是 DeepSeek / 官方宿主的收录或背书。

| 来源 | 许可证 | 2026-10-20 快照 |
|---|---|---|
| [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 目录 | CC0-1.0 | 6,084 条 |
| [LivXue shop](https://github.com/LivXue/dsh-plugin-shop) | Apache-2.0 | 15,872 条收录 |
| GitHub `topic:dsh-plugin` | 搜索结果 | `total_count` 21,342 |
| npm `keywords:dsh-plugin` | 注册表搜索 | 9,195 |

## 利益相关

我维护目录构建期使用的扫描器 [dsh-trust-check](https://github.com/liuwenji007/dsh-trust-check)。能力和风险提示的数字来自该扫描器在目录侧的结果（当时钉在 0.2.1）。

## 怎么复现

目录、shop、npm、GitHub 都是活数据。今天重新拉，数字会和 10 月 19 日这一版不同。要对上文章里的数字，需要 sha256 与 `MANIFEST.md` 一致的本地快照。

```sh
# 拉当前快照（数字会变）
node scripts/fetch/all.mjs

# 计算，并与 Python 对账
SNAPSHOT_DATE=YYYY-MM-DD node scripts/analyze/all.mjs
SNAPSHOT_DATE=YYYY-MM-DD node scripts/analyze/growth.mjs
SNAPSHOT_DATE=YYYY-MM-DD python3 checks/compute.py
SNAPSHOT_DATE=YYYY-MM-DD python3 checks/reconcile.py
```

需要 2026-10-20 那份原始快照的话，可以开 issue。原始目录数据里有逐个插件的风险提示，这里不再转发一份。

## 范围

- 只给条数和比例，不点名命中风险提示的插件。
- 不给安全评级，也不比较不同扫描器。
- 各来源都是第三方，不代表官方生态或官方收录。

## 许可

脚本是 MIT（[LICENSE](LICENSE)）。派生数字、表格和配图是 [CC BY 4.0](LICENSE-DATA)。上游目录是 CC0，shop 是 Apache-2.0，转载请同时遵守来源许可。
