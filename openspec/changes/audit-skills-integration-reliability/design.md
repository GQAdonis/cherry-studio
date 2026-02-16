## Context
Skills functionality crosses multiple process boundaries:
- Main process: skill storage providers, matching providers, agent-skill mapping, IPC orchestration.
- Preload bridge: renderer-exposed API contracts.
- Renderer runtime: assistant state, chat orchestration, AI middleware composition.
- aiCore runtime: plugin/middleware parameter transformation before provider conversion.

Recent incidents show contract drift between these layers can pass unit-level checks while failing in production integration paths.

## Goals / Non-Goals
- Goals:
  - Define auditable end-to-end requirements for skills lifecycle behavior.
  - Ensure known incidents are codified as failing-first integration regressions.
  - Enforce clean verification gates for skills-focused work.
- Non-Goals:
  - Redesigning the full skills product UX.
  - Migrating existing non-skills test suites.
  - Replacing current provider architecture.

## Decisions
- Decision: Use integration-first verification for skills critical paths.
  - Rationale: Unit tests alone missed cross-boundary payload shape failures.
- Decision: Define an incident corpus and require one or more regression tests per incident.
  - Rationale: “All issues we have had” needs deterministic, reviewable scope.
- Decision: Enforce 100% coverage for the incident regression suite, not the entire repository.
  - Rationale: Full-repo 100% is not practical here; incident-suite 100% is strict and actionable.
- Decision: Keep spec deltas separated by capability.
  - Rationale: Enables incremental implementation and clear ownership across subsystems.

## Risks / Trade-offs
- Risk: Existing unrelated baseline failures can mask skills changes.
  - Mitigation: Add a skills-focused verification target and report repo-wide blockers separately.
- Risk: Test doubles can diverge from real runtime wiring.
  - Mitigation: Require real boundary integration tests (IPC/preload/aiCore composition) for incident paths.
- Risk: Scope expansion from “all skills features.”
  - Mitigation: Explicitly enumerate lifecycle surfaces and acceptance criteria in spec deltas.

## Migration Plan
1. Introduce capability specs and implementation tasks.
2. Build/expand integration tests by lifecycle stage.
3. Add incident-suite coverage gate and clean verification gate.
4. Run strict validation and merge once all acceptance criteria pass.

## Open Questions
- Whether additional historical incidents exist outside repository-visible sources (`SKILLS_INTEGRATION_FIXES.md`, current regression tests, production logs shared in chat). If yes, they will be appended to the incident corpus list before implementation starts.
