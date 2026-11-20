#!/usr/bin/env python3
"""
Fetch the latest Taiwan NHI Medical Service Fee Schedule (全民健康保險醫療服務給付項目及支付標準)
from data.gov.tw dataset 174450 and generate compact JSON files for the static web app.
"""

from __future__ import annotations

import csv
import hashlib
import io
import json
import os
import sys
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path

DATASET_API_URL = "https://data.gov.tw/api/v2/rest/dataset/174450"
FALLBACK_CSV_URL = "https://info.nhi.gov.tw/api/iode0000s01/Dataset?rId=A21030000I-D20021-001"

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
OUTPUT_JSON = DATA_DIR / "fee-schedule.json"
META_JSON = DATA_DIR / "meta.json"

TAIPEI_TZ = timezone(timedelta(hours=8))


def fetch_url(url: str, timeout: int = 30) -> bytes:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "JianBaoSearch-Updater/1.0 (+https://github.com/ipaipa10108-creator/JianBaoSearch)"
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def get_dataset_info() -> tuple[str, str]:
    """Return (download_url, modified_date_str) from data.gov.tw API."""
    try:
        raw = fetch_url(DATASET_API_URL, timeout=20)
        payload = json.loads(raw.decode("utf-8"))
        result = payload.get("result", {})
        modified_date = result.get("modifiedDate", "")
        distributions = result.get("distribution", [])
        for dist in distributions:
            dl_url = dist.get("resourceDownloadUrl")
            if dl_url:
                return dl_url, modified_date
    except Exception as exc:
        print(f"[warn] Failed to query data.gov.tw metadata API: {exc}", file=sys.stderr)
    return FALLBACK_CSV_URL, ""


def parse_points(value: str) -> int | float | str:
    cleaned = value.strip().replace(",", "")
    if not cleaned:
        return 0
    try:
        if "." in cleaned:
            f = float(cleaned)
            return int(f) if f.is_integer() else f
        return int(cleaned)
    except ValueError:
        return cleaned


def load_previous_items(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    try:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        return {item["c"]: item for item in data if isinstance(item, dict) and "c" in item}
    except Exception:
        return {}


def main() -> int:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    local_csv = os.environ.get("NHI_LOCAL_CSV")
    if local_csv and Path(local_csv).exists():
        print(f"Reading local CSV: {local_csv}")
        csv_bytes = Path(local_csv).read_bytes()
        modified_date = os.environ.get("NHI_MODIFIED_DATE", "")
        source_url = FALLBACK_CSV_URL
    else:
        source_url, modified_date = get_dataset_info()
        print(f"Fetching CSV from: {source_url}")
        csv_bytes = fetch_url(source_url, timeout=60)

    csv_hash = hashlib.sha256(csv_bytes).hexdigest()
    text = csv_bytes.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    items = []
    for row in reader:
        code = (row.get("診療項目代碼") or "").strip()
        if not code:
            continue
        points = parse_points(row.get("健保支付點數") or "0")
        start_date = (row.get("生效起日") or "").strip()
        end_date = (row.get("生效迄日") or "").strip()
        en_name = (row.get("英文項目名稱") or "").strip()
        zh_name = (row.get("中文項目名稱") or "").strip()
        note = (row.get("備註") or "").strip()

        # Compact keys to keep JSON lightweight for fast browser loading
        # c: code, p: points, s: startDate, e: endDate, en: englishName, zh: chineseName, n: note
        items.append(
            {
                "c": code,
                "p": points,
                "s": start_date,
                "e": end_date,
                "en": en_name,
                "zh": zh_name,
                "n": note,
            }
        )

    if len(items) < 1000:
        print(f"[error] Unexpectedly small dataset ({len(items)} rows). Aborting.", file=sys.stderr)
        return 1

    prev_map = load_previous_items(OUTPUT_JSON)
    curr_codes = {item["c"] for item in items}
    prev_codes = set(prev_map.keys())

    added_count = len(curr_codes - prev_codes)
    removed_count = len(prev_codes - curr_codes)
    changed_points = sum(
        1
        for item in items
        if item["c"] in prev_map and prev_map[item["c"]].get("p") != item["p"]
    )

    now_taipei = datetime.now(TAIPEI_TZ).strftime("%Y-%m-%d %H:%M:%S %Z")

    meta = {
        "datasetId": "174450",
        "identifier": "A21030000I-D20021",
        "sourceName": "衛生福利部中央健康保險署－醫療服務給付項目及支付標準",
        "sourceUrl": "https://data.gov.tw/dataset/174450",
        "downloadUrl": source_url,
        "sourceModifiedDate": modified_date or now_taipei,
        "updatedAt": now_taipei,
        "totalCount": len(items),
        "sha256": csv_hash,
        "diff": {
            "added": added_count,
            "removed": removed_count,
            "pointsChanged": changed_points,
        },
    }

    with OUTPUT_JSON.open("w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, separators=(",", ":"))

    with META_JSON.open("w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print(f"Wrote {len(items)} items to {OUTPUT_JSON} ({OUTPUT_JSON.stat().st_size / 1024:.1f} KB)")
    print(f"Meta: {meta}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
