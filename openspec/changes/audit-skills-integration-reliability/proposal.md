## Why
Skills-oriented behavior is currently spread across main IPC handlers, storage/matching services, preload bindings, renderer state, and AI runtime middleware. Recent production failures (including `prompt is not iterable` during provider conversion) show that we lack a single end-to-end verification model for real integration flows.

The project also has no OpenSpec baseline for skills capabilities. This prevents consistent change review and makes regressions hard to audit against explicit requirements.

## What Changes
- Add initial OpenSpec capability baselines for skills runtime pipeline, agent assignment/execution integration, and regression quality gates.
- Define an end-to-end integration audit plan for skills features spanning main, preload, renderer, and aiCore runtime wiring.
- Require incident-driven regression tests for known skills failures with integration-level assertions on real module boundaries.
- Define quality gates for the skills audit workstream: clean lint/type/test/format runs, plus explicit coverage enforcement for the skills incident regression suite.
- Establish traceable acceptance criteria to prove skills are working in integration scenarios before sign-off.

## Impact
- Affected specs:
  - `skills-end-to-end-pipeline`
  - `skills-agent-assignment-and-execution`
  - `skills-regression-quality-gates`
- Affected code areas (planned):
  - `/Users/gqadonis/Projects/cherry-studio/src/main/services/SkillService.ts`
  - `/Users/gqadonis/Projects/cherry-studio/src/main/ipc.ts`
  - `/Users/gqadonis/Projects/cherry-studio/src/preload/index.ts`
  - `/Users/gqadonis/Projects/cherry-studio/src/renderer/src/services/ApiService.ts`
  - `/Users/gqadonis/Projects/cherry-studio/src/renderer/src/aiCore/middleware/AiSdkMiddlewareBuilder.ts`
  - `/Users/gqadonis/Projects/cherry-studio/packages/aiCore/src/core/plugins/built-in/skillPlugin.ts`
  - Skills integration and matching test suites in `src/main/__tests__` and `src/renderer/src/aiCore/middleware/__tests__`
- Notes:
  - `openspec/project.md` does not exist yet in this repository. This change proceeds with explicit capability deltas and design constraints while leaving project-level conventions to a follow-up baseline change.
