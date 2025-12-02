/**
 * MCP Service Module
 *
 * Provides access to MCP tools available in Cherry Studio.
 */

import type { Transport, MCPService, MCPTool, MCPToolCallResult } from '../types'

export function createMCPService(transport: Transport): MCPService {
  return {
    /**
     * List all available MCP tools
     */
    async listTools(): Promise<MCPTool[]> {
      return transport.request<MCPTool[]>('mcp:list-tools', {})
    },

    /**
     * Call an MCP tool
     */
    async callTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<MCPToolCallResult> {
      return transport.request<MCPToolCallResult>('mcp:call-tool', {
        serverName,
        toolName,
        arguments: args
      })
    }
  }
}

