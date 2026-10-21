# Snapshot 2026-10-20

目录字段 `updated`: 2026-10-19。原始 JSON 不入库。要对上本仓库 `results/` 里的数字，本地文件的 sha256 需要与下表一致。

| file | bytes | sha256 |
|---|---|---|
| awesome-plugins.json | 7603915 | `a83a68437faf286fd6f91cc09d40a62a12ce36db7702fac0b27a55a92ad0c395` |
| shop-index.json | 487 | `99969ec10cb1a43983a28df3f8604c2aa61051cbaea29a45ea97e0808ba61ccf` |
| shop-plugins.json | 15718615 | `c2fc6c02e4e752d4b5cbb9c24b54e53f0b5e28249621e300c9ece4bf73cb28e5` |
| github-topic-search.json | 734246 | `7a7e4539b41f74ecc075850b8295ec01628eb367655f76cafefa8e9f279d34d5` |
| npm-search.json | 9376828 | `505f13b674d33c10bfe6d4663ea9b75287534b9f50dafdee85d3575176cf81ec` |

来源：

- awesome：`https://awesome-dsh-plugin.com/plugins.json`（全量 GET，带解压）
- shop：`https://LivXue.github.io/dsh-plugin-shop/v1/index.json`，再按其 sha256 拉 plugins
- GitHub：`gh api search/repositories?q=topic:dsh-plugin`，最多前 1000 条明细，`total_count` 作分母
- npm：`https://registry.npmjs.org/-/v1/search?text=keywords:dsh-plugin`
