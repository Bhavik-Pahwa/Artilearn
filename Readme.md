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
Artilearn is a full-stack learning workspace for organising notebooks, uploading private study material, asking contextual questions, following tutor prompts, completing assessments, and reviewing activity-derived progress.

## Run locally

Requirements: Node.js 24+ and npm 11+.

```bash
npm install
npm run dev
```

The web app runs at `http://localhost:5173`; Vite proxies `/api` to the Express API at `http://127.0.0.1:8787`. Use **Enter demo workspace** to create an HTTP-only local session.

Production verification:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Implemented product areas

- Responsive shared shell with workspace, notebooks, materials, quizzes, resources, progress, tutor, and settings routes.
- Notebook create, read, update, and delete flows. Deleting a notebook retains and unlinks its materials.
- Private PDF, DOCX, and PPTX uploads up to 8 MB with client validation, server validation, file-signature checks, protected downloads, and deletion.
- Persisted assistant conversations with an explicit deterministic demo response contract.
- Tutor sessions with explicit deterministic demo guidance.
- Assessment setup, server-side scoring, persisted history, durable result review, and answer keys withheld until submission.
- Progress calculated from persisted activity events rather than invented completion percentages.
- Editable local profile and protected API routes with server-enforced ownership.
- Loading, empty, validation, error, and destructive-action confirmation states.

## Architecture

The React application is organised by feature under `src/features`, with shared UI, route definitions, domain types, session state, and an API client kept outside feature screens. The Express API is divided into routing, validation, services, authentication middleware, and repository modules.

Persistence is behind `DataRepository`. Local development uses an atomically written JSON database at `data/artilearn.json` and private files under `data/uploads`; both are ignored by Git. Tests use the in-memory repository, so the API can later move to a production database/object store without rewriting feature or route logic.

All API errors use a stable `{ error: { code, message, requestId, fieldErrors? } }` shape. User identity is read from the server session and never trusted from a request body.

## Deliberate demo boundaries

The PRD excludes real AI internals. Assistant and tutor output is therefore deterministic and labeled **Demo** throughout the interface. The local demo session is not production authentication; replace the session adapter, secure-cookie policy, JSON repository, and upload store before deployment. No email verification, password reset, billing, collaboration, or live model provider is implied.

## Fresources integration

The Resources feature uses a provider adapter under `src/features/resources`. It is intentionally a verified outbound-link directory rather than a scraped or mirrored catalogue.

- Confirmed institution labels: DTU, IGDTUW, IIIT-Delhi, and NSUT.
- Cards open `https://fresources.tech/dashboard`; its public homepage does not expose institution-specific links.
- Search and filters are omitted because no documented public searchable catalogue/API was available.
- No provider files, artwork, counts, ratings, availability claims, or protected content are copied into Artilearn.
- Provider URLs are restricted to HTTPS on `fresources.tech` and open with safe external-link attributes.

## Tests

The suite covers the provider adapter and resource UI states plus API authentication, traceable error responses, notebook/material lifecycle behavior, disguised-file rejection, pre-submit answer privacy, server scoring, durable result retrieval, and activity-derived progress. A browser smoke flow is also used during release verification to cover sign-in, notebook creation, assistant interaction, responsive resources rendering, console errors, and horizontal overflow.

## Campaign package

- [Campaign platform and release gates](campaign/artilearn-campaign-platform.md)
- [Structured art-direction spec](campaign/art-direction.json)
- [QA-passed hero prototype](campaign/assets/artilearn-bring-your-mess-hero-v3.png)
- [Editable composite](campaign/assets/artilearn-bring-your-mess-hero.svg)
- [Generation record](campaign/generation-prompt.md)

Visual execution status: **PASS — 92.4/100**. Production campaign status remains **HOLD** pending student insight validation, product proof, privacy safeguards, and an approved logo master.
