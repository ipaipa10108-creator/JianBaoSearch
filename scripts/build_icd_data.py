#!/usr/bin/env python3
"""
Build compact, deduplicated ICD-9-CM / ICD-10-CM / ICD-11 mapping JSON (data/icd-cm.json)
and ICD-10-PCS / ICD-9-CM / NHI Fee Code mapping JSON (data/icd-pcs.json).
"""

from __future__ import annotations

import csv
import json
import os
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"

URLS = {
    "i9_to_i10cm": "https://raw.githubusercontent.com/lab22-tw/NHI_Code/master/ICD-9-CM2001_to_ICD-10-CM.csv",
    "i9_to_i10pcs": "https://raw.githubusercontent.com/lab22-tw/NHI_Code/master/ICD-9-CM2001_to_ICD-10-PCS.csv",
    "pcs_to_nhi": "https://raw.githubusercontent.com/lab22-tw/NHI_Code/master/ICD-10-PCS_to_NHI_code.csv",
    "i10_to_i11": "https://raw.githubusercontent.com/riazsomc/icd10to11mapping/main/icd10_to_icd11_mapping.json",
}

TMP_PATHS = {
    "i9_to_i10cm": Path("/tmp/i9_to_i10cm.csv"),
    "i9_to_i10pcs": Path("/tmp/i9_to_i10pcs.csv"),
    "pcs_to_nhi": Path("/tmp/pcs_to_nhi.csv"),
    "i10_to_i11": Path("/tmp/icd10_to_icd11.json"),
}


