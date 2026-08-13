#!/usr/bin/env python3
"""Rebuild the RIK full catalog without known duplicated product pages."""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import re
import sys
import tempfile
from collections import Counter
from pathlib import Path

import pymupdf
from pypdf import PdfReader, PdfWriter
from pypdf.annotations import Link
from pypdf.generic import ArrayObject, ByteStringObject, DictionaryObject, NameObject, NumberObject
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import Paragraph


SOURCE_SHA256 = "A61E8E3E36DCD79E5BAD387AEAC7372589B86DE5F5688E8FCA1B37B237AE57B0"
SOURCE_PAGES = 412
OUTPUT_PAGES = 354
TOC_SOURCE_PAGES = (2, 3, 4, 5)
BLUE = HexColor("#1476ff")
DARK_BLUE = HexColor("#145486")
TEXT = HexColor("#151515")
MUTED = HexColor("#5f6b7a")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest().upper()


def set_deterministic_pdf_id(writer: PdfWriter, seed: str) -> None:
    identifier = hashlib.sha256(seed.encode("utf-8")).digest()[:16]
    writer._ID = ArrayObject(
        [ByteStringObject(identifier), ByteStringObject(identifier)]
    )


def require_pymupdf() -> None:
    if not hasattr(pymupdf.Page, "apply_redactions"):
        raise RuntimeError("PyMuPDF with redaction support is required")


def register_fonts() -> tuple[str, str, str]:
    fonts = Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts"
    regular = fonts / "arial.ttf"
    bold = fonts / "arialbd.ttf"
    black = fonts / "arialbd.ttf"
    for path in (regular, bold, black):
        if not path.exists():
            raise FileNotFoundError(f"Required font is missing: {path}")
    pdfmetrics.registerFont(TTFont("Arial", str(regular)))
    pdfmetrics.registerFont(TTFont("Arial-Bold", str(bold)))
    pdfmetrics.registerFont(TTFont("Arial-Black", str(black)))
    return "Arial", "Arial-Bold", "Arial-Black"


def clean_title(title: str) -> str:
    return re.sub(r"\s+", " ", title).strip()


def normalize_extracted_text(text: str) -> str:
    text = text.replace("\u00a0", " ").replace("ꞏ", "·")
    return re.sub(r"\s+", " ", text).strip()


