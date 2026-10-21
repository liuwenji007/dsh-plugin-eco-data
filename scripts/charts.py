"""Render published charts into charts/.

  python3 -m venv .tmp/venv && .tmp/venv/bin/pip install matplotlib
  SNAPSHOT_DATE=2026-10-20 .tmp/venv/bin/python scripts/charts.py

stars 图需要本地的 awesome-plugins.json；growth / capabilities 只读 results/。
"""

import csv
import json
import os
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager

ROOT = Path(__file__).resolve().parent.parent
DATE = os.environ.get("SNAPSHOT_DATE", "2026-10-20")
RESULTS = ROOT / "results" / DATE
SNAP = ROOT / "snapshots" / DATE
OUT = ROOT / "charts"

CJK_FONT = "/System/Library/Fonts/Hiragino Sans GB.ttc"
BAR = "#3b6ea5"
MUTED = "#b8c4d1"
ACCENT = "#c0504d"

TEXT = {
    "zh": {
        "growth_title": "目录每周新增条目",
        "growth_y": "条",
        "growth_note": "W42 一周 1,462 条，看起来是集中补录",
        "stars_title": "目录条目的星数分布",
        "stars_y": "条目数",
        "caps_title": "已扫描插件的能力分布（5,552 条）",
        "caps": {
            "fs-read": "读文件",
            "network": "联网",
            "env": "环境变量",
            "fs-write": "写文件",
            "shell": "执行 shell",
            "credentials": "凭据",
            "llm": "调用模型",
            "host-runtime": "宿主运行时",
            "dynamic-code": "动态代码",
            "subagent": "子代理",
        },
    },
    "en": {
        "growth_title": "New catalog entries per week",
        "growth_y": "entries",
        "growth_note": "W42: 1,462 in one week, looks like a backfill",
        "stars_title": "GitHub stars per catalog entry",
        "stars_y": "entries",
        "caps_title": "Capabilities of scanned plugins (n = 5,552)",
        "caps": {
            "fs-read": "read files",
            "network": "network",
            "env": "env vars",
            "fs-write": "write files",
            "shell": "shell",
            "credentials": "credentials",
            "llm": "LLM calls",
            "host-runtime": "host runtime",
            "dynamic-code": "dynamic code",
            "subagent": "subagent",
        },
    },
}

STAR_BUCKETS = [
    ("0", 0, 0),
    ("1", 1, 1),
    ("2–4", 2, 4),
    ("5–9", 5, 9),
    ("10–49", 10, 49),
    ("50–99", 50, 99),
    ("100–999", 100, 999),
    ("1000+", 1000, float("inf")),
]


def setup_fonts():
    if Path(CJK_FONT).exists():
        font_manager.fontManager.addfont(CJK_FONT)
        name = font_manager.FontProperties(fname=CJK_FONT).get_name()
        plt.rcParams["font.family"] = [name, "DejaVu Sans"]
    plt.rcParams["axes.spines.top"] = False
    plt.rcParams["axes.spines.right"] = False
    plt.rcParams["figure.dpi"] = 150


def growth(lang):
    t = TEXT[lang]
    with open(RESULTS / "growth-from-added.csv") as f:
        rows = list(csv.DictReader(f))
    weeks = [r["week"].split("-")[1] for r in rows]
    added = [int(r["added"]) for r in rows]
    colors = [ACCENT if w == "W42" else BAR for w in weeks]
    fig, ax = plt.subplots(figsize=(8, 4))
    ax.bar(weeks, added, color=colors)
    for x, y in zip(weeks, added):
        ax.text(x, y + 15, f"{y:,}", ha="center", fontsize=8)
    ax.set_title(t["growth_title"])
    ax.set_ylabel(t["growth_y"])
    ax.annotate(t["growth_note"], xy=(weeks.index("W42"), added[weeks.index("W42")]),
                xytext=(1.5, max(added) * 1.05), fontsize=9, color=ACCENT,
                arrowprops={"arrowstyle": "->", "color": ACCENT})
    ax.set_ylim(0, max(added) * 1.2)
    fig.tight_layout()
    fig.savefig(OUT / f"growth-{lang}.png")
    plt.close(fig)


def stars(lang):
    t = TEXT[lang]
    plugins = json.loads((SNAP / "awesome-plugins.json").read_text())["plugins"]
    values = [p["stars"] for p in plugins if isinstance(p.get("stars"), (int, float))]
    counts = [sum(1 for s in values if lo <= s <= hi) for _, lo, hi in STAR_BUCKETS]
    labels = [b[0] for b in STAR_BUCKETS]
    colors = [BAR if b[2] < 10 else MUTED for b in STAR_BUCKETS]
    fig, ax = plt.subplots(figsize=(8, 4))
    ax.bar(labels, counts, color=colors)
    for x, y in zip(labels, counts):
        ax.text(x, y + 20, f"{y:,}", ha="center", fontsize=8)
    ax.set_title(t["stars_title"])
    ax.set_ylabel(t["stars_y"])
    ax.set_ylim(0, max(counts) * 1.15)
    fig.tight_layout()
    fig.savefig(OUT / f"stars-{lang}.png")
    plt.close(fig)
    return len(values), counts


def capabilities(lang):
    t = TEXT[lang]
    caps = json.loads((RESULTS / "F-47.json").read_text())["numbers"]
    scanned = json.loads((RESULTS / "F-40.json").read_text())["numbers"]["scanned"]
    items = sorted(caps.items(), key=lambda kv: kv[1])
    labels = [t["caps"][k] for k, _ in items]
    pct = [v / scanned * 100 for _, v in items]
    fig, ax = plt.subplots(figsize=(7, 4.5))
    ax.barh(labels, pct, color=BAR)
    for y, v in enumerate(pct):
        ax.text(v + 0.8, y, f"{v:.1f}%", va="center", fontsize=8)
    ax.set_xlim(0, 100)
    ax.set_title(t["caps_title"])
    fig.tight_layout()
    fig.savefig(OUT / f"capabilities-{lang}.png")
    plt.close(fig)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    setup_fonts()
    n = counts = None
    for lang in ("zh", "en"):
        growth(lang)
        if (SNAP / "awesome-plugins.json").exists():
            n, counts = stars(lang)
        capabilities(lang)
    if n is None:
        print("skipped stars charts (no local awesome-plugins.json)")
    else:
        print(f"stars n={n} buckets={counts} lt10={sum(counts[:4])} zero={counts[0]}")
    print(f"wrote {sorted(p.name for p in OUT.glob('*.png'))}")


if __name__ == "__main__":
    main()
