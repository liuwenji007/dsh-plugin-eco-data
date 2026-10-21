#!/usr/bin/env python3
from __future__ import annotations

import json
import math
import os
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATE = os.environ.get("SNAPSHOT_DATE") or datetime.now().strftime("%Y-%m-%d")
RES = ROOT / "results" / DATE

PAIR = [
    ("scale.awesomeCount", "F-04 count"),
    ("scale.uniqueRepos", "F-04 uniqueRepos"),
    ("scale.subdir", "F-04 subdir"),
    ("scale.uniqueNames", "F-05 uniqueNames"),
    ("scale.nameGap", "F-05 nameGap"),
    ("scale.githubTotal", "F-01 github"),
    ("scale.npmTotal", "F-01 npm"),
    ("scale.shopCount", "F-01 shop"),
    ("scale.shopDeclaredCaps", "F-48 declared"),
    ("stars.median", "F-30 median"),
    ("stars.p90", "F-30 p90"),
    ("stars.lt10", "F-30 lt10"),
    ("stars.zero", "F-30 zero"),
    ("stars.top1pctShare", "F-30 top1pctShare"),
    ("downloads.bothPositive", "F-31 n"),
    ("downloads.spearman", "F-31 spearman"),
    ("downloads.top5Overlap", "F-33 overlap"),
    ("downloads.downloadsNull", "F-34 null"),
    ("subdir.count", "F-35 count"),
    ("subdir.inStarTop50", "F-35 inStarTop50"),
    ("trust.scanned", "F-40 scanned"),
    ("trust.unscanned", "F-40 unscanned"),
    ("trust.credNetChip", "F-43 chip"),
    ("trust.credNetRed", "F-43 red"),
    ("trust.unionCredNet", "F-43 union"),
    ("trust.anyRed", "F-44"),
    ("trust.postinstall", "F-45"),
]


def get(d, path):
    cur = d
    for part in path.split("."):
        if cur is None:
            return None
        if isinstance(cur, dict):
            cur = cur.get(part)
        else:
            return None
    return cur


def close(a, b):
    if a is None and b is None:
        return True
    if a is None or b is None:
        return False
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        if math.isnan(a) or math.isnan(b):
            return False
        return abs(a - b) <= max(1e-9, 1e-6 * max(abs(a), abs(b)))
    return a == b


def main():
    js = json.loads((RES / "metrics.json").read_text())
    py = json.loads((RES / "metrics.py.json").read_text())
    ok = bad = skip = 0
    extra_caps = []
    js_caps = get(js, "trust.capCounts") or {}
    py_caps = get(py, "trust.capCounts") or {}
    for k in sorted(set(js_caps) | set(py_caps)):
        extra_caps.append((f"trust.capCounts.{k}", js_caps.get(k), py_caps.get(k)))

    lines = [
        f"# Reconcile {DATE}",
        "",
        "Node `metrics.json` vs Python `metrics.py.json`.",
        "",
        "| key | node | python | match |",
        "|---|---|---|---|",
    ]
    rows = []
    for path, _label in PAIR:
        a, b = get(js, path), get(py, path)
        matched = close(a, b)
        if a is None and b is None:
            status = "skip"
            skip += 1
        elif matched:
            status = "yes"
            ok += 1
        else:
            status = "NO"
            bad += 1
        def fmt(v):
            if isinstance(v, float):
                return f"{v:.6g}"
            return json.dumps(v, ensure_ascii=False)
        lines.append(f"| `{path}` | {fmt(a)} | {fmt(b)} | {status} |")
        rows.append({"key": path, "node": a, "python": b, "match": status})

    lines += ["", "## capCounts", "", "| key | node | python | match |", "|---|---|---|---|"]
    for path, a, b in extra_caps:
        matched = close(a, b)
        status = "yes" if matched else "NO"
        if matched:
            ok += 1
        else:
            bad += 1
        lines.append(f"| `{path}` | {a} | {b} | {status} |")
        rows.append({"key": path, "node": a, "python": b, "match": status})

    lines += ["", f"- match: **{ok}**", f"- mismatch: **{bad}**", f"- skip: {skip}", ""]
    (ROOT / "checks" / "RECONCILE.md").write_text("\n".join(lines) + "\n")
    (RES / "reconcile.json").write_text(json.dumps({"ok": ok, "bad": bad, "skip": skip, "rows": rows}, indent=2) + "\n")
    print(f"match {ok} mismatch {bad} skip {skip}")
    if bad:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
