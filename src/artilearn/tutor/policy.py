"""Tutor decision policy (PRD Sec. 8.2, TUT-03). Pure function so scripted dialogues can test it."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class Action(StrEnum):
    EXPLAIN_THEN_CHECK = "explain_then_check"
    GUIDING_QUESTION = "guiding_question"
    HINT = "hint"
    WORKED_EXAMPLE = "worked_example"
    REVISIT_PREREQUISITE = "revisit_prerequisite"
    SIMPLIFY = "simplify"
    EXPLAIN_OWN_WORDS = "explain_own_words"
    RAISE_DIFFICULTY = "raise_difficulty"
    RECOMMEND_PRACTICE = "recommend_practice"
    CLARIFY = "clarify"


@dataclass(frozen=True)
class Situation:
    concept_known: bool = True  # False -> ask a clarifying question (TUT-03 default)
    has_history: bool = False
    has_prior_correct: bool = False
    asked_why_how: bool = False
    says_too_complex: bool = False
    last_answer_correct: bool | None = None  # None: no answer this turn
    consecutive_incorrect: int = 0  # on this concept, including the last answer
    item_prerequisite_flagged: bool = False
    prerequisite_edge_with_evidence: bool = False
    weak_justification: bool = False
    correct_streak_formats: int = 0  # distinct formats in the current correct streak
    mastery_status: str = "insufficient_evidence"


def choose_action(s: Situation) -> Action:
    if not s.concept_known:
        return Action.CLARIFY
    if s.says_too_complex:
        return Action.SIMPLIFY

    if s.last_answer_correct is None:
        if s.asked_why_how and s.has_prior_correct:
            return Action.GUIDING_QUESTION
        return Action.EXPLAIN_THEN_CHECK

    if s.last_answer_correct is False:
        wants_prereq = s.consecutive_incorrect >= 3 or s.item_prerequisite_flagged
        if wants_prereq and s.prerequisite_edge_with_evidence:
            return Action.REVISIT_PREREQUISITE
        if s.consecutive_incorrect >= 2:
            return Action.WORKED_EXAMPLE
        return Action.HINT

    if s.weak_justification:
        return Action.EXPLAIN_OWN_WORDS
    if s.correct_streak_formats >= 2:
        return Action.RAISE_DIFFICULTY
    return Action.RECOMMEND_PRACTICE  # evidence still thin; never declare mastery
