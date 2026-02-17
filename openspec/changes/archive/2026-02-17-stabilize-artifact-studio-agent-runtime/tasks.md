## 1. Agent Bootstrap and Defaults

- [x] 1.1 Implement deterministic upsert for built-in `artifact-studio` agent in `src/main/services/agents/services/initializeArtifactStudioAgent.ts` (no duplicate creation across restarts).
- [x] 1.2 Ensure startup hook in `src/main/index.ts` initializes Artifact Studio agent safely and idempotently.
- [x] 1.3 Apply default LLM/runtime settings for `artifact-studio` on first creation while preserving user edits on subsequent startups.
- [x] 1.4 Bind default skill mapping so `artifact-studio` includes `artifact-refiner` in effective enabled skills.

## 2. Main-Process Validation Coverage

- [x] 2.1 Add tests for agent initialization idempotency and deterministic identity in `src/main/services/agents/services/__tests__/`.
- [x] 2.2 Extend skill-resolution tests to verify `artifact-studio` includes `artifact-refiner` by default.
- [x] 2.3 Add API-level verification that `GET /v1/agents` exposes exactly one `artifact-studio` agent after restart.

## 3. Runtime Routing and Strategy Persistence

- [x] 3.1 Refactor Artifact Studio refinement path in `src/renderer/src/features/artifacts/hooks/useArtifactRefinement.ts` to execute through agent/session runtime APIs rather than direct `fetchChatCompletion` bypass.
- [x] 3.2 Persist and apply user-editable model/skill/context strategy settings in Artifact Studio runtime resolution.
- [x] 3.3 Add integration tests under `src/renderer/src/pages/artifacts/__tests__/` proving requests are tied to agent/session runtime and inherit saved strategy settings.

## 4. Streaming Protocol and Reflection Contract

- [x] 4.1 Enforce cumulative chat streaming behavior and strict code/chat partitioning in `useArtifactRefinement.ts` + `studioStreamParser.ts`.
- [x] 4.2 Ensure `<cs-studio-code>` blocks stream only to code view and are excluded from rendered chat content.
- [x] 4.3 Ensure non-targeted code blocks remain in chat flow and are not compiled as artifact source.
- [x] 4.4 Make `<cs-studio-code>` extraction the primary reflection contract; keep legacy `<cs-artifact>` handling as bounded fallback only.
- [x] 4.5 Fix and run parser/reflection tests in `src/renderer/src/features/artifacts/__tests__/studioStreamParser.test.ts` and related hook test suites.

## 5. Compile and HTMX Recovery in Active Studio UI

- [x] 5.1 Integrate `useCompilationErrorHandler` into active route components (`ArtifactPage.tsx` + `ArtifactPreviewPane.tsx`) so compile/error state is wired in production path.
- [x] 5.2 Wire `onSendAutoFix` to refinement send flow with bounded retry behavior and user-visible attempt/status state.
- [x] 5.3 Route `htmx:error` events from `ArtifactRenderer` into the same recovery pipeline.
- [x] 5.4 Unify active Studio UI to include both timeline navigation and compilation status UX (reuse `ArtifactWorkspace` or port equivalent behavior).

## 6. Persistence and Version Navigation Durability

- [x] 6.1 Extend artifact Dexie schema (`artifactDb.ts`) to persist refinement chat messages and version-linked snapshots/history metadata.
- [x] 6.2 Hydrate persisted chat/history into Redux (`store/artifacts.ts`) and restore on studio open (`ArtifactPage.tsx`).
- [x] 6.3 Provide UI controls to navigate prior versions with consistent chat/thread context restoration across reopen.
- [x] 6.4 Add persistence/reopen integration tests for chat history and version navigation durability.

## 7. Format Parity and Validation

- [x] 7.1 Preserve and enforce TSX full-file generation behavior for React artifacts in `artifactStudioPrompt.ts` and refinement pipeline.
- [x] 7.2 Enforce XHTML validation in refinement and delivery/export paths using `xhtmlValidation.ts`.
- [x] 7.3 Add parity tests verifying React and XHTML both support create/edit/reopen/recovery workflows.

## 8. Research Evidence and Design Traceability

- [x] 8.1 Replace placeholder `design.md` with research-backed analysis covering v0.dev, lovable.dev, bolt.dev, OpenAI Canvas, Claude Artifacts/Desktop, and local `/Users/gqadonis/Projects/prometheus/bolt.diy` findings.
- [x] 8.2 Include citation-backed behavior matrix and explicit mapping from each major implementation decision to evidence source.

## 9. Final Verification and Sign-off

- [x] 9.1 Run `pnpm lint` in `/Users/gqadonis/Projects/cherry-studio`.
- [x] 9.2 Run `pnpm test` in `/Users/gqadonis/Projects/cherry-studio`.
- [x] 9.3 Run `pnpm format` in `/Users/gqadonis/Projects/cherry-studio`.
- [x] 9.4 Run `pnpm build:check` in `/Users/gqadonis/Projects/cherry-studio`.
- [x] 9.5 Confirm all new/updated tests for tasks 1-8 are green and document verification evidence.
