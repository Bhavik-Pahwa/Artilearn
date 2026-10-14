"""PRD Sec. 8.1 decision rules and Sec. 12.1 test cases (MAT-09, MAT-10)."""

from artilearn.verify.connectors import ConnectorPolicy
from artilearn.verify.states import EvidenceJudgement as J
from artilearn.verify.states import State, decide

import pytest


def test_no_evidence_is_unverified_never_supported():
    assert decide([]).state is State.UNVERIFIED


def test_neutral_or_low_authority_evidence_is_unverified():
    ev = [J("e1", "neutral", 0.9, 0.9), J("e2", "supports", 0.2, 0.99)]
    d = decide(ev)
    assert d.state is State.UNVERIFIED and d.evidence_ids == ()


@pytest.mark.parametrize("stances,expected", [
    (["supports"], State.SUPPORTED),
    (["contradicts"], State.CONTRADICTED),
    (["partially_supports"], State.PARTIALLY_SUPPORTED),
    (["supports", "contradicts"], State.CONFLICTING),
    (["partially_supports", "contradicts"], State.CONFLICTING),
])
def test_state_rules(stances, expected):
    ev = [J(f"e{i}", s, 0.9, 0.9) for i, s in enumerate(stances)]
    assert decide(ev).state is expected


def test_low_confidence_goes_to_review():
    assert decide([J("e1", "supports", 0.9, 0.3)]).state is State.HUMAN_REVIEW


def test_high_stakes_goes_to_review_even_when_supported():
    assert decide([J("e1", "supports", 0.9, 0.95)], high_stakes=True).state is State.HUMAN_REVIEW


def test_connector_policy_requires_licence_note():  # MAT-15
    with pytest.raises(ValueError):
        ConnectorPolicy("src", "api", 60, licence_note="")
    with pytest.raises(ValueError):
        ConnectorPolicy("src", "scrape_everything", 60, licence_note="ok")
