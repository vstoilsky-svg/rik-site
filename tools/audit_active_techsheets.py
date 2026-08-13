#!/usr/bin/env python3
"""Verify that every tech sheet referenced by the site remains in the full catalog."""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from pathlib import Path

import pymupdf


EXPECTED_ACTIVE_TECHSHEETS = 104


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog-data", required=True, type=Path)
    parser.add_argument("--central-page", required=True, type=Path)
    parser.add_argument("--downloads", required=True, type=Path)
    parser.add_argument("--full-catalog", required=True, type=Path)
    parser.add_argument("--report", required=True, type=Path)
    return parser.parse_args()


def named_block(source: str, declaration: str, closing: str) -> str:
    start = source.find(declaration)
    if start < 0:
        raise RuntimeError(f"Could not find declaration {declaration!r}")
    end = source.find(closing, start)
    if end < 0:
        raise RuntimeError(f"Could not find closing marker for {declaration!r}")
    return source[start : end + len(closing)]


def active_filenames(catalog_data: Path, central_page: Path) -> list[str]:
    catalog_source = catalog_data.read_text(encoding="utf-8")
    central_source = central_page.read_text(encoding="utf-8")
    tech_sheets = named_block(
        catalog_source, "export const TECH_SHEETS:", "\n};"
    )
    extras = named_block(
        catalog_source, "export const TECH_SHEET_EXTRAS:", "\n];"
    )
    central = named_block(central_source, "const CK_TECHSHEET:", "\n};")

    filenames = re.findall(r'TS\("([^"\\]+\.pdf)"\)', tech_sheets + extras)
    filenames.extend(
        re.findall(r'/downloads/tehlist/([^"\\]+\.pdf)', central)
    )
    unique = sorted(set(filenames), key=str.casefold)
    if len(unique) != EXPECTED_ACTIVE_TECHSHEETS:
        raise RuntimeError(
            f"Active tech-sheet count changed: {len(unique)}, "
            f"expected {EXPECTED_ACTIVE_TECHSHEETS}"
        )
    return unique


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("\u00a0", " ").replace("ꞏ", "·")
    return re.sub(r"\s+", "", text).casefold()


def page_texts(path: Path, require_searchable_text: bool = True) -> list[str]:
    doc = pymupdf.open(str(path))
    try:
        pages = [normalize(page.get_text()) for page in doc]
    finally:
        doc.close()
    short = [index for index, text in enumerate(pages, start=1) if len(text) < 20]
    if require_searchable_text and short:
        raise RuntimeError(f"{path}: pages have too little searchable text: {short}")
    return pages


def contiguous_starts(needles: list[str], haystack: list[str]) -> list[int]:
    if len(needles) > len(haystack):
        return []
    return [
        start + 1
        for start in range(0, len(haystack) - len(needles) + 1)
        if haystack[start : start + len(needles)] == needles
    ]


def main() -> int:
    args = parse_args()
    filenames = active_filenames(args.catalog_data, args.central_page)
    missing_files = [name for name in filenames if not (args.downloads / name).is_file()]
    if missing_files:
        raise RuntimeError(f"Active tech sheets are missing on disk: {missing_files}")

    catalog_pages = page_texts(args.full_catalog, require_searchable_text=False)
    catalog_lookup: dict[str, list[int]] = {}
    for page_number, text in enumerate(catalog_pages, start=1):
        catalog_lookup.setdefault(text, []).append(page_number)

    results = []
    not_fully_covered = []
    contiguous_count = 0
    page_covered_count = 0
    for name in filenames:
        tech_pages = page_texts(args.downloads / name)
        starts = contiguous_starts(tech_pages, catalog_pages)
        per_page_matches = [catalog_lookup.get(text, []) for text in tech_pages]
        missing_pages = [
            page_number
            for page_number, matches in enumerate(per_page_matches, start=1)
            if not matches
        ]
        if starts:
            status = "contiguous"
            contiguous_count += 1
        elif not missing_pages:
            status = "all-pages-covered-noncontiguously"
            page_covered_count += 1
        else:
            status = "missing-pages"
            not_fully_covered.append({"file": name, "missing_pages": missing_pages})
        results.append(
            {
                "file": name,
                "pages": len(tech_pages),
                "status": status,
                "contiguous_starts": starts,
                "per_page_matches": per_page_matches,
                "missing_pages": missing_pages,
            }
        )

    report = {
        "status": "PASS" if not not_fully_covered else "FAIL",
        "active_unique_techsheets": len(filenames),
        "full_catalog_pages": len(catalog_pages),
        "contiguous_techsheets": contiguous_count,
        "all_pages_covered_noncontiguously": page_covered_count,
        "not_fully_covered": not_fully_covered,
        "results": results,
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "results"}, ensure_ascii=False, indent=2))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
