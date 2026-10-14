"""File -> versioned document JSON (MAT-01, MAT-02, MAT-11, MAT-13).

Later stages (structure, concepts, claims, generated) fill the empty arrays; they must
not touch `blocks` or `document.sha256` (MAT-11: never overwrite source).
"""

from __future__ import annotations

import hashlib
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from artilearn import PIPELINE_VERSION, SCHEMA_VERSION
from artilearn.ingest.parsers import PARSERS, ParseFailure
from artilearn.schemas import validate


@dataclass(frozen=True)
class IngestConfig:
    # Pages/slides with fewer extracted characters are flagged as unreadable (MAT-02).
    # Placeholder value; tune against the gold set (PRD Sec. 4: thresholds set after baseline).
    min_chars_per_unit: int = 20


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def ingest_file(
    path: str | Path,
    *,
    subject_id: str | None = None,
    syllabus_id: str | None = None,
    job_id: str | None = None,
    uploaded_at: str | None = None,
    config: IngestConfig = IngestConfig(),
) -> dict:
    path = Path(path)
    digest = sha256_file(path)
    fmt, parser = PARSERS.get(path.suffix.lower(), (None, None))
    doc = {
        "schema_version": SCHEMA_VERSION,
        "document": {
            "id": f"doc_{digest[:12]}",
            "name": path.name,
            "sha256": digest,
            "format": fmt,
            "pages": None,
            "uploaded_at": uploaded_at or datetime.now(timezone.utc).isoformat(timespec="seconds"),
        },
        "subject": {"subject_id": subject_id, "syllabus_id": syllabus_id},
        "processing": {
            "job_id": job_id or f"job_{uuid.uuid4().hex[:8]}",
            "status": "completed",
            "pipeline_version": PIPELINE_VERSION,
            "warnings": [],
        },
        "coverage": [],
        "blocks": [],
        "structure": [],
        "concepts": [],
        "relationships": [],
        "claims": [],
        "evidence": [],
        "generated": [],
    }

    if parser is None:
        _fail(doc, ParseFailure("UNSUPPORTED_FORMAT", f"extension {path.suffix!r} not in pdf/docx/pptx"))
        validate(doc, "document")
        return doc

    try:
        parsed = parser(path)
    except ParseFailure as e:
        _fail(doc, e)
        validate(doc, "document")
        return doc

    doc["document"]["pages"] = parsed.unit_count
    warnings = doc["processing"]["warnings"]
    for loc, chars in parsed.units:
        flagged = chars < config.min_chars_per_unit
        doc["coverage"].append({"location": loc, "chars": chars, "flagged": flagged})
        if flagged:
            warnings.append({
                "code": "UNREADABLE_SECTION",
                "location": loc,
                "detail": f"{chars} chars extracted (< {config.min_chars_per_unit}); possibly image-only",
            })

    flagged_units = {_unit_key(c["location"]) for c in doc["coverage"] if c["flagged"]}
    for i, b in enumerate(parsed.blocks):
        # Downstream features exclude flagged units (MAT-02); keep the block but mark it.
        loc = dict(b.location, block=f"b_{i}")
        doc["blocks"].append({"id": f"b_{i}", "text": b.text, "location": loc,
                              **({"unreadable_section": True} if _unit_key(loc) in flagged_units else {})})

    if not doc["blocks"]:
        warnings.append({"code": "NO_TEXT", "detail": "no extractable text in document"})
    if warnings:
        doc["processing"]["status"] = "completed_with_warnings"

    validate(doc, "document")
    return doc


def _unit_key(loc: dict):
    if "page" in loc:
        return ("page", loc["page"])
    if "slide" in loc:
        return ("slide", loc["slide"])
    return ("doc", 0)


def _fail(doc: dict, e: ParseFailure) -> None:
    doc["processing"]["status"] = "failed"
    doc["processing"]["failure"] = {"code": e.code, "detail": e.detail}
