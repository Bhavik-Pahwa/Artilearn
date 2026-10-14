"""Rule-based aggregation of per-evidence judgements into the six verification states (PRD Sec. 8.1).

The model's job (not here) is the per-evidence stance judgement on the shown excerpt, including
deciding that a difference is only terminology/context/syllabus convention (-> "neutral" or
"supports", not "contradicts"). This module is deterministic so that MAT-09/MAT-10 are testable.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class State(StrEnum):
    SUPPORTED = "supported"
    CONTRADICTED = "contradicted"
    PARTIALLY_SUPPORTED = "partially_supported"
    CONFLICTING = "conflicting"
    UNVERIFIED = "unverified"
    HUMAN_REVIEW = "human_review"


# MAT-12: these go to the review queue; downstream use is blocked until resolved.
REVIEW_QUEUE_STATES = frozenset({State.CONTRADICTED, State.CONFLICTING, State.HUMAN_REVIEW})
# ASM-01: only these may feed question generation (reviewer approval is tracked separately).
QUESTION_ELIGIBLE_STATES = frozenset({State.SUPPORTED})


@dataclass(frozen=True)
class EvidenceJudgement:
    evidence_id: str
    stance: str  # supports | partially_supports | contradicts | neutral
    authority_rating: float  # 0..1, from the per-source policy
    confidence: float  # 0..1, judge confidence in the stance


@dataclass(frozen=True)
class VerificationConfig:
    # Placeholders; set after the labelled-claim baseline (PRD Sec. 4).
    min_authority: float = 0.7
    min_confidence: float = 0.7


@dataclass(frozen=True)
class Decision:
    state: State
    reason: str
    evidence_ids: tuple[str, ...]


def decide(
    judgements: list[EvidenceJudgement],
    *,
    high_stakes: bool = False,
    config: VerificationConfig = VerificationConfig(),
) -> Decision:
    """`high_stakes`: formula, numeric constant, legal/medical-type, or edition/syllabus dependent."""
    authoritative = [j for j in judgements if j.authority_rating >= config.min_authority]
    deciding = [j for j in authoritative if j.stance != "neutral"]
    ids = tuple(j.evidence_id for j in deciding)

    # MAT-10: no deciding evidence -> unverified, never supported. Similarity is not evidence.
    if not deciding:
        return Decision(State.UNVERIFIED, "no authoritative evidence takes a stance on the claim", ())

    if any(j.confidence < config.min_confidence for j in deciding):
        return Decision(State.HUMAN_REVIEW, "low-confidence stance judgement", ids)
    if high_stakes:
        return Decision(State.HUMAN_REVIEW, "high-stakes claim requires reviewer sign-off", ids)

    stances = {j.stance for j in deciding}
    if "contradicts" in stances and stances & {"supports", "partially_supports"}:
        return Decision(State.CONFLICTING, "authoritative sources disagree", ids)
    if "contradicts" in stances:
        return Decision(State.CONTRADICTED, "authoritative evidence contradicts the claim", ids)
    if "supports" in stances:
        return Decision(State.SUPPORTED, "authoritative evidence entails the claim", ids)
    return Decision(State.PARTIALLY_SUPPORTED, "evidence supports only part of the claim", ids)
