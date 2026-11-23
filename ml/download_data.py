"""Download and verify the public UCI traffic-volume dataset."""

from __future__ import annotations

import gzip
import hashlib
import json
import shutil
import urllib.request
import zipfile
from pathlib import Path

DATASET_URL = (
    "https://archive.ics.uci.edu/static/public/492/metro+interstate+traffic+volume.zip"
)
ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
CSV_PATH = RAW_DIR / "Metro_Interstate_Traffic_Volume.csv"
METADATA_PATH = RAW_DIR / "source.json"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def download(force: bool = False) -> Path:
    """Download the archive once and return the extracted CSV path."""
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    if CSV_PATH.exists() and not force:
        print(f"Dataset already present: {CSV_PATH}")
        return CSV_PATH

    archive_path = RAW_DIR / "metro_interstate_traffic_volume.zip"
    temp_path = archive_path.with_suffix(".download")
    request = urllib.request.Request(DATASET_URL, headers={"User-Agent": "FlowCast/0.1"})

    with urllib.request.urlopen(request, timeout=60) as response, temp_path.open("wb") as target:
        shutil.copyfileobj(response, target)
    temp_path.replace(archive_path)

    with zipfile.ZipFile(archive_path) as archive:
        candidates = [
            name
            for name in archive.namelist()
            if name.lower().endswith((".csv", ".csv.gz"))
        ]
        if len(candidates) != 1:
            raise RuntimeError(f"Expected one CSV in archive, found {candidates}")
        with archive.open(candidates[0]) as archived_source, CSV_PATH.open("wb") as target:
            if candidates[0].lower().endswith(".gz"):
                with gzip.GzipFile(fileobj=archived_source) as source:
                    shutil.copyfileobj(source, target)
            else:
                shutil.copyfileobj(archived_source, target)

    metadata = {
        "title": "Metro Interstate Traffic Volume",
        "source_url": DATASET_URL,
        "uci_dataset_id": 492,
        "license": "CC BY 4.0",
        "csv_sha256": sha256(CSV_PATH),
        "archive_sha256": sha256(archive_path),
    }
    METADATA_PATH.write_text(json.dumps(metadata, indent=2) + "\n")
    archive_path.unlink()
    print(f"Downloaded {CSV_PATH} ({CSV_PATH.stat().st_size:,} bytes)")
    return CSV_PATH


if __name__ == "__main__":
    download()
