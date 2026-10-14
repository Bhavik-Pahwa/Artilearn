"""Beta-Bernoulli mastery per concept (PRD Sec. 10.2; LRN-01..04, TUT-04).

Estimates are a pure function of the append-only event log, so an overturned grade is handled
by correcting the event and recomputing (LRN-03). Only graded response events carry weight;
utterances like "ok, got it" are not events here at all (TUT-04).
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field, replace
from datetime import datetime

MODEL_VERSION = "beta-bernoulli-0.1"


@dataclass(frozen=True)
class ResponseEvent:
    id: str
    student_id: str
    concept_id: str
    question_id: str
    graded_by: str  # deterministic | rubric_model | human
    score: float  # 0..1
    graded_confidence: float
    format: str  # mcq | short_answer | conceptual | numeric
    difficulty: str  # easy | medium | hard
    hints_used: int
    session_id: str
    timestamp: datetime


@dataclass(frozen=True)
class MasteryConfig:
    """All values are placeholders to be tuned on a development set (PRD Sec. 10.2)."""

    prior_alpha: float = 1.0
    prior_beta: float = 1.0
    difficulty_weight: dict = field(default_factory=lambda: {"easy": 0.6, "medium": 1.0, "hard": 1.3})
    hint_factor: float = 0.6  # weight multiplier per hint used
    rubric_confidence_threshold: float = 0.7  # below: no weight (Sec. 10.2)
    half_life_days: float = 30.0
    credible_mass: float = 0.9
    min_for_developing: int = 3
    k_items: int = 6  # K in "provisionally understood"
    lower_bound_level: float = 0.6


def event_weight(e: ResponseEvent, now: datetime, cfg: MasteryConfig) -> float:
    if e.graded_by == "rubric_model" and e.graded_confidence < cfg.rubric_confidence_threshold:
        return 0.0
    w = cfg.difficulty_weight[e.difficulty] * cfg.hint_factor ** e.hints_used
    age_days = max((now - e.timestamp).total_seconds(), 0.0) / 86400
    return w * 0.5 ** (age_days / cfg.half_life_days)


def estimate(
    events: list[ResponseEvent],
    student_id: str,
    concept_id: str,
    now: datetime,
    *,
    open_misconception: bool = False,
    cfg: MasteryConfig = MasteryConfig(),
) -> dict:
    alpha, beta = cfg.prior_alpha, cfg.prior_beta
    used = []
    for e in events:
        if e.student_id != student_id or e.concept_id != concept_id:
            continue
        w = event_weight(e, now, cfg)
        if w <= 0:
            continue
        alpha += w * e.score
        beta += w * (1 - e.score)
        used.append(e)

    tail = (1 - cfg.credible_mass) / 2
    lo, hi = beta_ppf(tail, alpha, beta), beta_ppf(1 - tail, alpha, beta)
    formats = sorted({e.format for e in used})
    sessions = {e.session_id for e in used}
    last = max((e.timestamp for e in used), default=None)

    if (
        len(used) >= cfg.k_items
        and len(formats) >= 2
        and len(sessions) >= 2
        and lo >= cfg.lower_bound_level
        and not open_misconception
    ):
        status = "provisionally_understood"  # never "mastered" (Sec. 10.2)
    elif len(used) >= cfg.min_for_developing:
        status = "developing"
    else:
        status = "insufficient_evidence"

    return {
        "student_id": student_id,
        "concept_id": concept_id,
        "alpha": alpha,
        "beta": beta,
        "mean": alpha / (alpha + beta),
        "interval_lo": lo,
        "interval_hi": hi,
        "n_evidence": len(used),
        "formats_seen": formats,
        "status": status,
        "last_evidence_at": last.isoformat() if last else None,
        "model_version": MODEL_VERSION,
    }


def apply_overturns(events: list[ResponseEvent], new_scores: dict[str, float]) -> list[ResponseEvent]:
    """LRN-03: return a corrected log; callers recompute estimates from it."""
    return [replace(e, score=new_scores[e.id]) if e.id in new_scores else e for e in events]


# --- Beta quantile without scipy (regularised incomplete beta, Numerical Recipes 6.4) ---

def _betacf(a: float, b: float, x: float) -> float:
    tiny, eps = 1e-300, 3e-14
    qab, qap, qam = a + b, a + 1, a - 1
    c, d = 1.0, 1 - qab * x / qap
    d = 1 / (d if abs(d) > tiny else tiny)
    h = d
    for m in range(1, 300):
        m2 = 2 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1 + aa * d
        d = 1 / (d if abs(d) > tiny else tiny)
        c = 1 + aa / c
        c = c if abs(c) > tiny else tiny
        h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1 + aa * d
        d = 1 / (d if abs(d) > tiny else tiny)
        c = 1 + aa / c
        c = c if abs(c) > tiny else tiny
        delta = d * c
        h *= delta
        if abs(delta - 1) < eps:
            break
    return h


def beta_cdf(x: float, a: float, b: float) -> float:
    if x <= 0:
        return 0.0
    if x >= 1:
        return 1.0
    log_bt = math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b) + a * math.log(x) + b * math.log1p(-x)
    bt = math.exp(log_bt)
    if x < (a + 1) / (a + b + 2):
        return bt * _betacf(a, b, x) / a
    return 1 - bt * _betacf(b, a, 1 - x) / b


def beta_ppf(q: float, a: float, b: float) -> float:
    lo, hi = 0.0, 1.0
    for _ in range(80):
        mid = (lo + hi) / 2
        if beta_cdf(mid, a, b) < q:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2
