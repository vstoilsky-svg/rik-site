#!/usr/bin/env python3
"""Synchronize corrected standalone tech sheets from the verified full catalog."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import tempfile
from pathlib import Path

import pymupdf
from pypdf import PdfReader, PdfWriter

from rebuild_catalog import set_deterministic_pdf_id


EXPECTED_FULL_CATALOG_SHA256 = (
    "7675C8D084208AEBD3B03A510D31C6C527C91A4A34C327ABC79D11935B12458A"
)
EXPECTED_FULL_CATALOG_PAGES = 354
CATALOG_PAGE_RANGES = {
    "Tehlist_RO.pdf": list(range(168, 170)),
    "Tehlist_RKZ_RKZ_perim-20260728.pdf": list(range(170, 179)),
}
RO_OLD = "40-20 — размер канала, мм"
RO_NEW = "40-20 — размер канала, см"
RKZ_REPLACEMENTS = {
    6: "Заслонки RKZ: Эскиз № 1 · Заслонки RSn: Эскиз № 2 · Эскиз № 3 · Эскиз № 4",
    7: "Заслонки RKZ: Эскиз № 1 · Заслонки RSn: Эскиз № 2 · Эскиз № 3 · Эскиз № 4 · Эскиз № 5",
    8: "Заслонки RKZ: Эскиз № 1 · Заслонки RSn: Эскиз № 2 · Эскиз № 4",
    9: "Заслонки RKZ: Эскиз № 1 · Заслонки RSn: Эскиз № 2 · Эскиз № 4",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--techsheet-dir", required=True, type=Path)
    parser.add_argument("--full-catalog", required=True, type=Path)
    parser.add_argument("--report", required=True, type=Path)
    return parser.parse_args()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def normalized(text: str) -> str:
    return " ".join(text.replace("\u00a0", " ").replace("ꞏ", "·").split())


def extracted_pages(path: Path) -> list[str]:
    doc = pymupdf.open(str(path))
    try:
        return [normalized(page.get_text()) for page in doc]
    finally:
        doc.close()


def validate(path: Path, name: str) -> dict[str, object]:
    texts = extracted_pages(path)
    expected_pages = len(CATALOG_PAGE_RANGES[name])
    if len(texts) != expected_pages:
        raise RuntimeError(f"{name}: page count {len(texts)}, expected {expected_pages}")
    if name == "Tehlist_RO.pdf":
        if RO_NEW not in texts[0] or RO_OLD in texts[0]:
            raise RuntimeError(f"{name}: corrected searchable RO unit is missing")
    else:
        if any("&nbsp;" in text for text in texts):
            raise RuntimeError(f"{name}: legacy &nbsp; remains")
        for page_number, replacement in RKZ_REPLACEMENTS.items():
            if normalized(replacement) not in texts[page_number - 1]:
                raise RuntimeError(
                    f"{name}: corrected searchable caption is missing on page {page_number}"
                )
    return {"file": name, "pages": len(texts), "sha256": sha256(path)}


def extract_one(catalog: PdfReader, path: Path, page_numbers: list[int]) -> dict[str, object]:
    original_hash = sha256(path) if path.is_file() else None
    metadata = PdfReader(str(path)).metadata if path.is_file() else None
    with tempfile.TemporaryDirectory(prefix=f"{path.stem}-", dir=path.parent) as temp_dir:
        candidate = Path(temp_dir) / path.name
        writer = PdfWriter()
        for page_number in page_numbers:
            writer.add_page(catalog.pages[page_number - 1])
        if metadata:
            writer.add_metadata(dict(metadata))
        set_deterministic_pdf_id(
            writer, f"{EXPECTED_FULL_CATALOG_SHA256}:{path.name}:v1"
        )
        with candidate.open("wb") as stream:
            writer.write(stream)
        result = validate(candidate, path.name)
        if original_hash == result["sha256"]:
            result["action"] = "unchanged-already-synchronized"
        else:
            os.replace(candidate, path)
            result["action"] = "synchronized-from-full-catalog"
    return result


def main() -> int:
    args = parse_args()
    catalog_hash = sha256(args.full_catalog)
    if catalog_hash != EXPECTED_FULL_CATALOG_SHA256:
        raise RuntimeError(
            f"Refusing unexpected full catalog hash {catalog_hash}; "
            f"expected {EXPECTED_FULL_CATALOG_SHA256}"
        )
    catalog = PdfReader(str(args.full_catalog), strict=True)
    if len(catalog.pages) != EXPECTED_FULL_CATALOG_PAGES:
        raise RuntimeError(
            f"Full catalog has {len(catalog.pages)} pages; "
            f"expected {EXPECTED_FULL_CATALOG_PAGES}"
        )

    results = [
        extract_one(catalog, args.techsheet_dir / name, page_numbers)
        for name, page_numbers in CATALOG_PAGE_RANGES.items()
    ]
    report = {
        "status": "PASS",
        "full_catalog_sha256": catalog_hash,
        "results": results,
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
