# Skills Incident Corpus and Integration Surface Map

This document is the canonical incident corpus for the OpenSpec change `audit-skills-integration-reliability`.

## Incident Corpus

| Incident ID | Historical Symptom | Integration Boundary | Regression Coverage |
| --- | --- | --- | --- |
| `SKILL-INC-001` | `TypeError: prompt is not iterable` during OpenAI/Anthropic conversion after skills injection | Renderer middleware -> AI SDK provider conversion | `src/renderer/src/aiCore/middleware/__tests__/AiSdkMiddlewareBuilder.skills.test.ts` (`keeps prompt as iterable...`, `keeps prompt compatible with OpenAI...`, `keeps prompt compatible with Anthropic...`) |
| `SKILL-INC-002` | Renderer skill calls used raw `window.api.invoke(...)`, causing contract drift and brittle channel strings | Renderer UI/tooling -> preload bridge | `src/renderer/src/__tests__/preload.skills.contract.test.ts`; `src/renderer/src/aiCore/tools/__tests__/ScriptExecutionTool.integration.test.ts`; `src/renderer/src/aiCore/middleware/__tests__/skills.integration.test.ts` |
| `SKILL-INC-003` | Skill assignment/execution behavior could drift from IPC handler wiring without coverage | Renderer/preload -> main IPC -> `SkillService` | `src/main/__tests__/ipc.skills.integration.test.ts` |
| `SKILL-INC-004` | Logger warning: `window source not initialized` at renderer boot | Renderer bootstrap ordering | `src/renderer/src/__tests__/entryPoint.bootstrap.test.ts` |
| `SKILL-INC-005` | Matching tests used inline plugin reimplementation that could diverge from runtime behavior | Main tests -> aiCore plugin implementation | `src/main/__tests__/skillMatching.test.ts` (now imports real `createSkillPlugin`) |

## Skills Lifecycle Surface Map

| Surface | Owner Module(s) | Integration Suite |
| --- | --- | --- |
| Storage provider management | `src/main/services/SkillService.ts`, `src/main/ipc.ts`, `src/preload/index.ts` | `src/main/__tests__/ipc.skills.integration.test.ts`, `src/renderer/src/__tests__/preload.skills.contract.test.ts` |
| Matching and routing | `src/main/services/skillMatching/*`, `packages/aiCore/src/core/plugins/built-in/skillPlugin.ts` | `src/main/__tests__/skillMatching.test.ts`, `src/renderer/src/aiCore/middleware/__tests__/skills.integration.test.ts` |
| Agent assignment | `src/main/ipc.ts`, `src/main/services/SkillService.ts`, `src/preload/index.ts` | `src/main/__tests__/ipc.skills.integration.test.ts`, `src/renderer/src/aiCore/middleware/__tests__/skills.integration.test.ts` |
| Runtime prompt injection | `src/renderer/src/aiCore/middleware/AiSdkMiddlewareBuilder.ts` | `src/renderer/src/aiCore/middleware/__tests__/AiSdkMiddlewareBuilder.skills.test.ts` |
| Script execution | `src/renderer/src/aiCore/tools/ScriptExecutionTool.ts`, `src/main/ipc.ts`, `src/main/services/SkillService.ts` | `src/renderer/src/aiCore/tools/__tests__/ScriptExecutionTool.integration.test.ts`, `src/main/__tests__/ipc.skills.integration.test.ts` |
| Renderer bootstrap/logging | `src/renderer/src/entryPoint.tsx`, `src/renderer/src/loggerBootstrap.ts` | `src/renderer/src/__tests__/entryPoint.bootstrap.test.ts` |