def load_manifest(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    removed = [int(page) for page in data["removed_pages"]]
    entries = list(data["entries"])
    if data["source_pages"] != SOURCE_PAGES:
        raise ValueError("TOC map source page count is not 412")
    if data["expected_pages"] != OUTPUT_PAGES:
        raise ValueError("TOC map output page count is not 354")
    if len(removed) != 58 or len(set(removed)) != 58:
        raise ValueError("TOC map must remove exactly 58 unique pages")
    if len(entries) != 122:
        raise ValueError("TOC map must contain exactly 122 entries")
    return data


def toc_groups(entries: list[dict]) -> list[list[dict]]:
    """Split the ordered TOC into the established 4-page catalog sections."""
    starts = [0]
    boundary_titles = [
        "Водяные воздухоохладители RSW",
        "Клапан лепестковый КЛ",
        "Смесительные узлы",
    ]
    for title in boundary_titles:
        index = next(i for i, entry in enumerate(entries) if entry["title"] == title)
        starts.append(index)
    starts.append(len(entries))
    groups = [entries[starts[i] : starts[i + 1]] for i in range(4)]
    if [len(group) for group in groups] != [44, 33, 38, 7]:
        raise ValueError(f"Unexpected TOC group sizes: {[len(group) for group in groups]}")
    return groups


def draw_toc_page(
    canvas: Canvas,
    page_number: int,
    entries: list[dict],
    logo: Path,
    regular_font: str,
    bold_font: str,
    black_font: str,
) -> list[dict]:
    width, height = A4
    left = 36 * mm
    right = width - 36 * mm
    links: list[dict] = []

    if page_number == 3:
        canvas.setFillColor(DARK_BLUE)
        canvas.rect(0, height - 38 * mm, width, 38 * mm, fill=1, stroke=0)
        canvas.setFillColor(HexColor("#ffffff"))
        canvas.setFont(bold_font, 16)
        canvas.drawString(left, height - 23.5 * mm, "ПОЛНЫЙ ТЕХНИЧЕСКИЙ КАТАЛОГ")
        title_y = height - 51 * mm
        canvas.setFillColor(TEXT)
        canvas.setFont(bold_font, 10.5)
        canvas.drawString(left, title_y, "Оглавление — продолжение")
        y = title_y - 11 * mm
        line_height = 6.4 * mm
        font_size = 8.2
    else:
        canvas.setFillColor(BLUE)
        canvas.setFont(bold_font, 7.8)
        canvas.drawString(left, height - 14 * mm, "ПОЛНЫЙ ТЕХНИЧЕСКИЙ КАТАЛОГ")
        if logo.exists():
            canvas.drawImage(str(logo), right - 25 * mm, height - 20 * mm, 25 * mm, 12 * mm, preserveAspectRatio=True, mask="auto")
        canvas.setStrokeColor(BLUE)
        canvas.setLineWidth(0.7)
        canvas.line(left, height - 22 * mm, right - 30 * mm, height - 22 * mm)
        canvas.setFillColor(TEXT)
        canvas.setFont(black_font, 23)
        canvas.drawString(left, height - 37 * mm, "Оглавление" if page_number == 2 else "Оглавление — продолжение")
        y = height - 49 * mm
        line_height = {2: 5.2 * mm, 4: 6.1 * mm, 5: 9.5 * mm}[page_number]
        font_size = {2: 7.2, 4: 8.5, 5: 9.2}[page_number]

    for entry in entries:
        title = clean_title(entry["title"])
        level = int(entry["level"])
        target = int(entry["corrected_new_page"])
        is_section = level == 0
        indent = 0 if is_section else (5 * mm if level == 1 else 13 * mm)
        current_font = bold_font if is_section else regular_font
        current_size = font_size + (1.6 if is_section else 0)
        current_color = BLUE if is_section else (TEXT if level == 1 else MUTED)
        max_width = right - left - indent - 22 * mm
        while pdfmetrics.stringWidth(title, current_font, current_size) > max_width and current_size > 6.4:
            current_size -= 0.2
        if y < 19 * mm:
            raise ValueError(f"TOC page {page_number} overflow at {title!r}")
        canvas.setFillColor(current_color)
        canvas.setFont(current_font, current_size)
        baseline = y
        canvas.drawString(left + indent, baseline, title)
        canvas.drawRightString(right, baseline, str(target))
        links.append(
            {
                "rect": [left + indent, baseline - 2 * mm, right, baseline + 4.2 * mm],
                "target_page": target,
                "title": title,
            }
        )
        y -= line_height

    canvas.setStrokeColor(BLUE)
    canvas.setLineWidth(0.6)
    canvas.line(left, 14 * mm, right, 14 * mm)
    canvas.setFillColor(BLUE)
    canvas.setFont(regular_font, 6.5)
    canvas.drawString(left, 9 * mm, "rik-vent.ru")
    canvas.drawRightString(right, 9 * mm, str(page_number))
    return links


def make_toc_pdf(path: Path, entries: list[dict], logo: Path) -> dict[int, list[dict]]:
    regular, bold, black = register_fonts()
    groups = toc_groups(entries)
    canvas = Canvas(str(path), pagesize=A4, pageCompression=1, invariant=1)
    links_by_page: dict[int, list[dict]] = {}
    for index, group in enumerate(groups, start=2):
        links_by_page[index] = draw_toc_page(canvas, index, group, logo, regular, bold, black)
        canvas.showPage()
    canvas.save()
    return links_by_page


def add_toc_links(writer: PdfWriter, links_by_page: dict[int, list[dict]]) -> None:
    for toc_page, links in links_by_page.items():
        for link in links:
            writer.add_annotation(
                page_number=toc_page - 1,
                annotation=Link(
                    rect=tuple(link["rect"]),
                    target_page_index=int(link["target_page"]) - 1,
                ),
            )


def add_metadata(writer: PdfWriter) -> None:
    writer.add_metadata(
        {
            "/Title": "Полный технический каталог РИК",
            "/Author": "РИК",
            "/Subject": "Вентиляционное оборудование РИК",
            "/Keywords": "РИК, вентиляция, технический каталог",
            "/Creator": "RIK catalog rebuild",
        }
    )


def rebuild_pages(source: Path, toc_pdf: Path, output: Path, removed: set[int]) -> None:
    source_reader = PdfReader(str(source))
    toc_reader = PdfReader(str(toc_pdf))
    if len(source_reader.pages) != SOURCE_PAGES or len(toc_reader.pages) != 4:
        raise ValueError("Unexpected source or TOC page count")
    writer = PdfWriter()
    for old_page_number, page in enumerate(source_reader.pages, start=1):
        if old_page_number in removed:
            continue
        if old_page_number in TOC_SOURCE_PAGES:
            writer.add_page(toc_reader.pages[old_page_number - 2])
        else:
            writer.add_page(page)
    if len(writer.pages) != OUTPUT_PAGES:
        raise ValueError(f"Expected {OUTPUT_PAGES} pages, got {len(writer.pages)}")
    add_metadata(writer)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("wb") as stream:
        writer.write(stream)


def replace_toc_links(pdf: Path, links_by_page: dict[int, list[dict]]) -> None:
    reader = PdfReader(str(pdf))
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)
    for page_number in range(2, 6):
        page = writer.pages[page_number - 1]
        page.pop(NameObject("/Annots"), None)
    add_toc_links(writer, links_by_page)
    add_metadata(writer)
    set_deterministic_pdf_id(writer, f"{SOURCE_SHA256}:rik-full-catalog-354-v1")
    temp = pdf.with_suffix(".linked.pdf")
    with temp.open("wb") as stream:
        writer.write(stream)
    temp.replace(pdf)


