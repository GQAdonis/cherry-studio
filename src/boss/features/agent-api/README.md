# Agent API Server

REST API for agent CRUD, sessions, and messages.

## Key Files
- `src/main/apiServer/routes/agents/` — Handlers, middleware, validators
- `src/main/services/agents/` — Drizzle SQLite DB, service layer

## Upstream Impact
- Modifies: `ApiServerService.ts` (+41 lines)
- NOTE: Deeply intertwined with upstream agent system — highest conflict risk
