# 覆盖率抽样判定标准

样本框：GitHub `topic:dsh-plugin` 搜索结果（按 star，最多 1000 条）中，**既不在 awesome 目录、也不在 LivXue shop** 的仓库。

- 随机种子：`20261020`（mulberry32）
- 样本量：100
- 局限：搜索 API 截断导致框偏向高 star 仓库，不能外推到长尾。

## 标签（`label` 列）

| 值 | 含义 |
|---|---|
| 是 | 面向 DeepSeek Harness 的项目（有 `dsh` 字段、`cordis.patch.yml`，或 README 明确说给 DSH 用） |
| 否 | 不是 DSH 相关（官方宿主、通用项目、误贴 topic、文档站、目录本身等） |
| 不确定 | 看了仍无法判定 |

参考列是自动预填的，不能代替人工标签。

## 不要把这些标成「是」

- `deepseek-ai/deepseek-harness` 及官方宿主本身
- awesome / 市场 / shop / 目录索引仓库
- 只在 topics 里写了 `dsh` 或 `dsh-plugin`、正文与 DSH 无关的通用项目

本次「是」比「能用 `dsh plugin add` 安装的功能插件」更宽，包括桌面客户端、启动器、部署仓库。

## 区间怎么读

`scripts/coverage-interval.mjs` 在「是 / 否」已标注的子集上算 Wilson 95% 区间。

结论必须写成：**在这个有偏样本框里，未进目录的仓库中，与 DSH 相关的占比区间是 [low, high]**。不要写成「生态覆盖率是 X%」。
