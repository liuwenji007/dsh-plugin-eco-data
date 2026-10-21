#!/usr/bin/env python3
"""Independent recount of the published catalog metrics."""
from __future__ import annotations

import json
import math
import os
import re
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATE = os.environ.get("SNAPSHOT_DATE") or datetime.now().strftime("%Y-%m-%d")
SNAP = ROOT / "snapshots" / DATE

CAP_KEYS = [
    "fs-read", "network", "fs-write", "env", "shell",
    "credentials", "llm", "host-runtime", "dynamic-code", "subagent",
]


def load(name: str):
    p = SNAP / name
    if not p.exists():
        return None
    return json.loads(p.read_text())


def repo_root(url: str | None) -> str | None:
    if not url:
        return None
    m = re.search(r"github\.com[/:]([^/#]+/[^/#]+)", url, re.I)
    if not m:
        return None
    return m.group(1).replace(".git", "").rstrip("/").lower()


def plugin_key(p: dict) -> str:
    repo = p.get("repository")
    if isinstance(repo, dict):
        repo = repo.get("url")
    return p.get("url") or p.get("html_url") or repo or p.get("name") or ""


def awesome_plugins():
    j = load("awesome-plugins.json") or {}
    if isinstance(j, list):
        return j, None, None
    return j.get("plugins") or [], j.get("updated"), j.get("count")


def percentile(sorted_vals, p):
    if not sorted_vals:
        return None
    i = (len(sorted_vals) - 1) * p
    lo = math.floor(i)
    hi = math.ceil(i)
    if lo == hi:
        return sorted_vals[lo]
    return sorted_vals[lo] * (hi - i) + sorted_vals[hi] * (i - lo)


def ranks(values):
    indexed = sorted(enumerate(values), key=lambda x: x[1])
    out = [0.0] * len(values)
    i = 0
    n = len(indexed)
    while i < n:
        j = i
        while j < n and indexed[j][1] == indexed[i][1]:
            j += 1
        avg = (i + j - 1) / 2 + 1
        for k in range(i, j):
            out[indexed[k][0]] = avg
        i = j
    return out


def spearman(xs, ys):
    if len(xs) != len(ys) or len(xs) < 2:
        return None
    rx, ry = ranks(xs), ranks(ys)
    n = len(xs)
    mx = sum(rx) / n
    my = sum(ry) / n
    num = dx = dy = 0.0
    for a, b in zip(rx, ry):
        da, db = a - mx, b - my
        num += da * db
        dx += da * da
        dy += db * db
    if dx == 0 or dy == 0:
        return None
    return num / math.sqrt(dx * dy)


