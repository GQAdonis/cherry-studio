# Skills System

Skill discovery, matching, and management framework.

## Key Files
- `src/main/services/SkillService.ts` — Lifecycle management
- `src/main/services/skillMatching/` — Embedding + hybrid matchers
- `src/renderer/src/pages/settings/SkillSettings.tsx` — Management UI
- `src/renderer/src/pages/settings/SkillCreator/` — Creation interface
- `packages/aiCore/src/core/plugins/built-in/skillPlugin.ts` — AI plugin

## Upstream Impact
- Modifies: `store/settings.ts`, `PluginBuilder.ts`, `ScriptExecutionTool.ts`