def redact_and_replace(
    page: pymupdf.Page, search: str, replacement: str, size: float
) -> dict[str, object]:
    hits = page.search_for(search)
    if not hits:
        raise ValueError(f"Expected at least one match for {search!r}")
    if max(hit.y1 for hit in hits) - min(hit.y0 for hit in hits) > size * 2:
        raise ValueError(f"Search fragments for {search!r} are not on one line: {hits}")
    hit = pymupdf.Rect(
        min(item.x0 for item in hits),
        min(item.y0 for item in hits),
        max(item.x1 for item in hits),
        max(item.y1 for item in hits),
    )
    rect = pymupdf.Rect(hit.x0 - 1, hit.y0 - 1, page.rect.width - 35, hit.y1 + 1)
    page.add_redact_annot(rect, fill=(1, 1, 1))
    page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE)
    font_path = Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts" / "arial.ttf"
    font = pymupdf.Font(fontfile=str(font_path))
    text_width = font.text_length(replacement, fontsize=size)
    if text_width > rect.width:
        raise ValueError(
            f"Replacement text is {text_width:.2f} pt wide but only {rect.width:.2f} pt are available "
            f"on page {page.number + 1}: {replacement!r}"
        )
    return {
        "page_index": page.number,
        "x": rect.x0,
        "baseline_from_top": hit.y0 + size * 0.91,
        "text": replacement,
        "size": size,
    }


def redact_block_containing(
    page: pymupdf.Page, marker: str, replacement: str, size: float
) -> dict[str, object]:
    blocks = [block for block in page.get_text("blocks") if marker in block[4]]
    if len(blocks) != 1:
        raise ValueError(f"Expected one text block containing {marker!r}, got {len(blocks)}")
    x0, y0, _x1, y1, _text, *_rest = blocks[0]
    rect = pymupdf.Rect(x0 - 1, y0 - 1, page.rect.width - 35, y1 + 1)
    page.add_redact_annot(rect, fill=(1, 1, 1))
    page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE)
    font_path = Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts" / "arial.ttf"
    font = pymupdf.Font(fontfile=str(font_path))
    text_width = font.text_length(replacement, fontsize=size)
    if text_width > rect.width:
        raise ValueError(
            f"Replacement text is {text_width:.2f} pt wide but only {rect.width:.2f} pt are available "
            f"on page {page.number + 1}: {replacement!r}"
        )
    return {
        "page_index": page.number,
        "x": rect.x0,
        "baseline_from_top": y0 + size * 0.91,
        "text": replacement,
        "size": size,
    }


