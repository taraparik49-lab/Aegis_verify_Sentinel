# Project Aegis

A local-first demonstration workstation for reviewing fictional regulatory dossier evidence, rule references, findings, and human-review actions.

## Run & Operate

- Use the managed `artifacts/project-aegis: web` workflow to run the preview. Its command is `pnpm --filter @workspace/project-aegis run dev`; the workflow supplies the preview environment.
- `pnpm --filter @workspace/project-aegis run typecheck` — typecheck Aegis.
- `pnpm --filter @workspace/project-aegis run test` — run Aegis unit tests.
- Project Aegis does not require a database URL, API server, or external credentials.
- The separate API Server artifact is scaffolded but is not used by this local-first demo.

## Stack

- pnpm workspace, Node.js 24, TypeScript, React, Vite, Wouter, Tailwind CSS.
- PDF text-layer extraction uses PDF.js in the browser; scanned-page OCR is not implemented.
- Workspace metadata is stored in browser localStorage; uploaded source files are stored in browser IndexedDB.

## Where things live

- `artifacts/project-aegis/src/pages/WorkspacePages.tsx` — dashboard, dossier registry/detail, reviewer queue, rule register, analytics, and audit screens.
- `artifacts/project-aegis/src/lib/model.ts` — local workspace model, fictional A–H scenario fixtures, and audit history.
- `artifacts/project-aegis/src/lib/engine.ts` — deterministic synthetic rule evaluation and upload validation.
- `artifacts/project-aegis/src/lib/pdf-processing.ts` — browser PDF text-layer extraction.
- `artifacts/project-aegis/src/lib/report.ts` — dossier PDF and findings CSV export.
- `artifacts/project-aegis/src/index.css` — shared visual theme and responsive layout.

## Architecture decisions

- The demo deliberately runs without server persistence or accounts; browser-local files are not appropriate for confidential production records.
- Fictional rule text and scenarios are labeled synthetic. Matching claims are never presented as issuer verification or approval.
- Only institution-name extraction from text-layer PDFs is attempted; scanned pages and image OCR require human inspection.
- Audit chaining is a local consistency aid, not a security boundary or tamper-proof ledger.

## Product

- Review eight fictional case paths; create local dossiers; upload and preview PDF or image sources; compare extracted claims; record corrections and classifications with reasons; track findings and review dispositions; version synthetic rule references; export reports; inspect local audit history.

## User preferences

No additional standing preferences recorded.

## Gotchas

- Use the managed artifact workflow for the preview rather than starting a duplicate server; it injects the path and port settings used by the proxy.
- Resetting the demo deletes local metadata and uploaded source files from this browser profile.
- The only attached source was the master build prompt; no separate official rulebook or reference flowchart was supplied.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