def main():
    plugins, updated, count_field = awesome_plugins()
    n = len(plugins)
    names = {p.get("name") for p in plugins if p.get("name")}
    repos = set()
    for p in plugins:
        root = repo_root(plugin_key(p))
        if root:
            repos.add(root)
    subdir = [p for p in plugins if isinstance(p.get("name"), str) and "#" in p["name"]]
    dates = sorted(p["added"][:10] for p in plugins if p.get("added"))
    days = None
    added = {"min": None, "max": None, "days": None}
    if dates:
        d0, d1 = dates[0], dates[-1]
        days = (datetime.fromisoformat(d1) - datetime.fromisoformat(d0)).days + 1
        added = {"min": d0, "max": d1, "days": days}

    scanned = [p for p in plugins if p.get("capabilityCheckedAt")]
    sn = len(scanned)

    def caps(p):
        return p.get("capabilities") or []

    def reds(p):
        return p.get("capabilityRedLines") or []

    cred_chip = [p for p in scanned if "credentials" in caps(p) and "network" in caps(p)]
    cred_red = [
        p for p in scanned
        if any("credentials" in str(r) and "network" in str(r) for r in reds(p))
    ]
    union = {plugin_key(p) for p in cred_chip + cred_red}
    any_red = [p for p in scanned if reds(p)]
    postinstall = [
        p for p in scanned
        if any("postinstall" in str(r).lower() or "install time" in str(r).lower() for r in reds(p))
    ]
    cap_counts = {k: sum(1 for p in scanned if k in caps(p)) for k in CAP_KEYS}

    stars = [p["stars"] for p in plugins if isinstance(p.get("stars"), (int, float))]
    stars_sorted = sorted(stars)
    by_repo = {}
    for p in plugins:
        root = repo_root(plugin_key(p))
        if root and root not in by_repo:
            by_repo[root] = p.get("stars") or 0
    repo_stars = sorted(by_repo.values(), reverse=True)
    total = sum(repo_stars) or 1
    top1 = max(1, math.ceil(len(repo_stars) * 0.01))
    top1_share = sum(repo_stars[:top1]) / total if repo_stars else None

    both = [
        p for p in plugins
        if isinstance(p.get("stars"), (int, float)) and p["stars"] > 0
        and isinstance(p.get("downloads"), (int, float)) and p["downloads"] > 0
    ]
    rho = spearman([p["stars"] for p in both], [p["downloads"] for p in both])

    def topn(rows, key, ncap):
        scored = []
        for p in rows:
            v = p.get(key)
            if isinstance(v, (int, float)):
                scored.append((plugin_key(p), v, p.get("name")))
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:ncap]

    star5 = topn(plugins, "stars", 5)
    dl_src = [p for p in plugins if isinstance(p.get("downloads"), (int, float))]
    dl5 = topn(dl_src, "downloads", 5)

    gh = load("github-topic-search.json") or {}
    npm = load("npm-search.json") or {}
    shop_index = load("shop-index.json") or {}
    shop = load("shop-plugins.json") or {}
    shop_plugins = shop if isinstance(shop, list) else shop.get("plugins") or []
    shop_declared = sum(
        1 for p in shop_plugins
        if ((p.get("catalog") or {}).get("capabilities") or [])
    )
    gh_items = gh.get("items") or []
    gh_top50_in = sum(
        1 for r in gh_items[:50]
        if str(r.get("full_name", "")).lower() in repos
    )

    out = {
        "date": DATE,
        "scale": {
            "awesomeCount": n,
            "awesomeCountField": count_field,
            "awesomeUpdated": updated,
            "uniqueRepos": len(repos),
            "subdir": len(subdir),
            "added": added,
            "perDay": (n / days) if days else None,
            "uniqueNames": len(names),
            "nameGap": n - len(names),
            "githubTotal": gh.get("total_count"),
            "githubFetched": len(gh_items),
            "githubTop50InCatalog": gh_top50_in,
            "npmTotal": npm.get("total"),
            "shopCount": len(shop_plugins),
            "shopIndexCount": shop_index.get("count"),
            "shopRejected": shop_index.get("rejected"),
            "shopDeclaredCaps": shop_declared,
        },
        "stars": {
            "n": len(stars),
            "median": percentile(stars_sorted, 0.5),
            "p90": percentile(stars_sorted, 0.9),
            "lt10": sum(1 for v in stars if v < 10),
            "zero": sum(1 for v in stars if v == 0),
            "top1pctShare": top1_share,
            "top1pctCount": top1,
        },
        "downloads": {
            "bothPositive": len(both),
            "spearman": rho,
            "top5Overlap": len({k for k, _, _ in star5} & {k for k, _, _ in dl5}),
            "downloadsNull": sum(1 for p in plugins if p.get("downloads") is None),
            "hasNumericDownloads": sum(1 for p in plugins if isinstance(p.get("downloads"), (int, float))),
        },
        "subdir": {
            "count": len(subdir),
            "inStarTop50": sum(1 for k, _, name in topn(plugins, "stars", 50) if name and "#" in str(name)),
        },
        "trust": {
            "scanned": sn,
            "unscanned": n - sn,
            "credNetChip": len(cred_chip),
            "credNetRed": len(cred_red),
            "unionCredNet": len(union),
            "anyRed": len(any_red),
            "postinstall": len(postinstall),
            "capCounts": cap_counts,
        },
    }
    dest = ROOT / "results" / DATE / "metrics.py.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {dest}")


if __name__ == "__main__":
    main()
