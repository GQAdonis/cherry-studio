## 1. Baseline and Incident Corpus
- [x] 1.1 Create a single skills incident corpus document in-repo that maps each known issue to one or more reproducible integration scenarios.
- [x] 1.2 Enumerate all skills lifecycle surfaces (storage, matching, agent assignment, preload API, runtime injection, script execution, UI rendering hooks) and map each to a test owner and suite.

## 2. End-to-End Skills Pipeline Tests
- [x] 2.1 Add/extend renderer integration tests that exercise real AI SDK middleware contract handling (`params.prompt` shape, system injection, fallback on skill fetch failure).
- [x] 2.2 Add integration tests that verify provider-path compatibility for both OpenAI and Anthropic conversion flows after skills injection.
- [x] 2.3 Add startup/logging order verification for renderer window source initialization to prevent logger-source warnings in runtime boot paths.

## 3. Agent Assignment and Execution Integration Tests
- [x] 3.1 Add main-process integration tests for agent-skill persistence and retrieval via IPC handlers (`set/get/add/remove/getEnabledForAgent`).
- [x] 3.2 Add preload/renderer contract tests to verify skill API exposure stays aligned with IPC channels.
- [x] 3.3 Add integration tests for skill script execution flow from tool trigger to main-process execution response/error handling.

## 4. Matching and Routing Integration Tests
- [x] 4.1 Replace logic-duplicate test helpers with tests that import and exercise actual skill plugin/matching implementations.
- [x] 4.2 Add integration tests for matching-provider fallback behavior (keyword/embedding/LLM/hybrid), including threshold and empty-result fallbacks.

## 5. Quality Gates and Coverage
- [x] 5.1 Add a skills incident regression test target and enforce 100% line/branch coverage for that target.
- [x] 5.2 Ensure `pnpm lint`, `pnpm test`, and `pnpm format` pass with no errors and no warnings for all touched skills-related files.
- [x] 5.3 Produce a verification artifact summarizing commands, pass/fail status, and coverage proof for each incident scenario.

## 6. Final Validation
- [x] 6.1 Run `openspec validate audit-skills-integration-reliability --strict` and resolve all findings.
- [x] 6.2 Re-run full verification commands and attach exact command outputs in the implementation PR description.

## Dependencies / Parallelization
- 2.x and 3.x can proceed in parallel after 1.2 completes.
- 4.x depends on 1.2 and may run parallel to late 2.x/3.x.
- 5.x depends on at least one completed regression in each of 2.x, 3.x, and 4.x.
