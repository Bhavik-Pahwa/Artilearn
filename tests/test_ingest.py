"""M1 exit tests: MAT-01 (locations, failure), MAT-02 (coverage flags), MAT-11 (source untouched), MAT-13 (schema)."""

import hashlib

import pytest

from artilearn.ingest import ingest_file
from artilearn.schemas import errors
from conftest import PAGE_TEXT


def _sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def test_pdf_blocks_carry_page_locations(pdf_with_blank_page):
    doc = ingest_file(pdf_with_blank_page)
    assert errors(doc, "document") == []
    assert doc["document"]["format"] == "pdf" and doc["document"]["pages"] == 3
    by_page = {b["location"]["page"]: b["text"] for b in doc["blocks"]}
    assert PAGE_TEXT in by_page[1]
    assert "partial dependencies" in by_page[3]
    assert 2 not in by_page


def test_pdf_blank_page_flagged(pdf_with_blank_page):
    doc = ingest_file(pdf_with_blank_page)
    assert doc["processing"]["status"] == "completed_with_warnings"
    flagged = [w["location"] for w in doc["processing"]["warnings"] if w["code"] == "UNREADABLE_SECTION"]
    assert flagged == [{"page": 2}]
    assert [c["flagged"] for c in doc["coverage"]] == [False, True, False]


def test_docx_heading_paths(docx_file):
    doc = ingest_file(docx_file, subject_id="sub_dbms")
    assert errors(doc, "document") == []
    paths = {b["text"]: b["location"]["heading_path"] for b in doc["blocks"]}
    assert paths[PAGE_TEXT] == ["Unit 2", "Normalization"]
    assert paths["Transactions follow ACID properties."] == ["Unit 3"]
    table = next(b for b in doc["blocks"] if "table" in b["location"])
    assert "Atomicity | All or nothing" in table["text"]
    assert doc["document"]["pages"] is None  # DOCX has no fixed pages; none claimed


def test_pptx_slides_notes_and_flags(pptx_with_empty_slide):
    doc = ingest_file(pptx_with_empty_slide)
    assert errors(doc, "document") == []
    body = next(b for b in doc["blocks"] if b["text"] == PAGE_TEXT)
    assert body["location"]["slide"] == 1 and body["location"]["heading_path"] == ["Normalization"]
    notes = next(b for b in doc["blocks"] if b["location"].get("notes"))
    assert notes["location"]["slide"] == 1
    fd = next(b for b in doc["blocks"] if b["text"].startswith("A determines B"))
    assert fd["location"]["heading_path"] == ["Functional dependencies"]
    flagged = [w["location"] for w in doc["processing"]["warnings"] if w["code"] == "UNREADABLE_SECTION"]
    assert flagged == [{"slide": 2}]


def test_corrupt_file_fails_without_partial_output(tmp_path):
    bad = tmp_path / "broken.pdf"
    bad.write_bytes(b"not a pdf at all")
    doc = ingest_file(bad)
    assert errors(doc, "document") == []
    assert doc["processing"]["status"] == "failed"
    assert doc["processing"]["failure"]["code"] == "PARSE_ERROR"
    assert doc["blocks"] == []


def test_unsupported_extension_fails(tmp_path):
    f = tmp_path / "lecture.mp4"
    f.write_bytes(b"\x00" * 10)
    doc = ingest_file(f)
    assert doc["processing"]["failure"]["code"] == "UNSUPPORTED_FORMAT"
    assert doc["document"]["format"] is None


@pytest.mark.parametrize("fixture", ["pdf_with_blank_page", "docx_file", "pptx_with_empty_slide"])
def test_source_file_unchanged(fixture, request):
    path = request.getfixturevalue(fixture)
    before = _sha(path)
    doc = ingest_file(path)
    assert _sha(path) == before == doc["document"]["sha256"]


@pytest.mark.gold
@pytest.mark.skip(reason="needs labelled gold set of real IPU material (PRD Q1, Sec. 12.1)")
def test_location_accuracy_on_gold_set():
    """Sample N blocks per gold document and check each resolves to the annotated page/slide."""
