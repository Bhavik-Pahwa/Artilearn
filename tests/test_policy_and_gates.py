"""Tutor policy (Sec. 8.2, TUT-03), question gate (ASM-05), honest tool reporting (AGT-03)."""

import pytest

from artilearn.agent.tools import ToolResult, describe
from artilearn.assess.validation import can_activate, check_mcq_single_key, check_numeric_key
from artilearn.tutor.policy import Action, Situation, choose_action
from test_schemas import question


@pytest.mark.parametrize("situation,expected", [
    (Situation(), Action.EXPLAIN_THEN_CHECK),
    (Situation(concept_known=False), Action.CLARIFY),
    (Situation(has_history=True, has_prior_correct=True, asked_why_how=True), Action.GUIDING_QUESTION),
    (Situation(last_answer_correct=False, consecutive_incorrect=1), Action.HINT),
    (Situation(last_answer_correct=False, consecutive_incorrect=2), Action.WORKED_EXAMPLE),
    (Situation(last_answer_correct=False, consecutive_incorrect=3, prerequisite_edge_with_evidence=True),
     Action.REVISIT_PREREQUISITE),
    # no evidenced prerequisite edge -> never jump to a prerequisite
    (Situation(last_answer_correct=False, consecutive_incorrect=3), Action.WORKED_EXAMPLE),
    (Situation(says_too_complex=True), Action.SIMPLIFY),
    (Situation(last_answer_correct=True, weak_justification=True), Action.EXPLAIN_OWN_WORDS),
    (Situation(last_answer_correct=True, correct_streak_formats=2), Action.RAISE_DIFFICULTY),
    (Situation(last_answer_correct=True), Action.RECOMMEND_PRACTICE),
])
def test_tutor_policy(situation, expected):
    assert choose_action(situation) is expected


@pytest.mark.parametrize("status", ["draft", "rejected", "human_review"])
def test_only_validated_questions_activate(status):
    q = question()
    q["validation"]["status"] = status
    assert not can_activate(q)
    assert can_activate(question())


def test_key_checks():
    assert check_numeric_key(0.25, 1 / 4)["result"] == "pass"
    assert check_numeric_key(0.25, 0.26)["result"] == "fail"
    assert check_mcq_single_key(question())["result"] == "pass"
    assert check_mcq_single_key(question(key="4NF"))["result"] == "fail"


def test_failed_tool_never_described_as_success():
    r = ToolResult("start_quiz", "tc_1", ok=False, error="validated bank is empty")
    assert "failed" in describe(r) and "succeeded" not in describe(r)
    with pytest.raises(ValueError):
        ToolResult("start_quiz", "tc_2", ok=False)
