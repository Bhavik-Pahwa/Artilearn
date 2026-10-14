# Artilearn

AI system for GGSIPU students. It turns uploaded study material (PDF, DOCX, PPTX) into a
source-linked knowledge base, verifies claims against approved references, and drives a grounded
tutor, validated quizzes and an auditable learner model.

The spec is the **AI System PRD v0.1** (place it at `docs/PRD-v0.1.md`). Requirement IDs used
throughout the code (MAT-01, TUT-04, ASM-05, ...) refer to that document.

## Setup

```sh
python -m venv .venv
.venv/Scripts/python -m pip install -e ".[dev]"   # on macOS/Linux: .venv/bin/python
.venv/Scripts/python -m pytest
```

Ingest a file (prints document JSON; exits 1 if the job failed):

```sh
python -m artilearn ingest notes.pdf --subject sub_dbms
```

## Layout

| Path | PRD | Status |
| --- | --- | --- |
| `src/artilearn/schemas/` | Sec. 9, MAT-13 | Document, question, learner-event, mastery schemas. Conditional rules enforced (no `supported` without evidence, provenance on generated items, no partial output on failed jobs) |
| `src/artilearn/ingest/` | MAT-01, 02, 11, 13 (M1) | **Implemented.** PDF/DOCX/PPTX → blocks with page/slide/paragraph + heading path; low-text units flagged; corrupt/unsupported files fail cleanly |
| `src/artilearn/verify/states.py` | Sec. 8.1, MAT-09, 10 | **Implemented.** Deterministic aggregation of per-evidence stances into the six states |
| `src/artilearn/verify/connectors.py` | MAT-08, 15 | Interface + required per-source policy. No concrete sources (blocked on Q4) |
| `src/artilearn/tutor/policy.py` | Sec. 8.2, TUT-03 | **Implemented** as a pure function. Retrieval, generation, citation validation: TODO (M2) |
| `src/artilearn/assess/validation.py` | ASM-03..05 | Activation gate + numeric/MCQ key checks. Symbolic recomputation and independent non-numeric validation: TODO (M4) |
| `src/artilearn/learner/mastery.py` | Sec. 10.2, LRN-01..04 | **Implemented.** Beta-Bernoulli with weights, decay, credible interval, "provisionally understood" policy, replay from event log |
| `src/artilearn/agent/tools.py` | Sec. 8.4, AGT-02, 03 | Tool result contract; agent loop TODO (blocked on Q5) |
| `src/artilearn/eval/` | Sec. 12 | TODO (M7) |

All numeric thresholds in config dataclasses (`IngestConfig`, `VerificationConfig`,
`MasteryConfig`) are **placeholders**. Per PRD Sec. 4, they are set after a measured baseline.

## Deviations from the PRD draft

- Document JSON adds `blocks` and `coverage` arrays (needed for MAT-01/02; not in the Sec. 9 example).
- Evidence `stance` adds `partially_supports`, needed to reach the `partially_supported` state.
- `document.format` may be `null` when the upload has an unsupported extension.

## Not in git

`data/` (uploads and derived data) is ignored. Student material must never be committed (SEC-01, Q7).
