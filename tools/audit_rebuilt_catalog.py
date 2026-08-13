#!/usr/bin/env python3
"""Fail-closed raster audit for the rebuilt RIK full catalog."""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import tempfile
from collections import defaultdict
from pathlib import Path

from PIL import Image, ImageChops


CHANGED_SOURCE_PAGES = {2, 3, 4, 5, 219, 226, 227, 228, 229}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--final-renders", required=True, type=Path)
    parser.add_argument("--original-renders", required=True, type=Path)
    parser.add_argument("--final-pdf", required=True, type=Path)
    parser.add_argument("--source-pdf", required=True, type=Path)
    parser.add_argument("--pdftoppm", required=True, type=Path)
    parser.add_argument("--toc-map", required=True, type=Path)
    parser.add_argument("--report", required=True, type=Path)
    return parser.parse_args()


def page_files(folder: Path, expected_count: int) -> list[Path]:
    files = sorted(folder.glob("page-*.png"))
    expected_names = [f"page-{page:03d}.png" for page in range(1, expected_count + 1)]
    actual_names = [path.name for path in files]
    if actual_names != expected_names:
        missing = sorted(set(expected_names) - set(actual_names))
        unexpected = sorted(set(actual_names) - set(expected_names))
        raise RuntimeError(
            f"Unexpected render set in {folder}: "
            f"count={len(files)}, missing={missing[:10]}, unexpected={unexpected[:10]}"
        )
    return files


def image_fingerprint(path: Path) -> tuple[str, tuple[int, int], bool]:
    with Image.open(path) as source:
        image = source.convert("RGB")
        dimensions = image.size
        digest = hashlib.sha256()
        digest.update(f"RGB:{dimensions[0]}x{dimensions[1]}:".encode("ascii"))
        digest.update(image.tobytes())

        white = Image.new("RGB", dimensions, "white")
        is_blank = ImageChops.difference(image, white).getbbox() is None
        return digest.hexdigest(), dimensions, is_blank


def render_page(
    pdftoppm: Path,
    pdf: Path,
    page: int,
    dpi: int,
    output_stem: Path,
) -> Path:
    command = [
        str(pdftoppm),
        "-f",
        str(page),
        "-l",
        str(page),
        "-r",
        str(dpi),
        "-png",
        "-singlefile",
        str(pdf),
        str(output_stem),
    ]
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(
            f"pdftoppm failed for {pdf} page {page}: "
            f"stdout={result.stdout!r}, stderr={result.stderr!r}"
        )
    output = output_stem.with_suffix(".png")
    if not output.is_file():
        raise RuntimeError(f"pdftoppm did not create {output}")
    return output


