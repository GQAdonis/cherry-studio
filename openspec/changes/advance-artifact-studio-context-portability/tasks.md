## 1. Context Envelope and Data Contracts
- [x] 1.1 Define `ArtifactProjectContextEnvelope` types and project metadata extensions for source snapshot, overrides, and provenance.
- [x] 1.2 Update artifact project seed payload contract to include transferable source configuration (LLM, skills, context strategy, knowledge config).
- [x] 1.3 Add unit tests for context envelope serialization/deserialization and fallback defaults.

## 2. Database and Migration Work
- [x] 2.1 Add IndexedDB schema updates for artifact project management metadata and context envelope persistence.
- [x] 2.2 Add settings store migration for Artifact Studio governance defaults.
- [x] 2.3 Add migration tests for legacy project/settings records.

## 3. Source-to-Studio Context Portability
- [x] 3.1 Extend chat/library/studio navigation seeders to capture full source configuration context.
- [x] 3.2 Implement deterministic precedence resolution for runtime effective settings (conversation/project/source/global).
- [x] 3.3 Add integration tests proving seeded projects reproduce source behavior in Studio refinement runs.

## 4. From-Scratch Project Setup
- [x] 4.1 Implement Artifact Studio new-project setup wizard with model, skills, context-management, and knowledge configuration steps.
- [x] 4.2 Persist wizard output as project baseline context envelope before first generation.
- [x] 4.3 Add integration tests for scratch project creation and first refinement execution using selected configuration.

## 5. Artifact Project Management UX
- [x] 5.1 Add Artifact project list/detail management UI (create, clone, rename, archive/unarchive, reopen).
- [x] 5.2 Add source-context rebind action for existing projects.
- [x] 5.3 Add UI tests for project management actions and persistence.

## 6. Artifact Settings Governance
- [x] 6.1 Extend Artifact settings UI/data model to configure default inheritance policy and override permissions.
- [x] 6.2 Wire settings to runtime resolution logic and project creation defaults.
- [x] 6.3 Add tests for settings persistence and effective runtime behavior.

## 7. Knowledge Bridge
- [x] 7.1 Implement optional “create project knowledge from source chat history” flow during seed and scratch setup.
- [x] 7.2 Persist/manage project-linked knowledge assets and expose edit/reuse controls.
- [x] 7.3 Add end-to-end tests for knowledge bridge creation, editing, and downstream reuse.

## 8. Observability and Diagnostics
- [x] 8.1 Emit project-context resolution diagnostics at Studio run start.
- [x] 8.2 Ensure `skill.activation` and `context.action` visibility remains intact with project-context execution.
- [x] 8.3 Add integration tests for event/chunk visibility in seeded and scratch projects.

## 9. Verification
- [x] 9.1 Run `pnpm lint`.
- [x] 9.2 Run `pnpm test`.
- [x] 9.3 Run `pnpm format`.
- [x] 9.4 Run `pnpm build:mac:arm64`.
- [x] 9.5 Run `openspec validate advance-artifact-studio-context-portability --strict`.

## Dependencies / Parallelization
- 1.x and 2.x can proceed first in parallel.
- 3.x depends on 1.x and 2.x.
- 4.x and 5.x depend on 3.x contracts and can run in parallel.
- 6.x can run in parallel with 4.x/5.x once 2.x is complete.
- 7.x depends on 3.x and partially on 6.x policy wiring.
- 8.x depends on 3.x and 7.x runtime integration.
- 9.x runs after all implementation tasks.
