/**
 * Default MCP Servers Configuration
 *
 * Defines external MCP servers that are automatically added to the application
 * on first launch or when the user resets their configuration.
 */

import type { MCPServer } from '@types'

/**
 * External MCP servers that are bundled with Cherry Studio.
 * These are not built-in (in-memory) but are configured to run via npx/node.
 */
export const DEFAULT_EXTERNAL_MCP_SERVERS: Partial<MCPServer>[] = [
  {
    id: 'playwright-mcp',
    name: 'Playwright Browser',
    type: 'stdio',
    command: 'npx',
    args: ['@playwright/mcp@latest'],
    description:
      'Official Microsoft Playwright MCP for external browser automation. Enables AI to control browsers outside of Cherry Studio.',
    isActive: false, // Disabled by default - user must opt-in
    registryUrl: 'https://github.com/microsoft/playwright-mcp'
  }
]

/**
 * Built-in MCP servers that are always available.
 * These run in-memory and don't require external processes.
 */
export const BUILTIN_MCP_SERVER_DESCRIPTIONS: Record<string, string> = {
  '@cherry/minapp-controller':
    'Controls embedded mini-apps (webviews) in Cherry Studio. Extract content, navigate, click, type, and automate.',
  '@cherry/browser-automation':
    'Vision-friendly browser automation tools. Take screenshots, click at coordinates, scroll, and type.',
  '@cherry/sdk-bridge':
    'Bridge for external applications using @theboss/sdk. Enables third-party apps to register as MCP tools.',
  '@cherry/memory':
    'Persistent memory storage using a knowledge graph. Store and retrieve information across sessions.',
  '@cherry/sequentialthinking':
    'Sequential thinking tool for complex problem-solving through structured thought processes.',
  '@cherry/brave-search': 'Web search using Brave Search API. Requires BRAVE_API_KEY.',
  '@cherry/fetch': 'Fetch web content as HTML, markdown, text, or JSON.',
  '@cherry/filesystem': 'Sandboxed file system access for reading and writing files.',
  '@cherry/dify-knowledge': 'Integration with Dify knowledge bases.',
  '@cherry/python': 'Execute Python code in a sandboxed environment.',
  '@cherry/didi-mcp': 'DiDi ride-hailing services (China only). Requires DIDI_API_KEY.'
}

/**
 * Check if a server ID is a default external server
 */
export function isDefaultExternalServer(serverId: string): boolean {
  return DEFAULT_EXTERNAL_MCP_SERVERS.some((s) => s.id === serverId)
}

/**
 * Get the description for a built-in MCP server
 */
export function getBuiltinServerDescription(serverName: string): string | undefined {
  return BUILTIN_MCP_SERVER_DESCRIPTIONS[serverName]
}
