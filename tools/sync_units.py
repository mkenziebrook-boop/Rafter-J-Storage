#!/usr/bin/env python3
"""Build units.json for the website from the Rafter J management system.

Usage: python3 tools/sync_units.py <exported-units-dir> [units.json]

<exported-units-dir> holds one JSON file per unit document from the
management system's "units" collection (what Claude's ArtifactData
"list" with out_dir writes). Only units marked "available" go into
units.json, and only their unit number and size: tenant names, phones,
addresses, balances and notes never leave the management system.

Exit code 0 always; prints "changed" or "unchanged" so the caller knows
whether to commit.
"""
import json
import pathlib
import re
import sys
from datetime import datetime, timezone

DEFAULT_SIZE = "10x10"  # Most units have no size filled in; they are 10x10.


def norm_size(raw):
    s = re.sub(r"\s+", "", str(raw or "")).lower().replace("×", "x")
    return s if re.fullmatch(r"\d+x\d+", s) else DEFAULT_SIZE


def main():
    src = pathlib.Path(sys.argv[1])
    out = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "units.json")

    units = []
    for f in sorted(src.glob("*.json")):
        doc = json.loads(f.read_text())
        data = doc.get("data", doc)
        if str(data.get("status", "")).lower() != "available":
            continue
        name = str(data.get("unit", "")).strip()
        if name:
            units.append({"unit": name, "size": norm_size(data.get("size")), "status": "Available"})

    units.sort(key=lambda u: [int(t) if t.isdigit() else t for t in re.split(r"(\d+)", u["unit"])])

    old = json.loads(out.read_text()) if out.exists() else {}
    if old.get("units") == units:
        print("unchanged")
        return
    out.write_text(json.dumps({
        "updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "Rafter J management system",
        "units": units,
    }, indent=2) + "\n")
    print("changed")


if __name__ == "__main__":
    main()