def apply_text_overlays(pdf: Path, overlays: list[dict[str, object]]) -> None:
    """Merge searchable Unicode text onto already-redacted pages."""
    if not overlays:
        return
    regular_font, _bold_font, _black_font = register_fonts()
    reader = PdfReader(str(pdf))
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)
    for overlay in overlays:
        page_index = int(overlay["page_index"])
        page = writer.pages[page_index]
        width = float(page.mediabox.width)
        height = float(page.mediabox.height)
        packet = io.BytesIO()
        canvas = Canvas(packet, pagesize=(width, height), invariant=1)
        canvas.setFillColor(HexColor("#111111"))
        canvas.setFont(regular_font, float(overlay["size"]))
        canvas.drawString(
            float(overlay["x"]),
            height - float(overlay["baseline_from_top"]),
            str(overlay["text"]),
        )
        canvas.save()
        packet.seek(0)
        page.merge_page(PdfReader(packet).pages[0], over=True)
    if reader.metadata:
        writer.add_metadata(dict(reader.metadata))
    temp = pdf.with_suffix(".overlay.pdf")
    with temp.open("wb") as stream:
        writer.write(stream)
    temp.replace(pdf)


def edit_known_text_defects(input_pdf: Path, output_pdf: Path, removed: set[int]) -> None:
    def new_page(old_page: int) -> int:
        return old_page - sum(1 for page in removed if page < old_page)

    doc = pymupdf.open(str(input_pdf))
    overlays: list[dict[str, object]] = []
    try:
        ro_page = doc[new_page(219) - 1]
        overlays.append(
            redact_and_replace(
                ro_page,
                "40-20 — размер канала, мм",
                "40-20 — размер канала, см",
                10.5,
            )
        )
        footer_replacements = {
            226: "Заслонки RKZ: Эскиз № 1 · Заслонки RSn: Эскиз № 2 · Эскиз № 3 · Эскиз № 4",
            227: "Заслонки RKZ: Эскиз № 1 · Заслонки RSn: Эскиз № 2 · Эскиз № 3 · Эскиз № 4 · Эскиз № 5",
            228: "Заслонки RKZ: Эскиз № 1 · Заслонки RSn: Эскиз № 2 · Эскиз № 4",
            229: "Заслонки RKZ: Эскиз № 1 · Заслонки RSn: Эскиз № 2 · Эскиз № 4",
        }
        for old_page_number, replacement in footer_replacements.items():
            sketch_page = doc[new_page(old_page_number) - 1]
            overlays.append(redact_block_containing(sketch_page, "&nbsp;", replacement, 10.5))
        output_pdf.parent.mkdir(parents=True, exist_ok=True)
        doc.save(str(output_pdf), garbage=4, deflate=True, clean=True)
    finally:
        doc.close()
    apply_text_overlays(output_pdf, overlays)


def page_content_hash(page) -> str:
    contents = page.get_contents()
    if contents is None:
        return hashlib.sha256(b"").hexdigest()
    return hashlib.sha256(contents.get_data()).hexdigest()