def ensure_file(key: str) -> Path:
    path = TMP_PATHS[key]
    if path.exists() and path.stat().st_size > 1000:
        return path
    url = URLS[key]
    print(f"Downloading {url} -> {path}")
    req = urllib.request.Request(url, headers={"User-Agent": "JianBaoSearch-Builder/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        path.write_bytes(resp.read())
    return path


def load_icd10_to_11(path: Path) -> tuple[dict[str, list[str]], dict[str, str]]:
    with path.open("r", encoding="utf-8") as f:
        raw = json.load(f)

    i10_to_i11: dict[str, list[str]] = {}
    i11_titles: dict[str, str] = {}

    def clean_str(val) -> str:
        return val.strip() if isinstance(val, str) else ""

    for i10_code, info in raw.items():
        if not isinstance(info, dict):
            continue
        codes: list[str] = []
        seen = set()

        default_map = info.get("default")
        if isinstance(default_map, dict):
            c11 = clean_str(default_map.get("icd11Code"))
            t11 = clean_str(default_map.get("icd11Title"))
            if c11 and c11 not in seen:
                seen.add(c11)
                codes.append(c11)
                if t11 and c11 not in i11_titles:
                    i11_titles[c11] = t11

        for m in info.get("mappings") or []:
            if not isinstance(m, dict):
                continue
            c11 = clean_str(m.get("icd11Code"))
            t11 = clean_str(m.get("icd11Title"))
            if c11 and c11 not in seen:
                seen.add(c11)
                codes.append(c11)
                if t11 and c11 not in i11_titles:
                    i11_titles[c11] = t11
                if len(codes) >= 3:
                    break

        if codes:
            i10_to_i11[i10_code.strip().upper()] = codes

    return i10_to_i11, i11_titles


def lookup_icd11(i10_code: str, i10_to_i11: dict[str, list[str]]) -> list[str]:
    c = i10_code.strip().upper()
    if c in i10_to_i11:
        return i10_to_i11[c]
    # Try progressively shorter prefixes (e.g., E11.65 -> E11.6 -> E11)
    if "." in c:
        base, dec = c.split(".", 1)
        for length in range(len(dec) - 1, 0, -1):
            cand = f"{base}.{dec[:length]}"
            if cand in i10_to_i11:
                return i10_to_i11[cand]
        if base in i10_to_i11:
            return i10_to_i11[base]
    if len(c) > 3 and c[:3] in i10_to_i11:
        return i10_to_i11[c[:3]]
    return []


def build_cm(i9_to_i10cm_path: Path, i10_to_i11: dict[str, list[str]], i11_titles: dict[str, str]) -> dict:
    i9_dict: dict[str, list[str]] = {}
    rows: list[list] = []
    seen_pairs = set()
    used_i11 = set()

    with i9_to_i10cm_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        header = next(reader, None)
        for row in reader:
            if len(row) < 6:
                continue
            i9 = row[0].strip()
            en9 = row[1].strip()
            zh9 = row[2].strip()
            i10 = row[3].strip()
            en10 = row[4].strip()
            zh10 = row[5].strip()
            if not i9 and not i10:
                continue
            pair = (i9, i10)
            if pair in seen_pairs:
                continue
            seen_pairs.add(pair)

            if i9 and i9 not in i9_dict:
                i9_dict[i9] = [zh9, en9]

            c11_list = lookup_icd11(i10, i10_to_i11) if i10 else []
            for c11 in c11_list:
                used_i11.add(c11)

            rows.append([i9, i10, zh10, en10, c11_list])

    used_i11_titles = {k: i11_titles[k] for k in used_i11 if k in i11_titles}
    return {
        "i9": i9_dict,
        "i11": used_i11_titles,
        "rows": rows,
    }


def build_pcs(i9_to_i10pcs_path: Path, pcs_to_nhi_path: Path) -> dict:
    pcs_nhi: dict[str, list[str]] = defaultdict(list)
    with pcs_to_nhi_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        next(reader, None)
        for row in reader:
            if len(row) < 2:
                continue
            pcs = row[0].strip()
            nhi = row[1].strip()
            if pcs and nhi and len(pcs_nhi[pcs]) < 6 and nhi not in pcs_nhi[pcs]:
                pcs_nhi[pcs].append(nhi)

    i9_dict: dict[str, list[str]] = {}
    rows: list[list] = []
    seen_pairs = set()

    with i9_to_i10pcs_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        next(reader, None)
        for row in reader:
            if len(row) < 6:
                continue
            i9 = row[0].strip()
            en9 = row[1].strip()
            zh9 = row[2].strip()
            pcs = row[3].strip()
            en_pcs = row[4].strip()
            zh_pcs = row[5].strip()
            if not i9 and not pcs:
                continue
            pair = (i9, pcs)
            if pair in seen_pairs:
                continue
            seen_pairs.add(pair)

            if i9 and i9 not in i9_dict:
                i9_dict[i9] = [zh9, en9]

            nhi_list = pcs_nhi.get(pcs, [])
            rows.append([i9, pcs, zh_pcs, en_pcs, nhi_list])

    return {
        "i9": i9_dict,
        "rows": rows,
    }


def main() -> int:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    paths = {k: ensure_file(k) for k in URLS}

    print("Loading WHO ICD-10 -> ICD-11 mapping...")
    i10_to_i11, i11_titles = load_icd10_to_11(paths["i10_to_i11"])

    print("Building data/icd-cm.json...")
    cm_data = build_cm(paths["i9_to_i10cm"], i10_to_i11, i11_titles)
    cm_out = DATA_DIR / "icd-cm.json"
    with cm_out.open("w", encoding="utf-8") as f:
        json.dump(cm_data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Wrote {len(cm_data['rows'])} CM rows -> {cm_out} ({cm_out.stat().st_size / (1024*1024):.2f} MB)")

    print("Building data/icd-pcs.json...")
    pcs_data = build_pcs(paths["i9_to_i10pcs"], paths["pcs_to_nhi"])
    pcs_out = DATA_DIR / "icd-pcs.json"
    with pcs_out.open("w", encoding="utf-8") as f:
        json.dump(pcs_data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Wrote {len(pcs_data['rows'])} PCS rows -> {pcs_out} ({pcs_out.stat().st_size / (1024*1024):.2f} MB)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
