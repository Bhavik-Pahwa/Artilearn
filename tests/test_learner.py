"""Learner model invariants (PRD Sec. 10.2; LRN-02..04, TUT-04)."""

from datetime import datetime, timedelta, timezone

from artilearn.learner.mastery import ResponseEvent, apply_overturns, beta_ppf, estimate
from artilearn.schemas import errors

NOW = datetime(2026, 10, 14, 12, tzinfo=timezone.utc)


def ev(i, score=1.0, fmt="mcq", session="s1", graded_by="deterministic", conf=1.0, days_ago=0, hints=0):
    return ResponseEvent(f"r{i}", "stu1", "c_41", f"q{i}", graded_by, score, conf, fmt, "medium",
                         hints, session, NOW - timedelta(days=days_ago))


def test_cold_start_is_wide_and_insufficient():  # LRN-04
    m = estimate([], "stu1", "c_41", NOW)
    assert m["mean"] == 0.5 and m["interval_hi"] - m["interval_lo"] > 0.8
    assert m["status"] == "insufficient_evidence"
    assert errors(m, "mastery_estimate") == []


def test_agreement_is_not_evidence():  # TUT-04: "got it" never becomes an event, so nothing changes
    assert estimate([], "stu1", "c_41", NOW) == estimate([], "stu1", "c_41", NOW)


def test_low_confidence_rubric_grade_adds_no_weight():  # Sec. 10.2
    m = estimate([ev(1, graded_by="rubric_model", conf=0.4)], "stu1", "c_41", NOW)
    assert m["n_evidence"] == 0


def test_other_students_events_ignored():  # SEC-01 at the model layer
    other = ResponseEvent("x", "stu2", "c_41", "q", "deterministic", 1.0, 1.0, "mcq", "medium", 0, "s", NOW)
    assert estimate([other], "stu1", "c_41", NOW)["n_evidence"] == 0


def test_provisional_needs_formats_and_sessions():
    same = [ev(i) for i in range(10)]
    assert estimate(same, "stu1", "c_41", NOW)["status"] == "developing"
    varied = [ev(i, fmt="mcq" if i % 2 else "numeric", session=f"s{i % 2}") for i in range(10)]
    assert estimate(varied, "stu1", "c_41", NOW)["status"] == "provisionally_understood"
    blocked = estimate(varied, "stu1", "c_41", NOW, open_misconception=True)
    assert blocked["status"] == "developing"


def test_overturn_recomputes_from_log():  # LRN-03
    log = [ev(1, score=0.0), ev(2), ev(3)]
    fixed = apply_overturns(log, {"r1": 1.0})
    assert estimate(fixed, "stu1", "c_41", NOW) == estimate([ev(1), ev(2), ev(3)], "stu1", "c_41", NOW)


def test_decay_and_hints_reduce_weight():
    fresh = estimate([ev(1)], "stu1", "c_41", NOW)["alpha"]
    assert estimate([ev(1, days_ago=60)], "stu1", "c_41", NOW)["alpha"] < fresh
    assert estimate([ev(1, hints=2)], "stu1", "c_41", NOW)["alpha"] < fresh


def test_beta_ppf_known_values():
    assert abs(beta_ppf(0.5, 1, 1) - 0.5) < 1e-9
    assert abs(beta_ppf(0.05, 1, 1) - 0.05) < 1e-9
    assert abs(beta_ppf(0.5, 2, 2) - 0.5) < 1e-9
    assert abs(beta_ppf(0.25, 2, 1) - 0.5) < 1e-9  # CDF of Beta(2,1) is x^2