def validate_pdf(path: Path, removed: set[int]) -> dict:
    reader = PdfReader(str(path))
    if len(reader.pages) != OUTPUT_PAGES:
        raise ValueError(f"Final PDF has {len(reader.pages)} pages instead of {OUTPUT_PAGES}")
    texts = [(page.extract_text() or "") for page in reader.pages]
    joined = normalize_extracted_text("\n".join(texts))
    banned = [
        "40-20 — размер канала, мм",
        "Эскиз № 1 · Эскиз № 1",
        "&nbsp;",
        "RKZ с периметральным обогревом",
    ]
    found_banned = [needle for needle in banned if needle in joined]
    if found_banned:
        raise ValueError(f"Banned legacy text remains: {found_banned}")
    required_counts = {
        "40-20 — размер канала, см": 1,
        "Заслонки RSn: Эскиз № 2": 4,
        "Регулирующие заслонки RSn с периметральным обогревом": 1,
    }
    missing_required = [
        f"{needle!r}: expected at least {count}, got {joined.count(needle)}"
        for needle, count in required_counts.items()
        if joined.count(needle) < count
    ]
    if missing_required:
        raise ValueError(f"Required corrected text is missing: {missing_required}")
    def mapped_page(old_page: int) -> int:
        return old_page - sum(1 for removed_page in removed if removed_page < old_page)

    page_specific_required = {
        mapped_page(219): ["40-20 — размер канала, см"],
        mapped_page(226): ["Заслонки RKZ: Эскиз № 1", "Заслонки RSn: Эскиз № 2", "Эскиз № 3", "Эскиз № 4"],
        mapped_page(227): ["Заслонки RKZ: Эскиз № 1", "Заслонки RSn: Эскиз № 2", "Эскиз № 3", "Эскиз № 4", "Эскиз № 5"],
        mapped_page(228): ["Заслонки RKZ: Эскиз № 1", "Заслонки RSn: Эскиз № 2", "Эскиз № 4"],
        mapped_page(229): ["Заслонки RKZ: Эскиз № 1", "Заслонки RSn: Эскиз № 2", "Эскиз № 4"],
    }
    missing_page_specific = []
    for page_number, needles in page_specific_required.items():
        page_text = normalize_extracted_text(texts[page_number - 1])
        for needle in needles:
            if needle not in page_text:
                missing_page_specific.append(f"page {page_number}: {needle!r}")
    if missing_page_specific:
        raise ValueError(
            f"Page-specific corrected searchable text is missing: {missing_page_specific}"
        )
    hashes = [page_content_hash(page) for page in reader.pages]
    exact_groups = [
        pages
        for _, pages in sorted(
            ((key, [i + 1 for i, value in enumerate(hashes) if value == key]) for key in set(hashes)),
            key=lambda item: item[1],
        )
        if len(pages) > 1
    ]
    annotations = Counter()
    internal_links = 0
    external_links = 0
    broken_internal = []
    valid_page_refs = {
        (page.indirect_reference.idnum, page.indirect_reference.generation)
        for page in reader.pages
        if page.indirect_reference is not None
    }
    for page_number, page in enumerate(reader.pages, start=1):
        for annot in page.get("/Annots", []) or []:
            obj = annot.get_object()
            subtype = str(obj.get("/Subtype", ""))
            annotations[subtype] += 1
            if subtype == "/Link" and "/Dest" in obj:
                internal_links += 1
                dest = obj["/Dest"]
                if isinstance(dest, ArrayObject) and dest:
                    target = dest[0]
                    if isinstance(target, NumberObject):
                        if not 0 <= int(target) < len(reader.pages):
                            broken_internal.append((page_number, f"page index {int(target)} out of range"))
                    elif hasattr(target, "idnum"):
                        ref = (target.idnum, target.generation)
                        if ref not in valid_page_refs:
                            broken_internal.append((page_number, f"unknown page reference {ref}"))
                    else:
                        broken_internal.append((page_number, f"invalid destination type {type(target).__name__}"))
            elif subtype == "/Link" and "/A" in obj:
                action = obj["/A"].get_object()
                if str(action.get("/S", "")) == "/URI":
                    external_links += 1
    if broken_internal:
        raise ValueError(f"Broken internal links: {broken_internal[:5]}")
    if internal_links != 122:
        raise ValueError(f"Expected 122 internal TOC links, got {internal_links}")
    if external_links != 3:
        raise ValueError(f"Expected 3 preserved external contact links, got {external_links}")
    return {
        "path": str(path),
        "sha256": sha256(path),
        "bytes": path.stat().st_size,
        "pages": len(reader.pages),
        "removed_pages": sorted(removed),
        "content_stream_duplicate_groups": exact_groups,
        "annotation_counts": dict(annotations),
        "internal_links": internal_links,
        "external_links": external_links,
        "banned_text_found": found_banned,
        "missing_required_text": missing_required,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--toc-map", type=Path, required=True)
    parser.add_argument("--logo", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    require_pymupdf()
    if sha256(args.source) != SOURCE_SHA256:
        raise ValueError("Source PDF SHA-256 does not match the audited catalog")
    manifest = load_manifest(args.toc_map)
    removed = set(int(page) for page in manifest["removed_pages"])
    with tempfile.TemporaryDirectory(prefix="rik-catalog-") as temp_name:
        temp = Path(temp_name)
        toc_pdf = temp / "toc.pdf"
        assembled_pdf = temp / "assembled.pdf"
        edited_pdf = temp / "edited.pdf"
        links = make_toc_pdf(toc_pdf, manifest["entries"], args.logo)
        rebuild_pages(args.source, toc_pdf, assembled_pdf, removed)
        edit_known_text_defects(assembled_pdf, edited_pdf, removed)
        replace_toc_links(edited_pdf, links)
        report = validate_pdf(edited_pdf, removed)
        edited_pdf.replace(args.output)
    report["path"] = str(args.output)
    report["sha256"] = sha256(args.output)
    report["bytes"] = args.output.stat().st_size
    report["source_sha256"] = SOURCE_SHA256
    report["toc_entries"] = len(manifest["entries"])
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
