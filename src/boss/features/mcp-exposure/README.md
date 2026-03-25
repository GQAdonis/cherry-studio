# MCP Exposure

Publish agents and knowledge bases to external AI tools via MCP protocol.

## Key Files
- `src/main/mcpServers/agent-mcp-server.ts` — All agents as MCP tools
- `src/main/mcpServers/single-agent-mcp-server.ts` — Single agent isolation
- `src/main/mcpServers/knowledge-mcp-server.ts` — KB exposure
- `src/main/mcpServers/adapters/` — Claude, ChatGPT, Gemini, Perplexity adapters
- `src/main/apiServer/services/mcp-expose.ts` — Multi-client transport

## Upstream Impact
- Modifies: `MCPService.ts` (+24 lines)
