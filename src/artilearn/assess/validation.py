"""Question validation gates (PRD Sec. 7.3, milestone M4).

TODO(ASM-03): recompute numeric keys symbolically (computer-algebra library) with unit checks.
TODO(ASM-04): non-numeric keys via source-span entailment + independent second model + rules.
"""

from __future__ import annotations

import math

from artilearn.schemas import errors


def can_activate(question: dict) -> bool:
    """ASM-05: only schema-valid, `validated` questions enter active assessments."""
    return not errors(question, "question") and question["validation"]["status"] == "validated"


def check_numeric_key(stated: float, recomputed: float, *, rel_tol: float = 1e-6) -> dict:
    ok = math.isclose(stated, recomputed, rel_tol=rel_tol, abs_tol=1e-12)
    return {"name": "numeric_recompute", "result": "pass" if ok else "fail"}


def check_mcq_single_key(question: dict) -> dict:
    opts = question.get("options") or []
    key = question.get("key")
    ok = len(opts) == len(set(opts)) and opts.count(key) == 1
    return {"name": "mcq_single_correct_option", "result": "pass" if ok else "fail"}
