/**
 * MCP Server Utilities
 *
 * Utilities for constructing MCPServer objects for built-in MCP servers.
 */

import { BuiltinMCPServerNames, type MCPServer } from '@renderer/types'

/**
 * Creates a minimal MCPServer object for a built-in (in-memory) MCP server.
 *
 * @param name - The name of the built-in MCP server (e.g., '@cherry/minapp-controller')
 * @returns An MCPServer object suitable for use with window.api.mcp.callTool
 */
export function createBuiltinMCPServer(name: string): MCPServer {
  return {
    id: name,
    name: name,
    type: 'inMemory',
    isActive: true
  }
}

/**
 * Pre-configured MCPServer object for the Mini-App Controller server.
 * Use this when calling MCP tools like 'extract_page_content' or 'extract_conversations'.
 */
export const minappControllerServer = createBuiltinMCPServer(BuiltinMCPServerNames.minappController)

/**
 * Pre-configured MCPServer object for the Browser Automation server.
 * Use this for vision-friendly browser automation tools.
 */
export const browserAutomationServer = createBuiltinMCPServer(BuiltinMCPServerNames.browserAutomation)

/**
 * Pre-configured MCPServer object for the SDK Bridge server.
 * Use this for dynamic SDK tool registration.
 */
export const sdkBridgeServer = createBuiltinMCPServer(BuiltinMCPServerNames.sdkBridge)
