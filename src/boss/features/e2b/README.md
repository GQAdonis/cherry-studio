# E2B Integration

Sandboxed code execution via E2B cloud.

## Key Files
- `src/main/services/E2BService.ts` — Service
- `src/main/mcpServers/e2b.ts` — MCP server
- `src/renderer/src/store/e2b.ts` — State
- `src/renderer/src/pages/settings/E2BSettings/` — Settings UI

## Upstream Impact
- Modifies: `store/settings.ts`
- Deps: `@e2b/code-interpreter`