def main() -> int:
    args = parse_args()
    args.report.parent.mkdir(parents=True, exist_ok=True)
    toc_map = json.loads(args.toc_map.read_text(encoding="utf-8"))
    source_pages = int(toc_map["source_pages"])
    expected_pages = int(toc_map["expected_pages"])
    removed_pages = {int(page) for page in toc_map["removed_pages"]}

    if len(removed_pages) != int(toc_map["removed_count"]):
        raise RuntimeError("removed_count does not match the unique removed page list")
    if source_pages - len(removed_pages) != expected_pages:
        raise RuntimeError("source_pages - removed_pages does not equal expected_pages")
    if CHANGED_SOURCE_PAGES & removed_pages:
        raise RuntimeError("A changed source page is also listed as removed")

    final_files = page_files(args.final_renders, expected_pages)
    original_files = page_files(args.original_renders, source_pages)

    final_fingerprints: dict[int, str] = {}
    final_dimensions: dict[int, tuple[int, int]] = {}
    blank_final_pages: list[int] = []
    duplicate_candidates: defaultdict[str, list[int]] = defaultdict(list)
    for new_page, path in enumerate(final_files, start=1):
        digest, dimensions, is_blank = image_fingerprint(path)
        final_fingerprints[new_page] = digest
        final_dimensions[new_page] = dimensions
        duplicate_candidates[digest].append(new_page)
        if is_blank:
            blank_final_pages.append(new_page)

    exact_duplicate_groups = sorted(
        (pages for pages in duplicate_candidates.values() if len(pages) > 1),
        key=lambda pages: pages[0],
    )

    retained_source_pages = [
        old_page for old_page in range(1, source_pages + 1) if old_page not in removed_pages
    ]
    if len(retained_source_pages) != expected_pages:
        raise RuntimeError("Retained source-to-final page mapping has the wrong length")

    original_fingerprints: dict[int, str] = {}
    original_dimensions: dict[int, tuple[int, int]] = {}
    for old_page, path in enumerate(original_files, start=1):
        digest, dimensions, _ = image_fingerprint(path)
        original_fingerprints[old_page] = digest
        original_dimensions[old_page] = dimensions

    unchanged_mismatches: list[dict[str, object]] = []
    changed_page_results: list[dict[str, object]] = []
    unchanged_matches = 0
    for new_page, old_page in enumerate(retained_source_pages, start=1):
        same_dimensions = final_dimensions[new_page] == original_dimensions[old_page]
        same_pixels = final_fingerprints[new_page] == original_fingerprints[old_page]
        result = {
            "new_page": new_page,
            "source_page": old_page,
            "same_dimensions": same_dimensions,
            "same_pixels": same_pixels,
        }
        if old_page in CHANGED_SOURCE_PAGES:
            changed_page_results.append(result)
        elif same_dimensions and same_pixels:
            unchanged_matches += 1
        else:
            unchanged_mismatches.append(result)

    low_resolution_mismatches = unchanged_mismatches
    high_resolution_verified: list[dict[str, object]] = []
    unresolved_mismatches: list[dict[str, object]] = []
    if low_resolution_mismatches:
        with tempfile.TemporaryDirectory(
            prefix="raster-audit-", dir=args.report.parent
        ) as temporary_directory:
            temporary_path = Path(temporary_directory)
            for result in low_resolution_mismatches:
                new_page = int(result["new_page"])
                old_page = int(result["source_page"])
                source_render = render_page(
                    args.pdftoppm,
                    args.source_pdf,
                    old_page,
                    600,
                    temporary_path / f"source-{old_page:03d}",
                )
                final_render = render_page(
                    args.pdftoppm,
                    args.final_pdf,
                    new_page,
                    600,
                    temporary_path / f"final-{new_page:03d}",
                )
                source_digest, source_dimensions, _ = image_fingerprint(source_render)
                final_digest, final_dimensions_600, _ = image_fingerprint(final_render)
                secondary = {
                    **result,
                    "verification_dpi": 600,
                    "same_dimensions_at_600dpi": source_dimensions == final_dimensions_600,
                    "same_pixels_at_600dpi": source_digest == final_digest,
                }
                if (
                    secondary["same_dimensions_at_600dpi"]
                    and secondary["same_pixels_at_600dpi"]
                ):
                    high_resolution_verified.append(secondary)
                else:
                    unresolved_mismatches.append(secondary)

    expected_unchanged = expected_pages - len(CHANGED_SOURCE_PAGES)
    verified_unchanged = unchanged_matches + len(high_resolution_verified)
    changed_pages_not_changed = [
        result for result in changed_page_results if result["same_pixels"]
    ]

    failures: list[str] = []
    if exact_duplicate_groups:
        failures.append(f"exact raster duplicate groups: {exact_duplicate_groups}")
    if blank_final_pages:
        failures.append(f"blank final pages: {blank_final_pages}")
    if verified_unchanged != expected_unchanged or unresolved_mismatches:
        failures.append(
            f"unchanged page mismatch: verified={verified_unchanged}/{expected_unchanged}, "
            f"details={unresolved_mismatches[:10]}"
        )
    if len(changed_page_results) != len(CHANGED_SOURCE_PAGES):
        failures.append(
            f"changed page mapping count={len(changed_page_results)}, "
            f"expected={len(CHANGED_SOURCE_PAGES)}"
        )
    if changed_pages_not_changed:
        failures.append(f"expected edited pages still pixel-identical: {changed_pages_not_changed}")

    report = {
        "status": "PASS" if not failures else "FAIL",
        "source_pages": source_pages,
        "final_pages": expected_pages,
        "removed_pages": sorted(removed_pages),
        "removed_count": len(removed_pages),
        "exact_raster_duplicate_groups": exact_duplicate_groups,
        "blank_final_pages": blank_final_pages,
        "unchanged_pages_expected": expected_unchanged,
        "unchanged_pages_low_resolution_pixel_identical": unchanged_matches,
        "unchanged_pages_high_resolution_verified": len(high_resolution_verified),
        "unchanged_pages_verified_total": verified_unchanged,
        "low_resolution_mismatches": low_resolution_mismatches,
        "high_resolution_verified_matches": high_resolution_verified,
        "unresolved_unchanged_page_mismatches": unresolved_mismatches,
        "changed_page_results": changed_page_results,
        "failures": failures,
    }
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
