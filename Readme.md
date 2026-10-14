# Artilearn

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
