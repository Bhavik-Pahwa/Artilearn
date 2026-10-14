"""Schema rules from PRD Sec. 9 (the conditional ◇ rules are enforced, not just documented)."""

import copy

import pytest

from artilearn.schemas import errors

SHA = "a" * 64


def base_doc():
    return {
        "schema_version": "1.0",
        "document": {"id": "doc_01", "name": "DBMS_unit2.pdf", "sha256": SHA, "format": "pdf",
                     "pages": 42, "uploaded_at": "2026-10-14T09:00:00Z"},
        "subject": {"subject_id": "sub_dbms", "syllabus_id": None},
        "processing": {"job_id": "job_7", "status": "completed", "pipeline_version": "0.1.0", "warnings": []},
        "coverage": [], "blocks": [], "structure": [], "concepts": [], "relationships": [],
        "claims": [{"id": "cl_9", "text": "...", "original_location": {"page": 10},
                    "verification": {"state": "unverified", "reason": "no evidence", "evidence_ids": [],
                                     "checked_at": "2026-10-14T09:05:00Z", "suggested_correction": None}}],
        "evidence": [],
        "generated": [{"id": "g_3", "kind": "summary", "origin": "ai_generated", "text": "...",
                       "source_links": [{"concept_id": "c_41"}], "model": "m", "prompt_version": "p3"}],
    }


def test_prd_example_is_valid():
    assert errors(base_doc(), "document") == []


def test_supported_without_evidence_rejected():  # MAT-10
    d = base_doc()
    d["claims"][0]["verification"]["state"] = "supported"
    assert errors(d, "document")


def test_correction_only_with_contradicted_or_partial():
    d = base_doc()
    v = d["claims"][0]["verification"]
    v.update(state="supported", evidence_ids=["ev_1"], suggested_correction="fix")
    assert errors(d, "document")
    v["state"] = "contradicted"
    assert errors(d, "document") == []


@pytest.mark.parametrize("field", ["origin", "model", "prompt_version", "source_links"])
def test_generated_requires_provenance(field):  # MAT-04, SEC-04
    d = base_doc()
    del d["generated"][0][field]
    assert errors(d, "document")


def test_failed_job_has_no_partial_output():  # MAT-01
    d = base_doc()
    d["claims"] = []
    d["processing"].update(status="failed", failure={"code": "PARSE_ERROR", "detail": "x"})
    assert errors(d, "document") == []
    d2 = copy.deepcopy(d)
    d2["blocks"] = [{"id": "b_0", "text": "partial", "location": {"page": 1}}]
    assert errors(d2, "document")


def test_block_without_location_rejected():
    d = base_doc()
    d["blocks"] = [{"id": "b_0", "text": "x", "location": {"heading_path": []}}]
    assert errors(d, "document")


def question(**over):
    q = {"id": "q1", "concept_ids": ["c_41"], "syllabus_unit": None, "type": "mcq", "difficulty": "easy",
         "provenance": "ai_generated", "stem": "Which NF removes partial dependencies?",
         "options": ["1NF", "2NF", "3NF", "BCNF"], "key": "2NF", "explanation": "...",
         "source_links": [{"block": "b_3"}],
         "validation": {"status": "validated", "checks": [], "validator_versions": {}}}
    q.update(over)
    return q


def test_question_schema():
    assert errors(question(), "question") == []
    assert errors(question(provenance="unknown"), "question")  # ASM-08
    q = question()
    del q["key"]
    assert errors(q, "question")
