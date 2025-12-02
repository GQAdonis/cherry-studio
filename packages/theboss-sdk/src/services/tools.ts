/**
 * Tool Service Module
 *
 * Allows apps to register themselves as MCP tools callable from Cherry Studio.
 */

import type { Transport, ToolService, ToolDefinition } from '../types'

export function createToolService(transport: Transport, appId: string, appName: string): ToolService {
  const registeredTools: Map<string, ToolDefinition> = new Map()

  // Set up tool call handler
  transport.onMessage((type, payload) => {
    if (type === 'tool-call') {
      handleToolCall(payload as { callId: string; toolName: string; args: Record<string, unknown> })
    }
  })

  async function handleToolCall(request: { callId: string; toolName: string; args: Record<string, unknown> }) {
    const tool = registeredTools.get(request.toolName)

    if (!tool) {
      transport.send('tool-call-result', {
        payload: {
          callId: request.callId,
          success: false,
          error: `Tool not found: ${request.toolName}`
        }
      })
      return
    }

    try {
      const result = await tool.handler(request.args)
      transport.send('tool-call-result', {
        payload: {
          callId: request.callId,
          success: true,
          result
        }
      })
    } catch (error) {
      transport.send('tool-call-result', {
        payload: {
          callId: request.callId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  return {
    /**
     * Register a tool
     */
    async register(definition: ToolDefinition): Promise<void> {
      // Store locally
      registeredTools.set(definition.name, definition)

      // Register with Cherry Studio
      await transport.request('tool-register', {
        appId,
        appName,
        name: definition.name,
        description: definition.description,
        inputSchema: definition.inputSchema
      })
    },

    /**
     * Unregister a tool
     */
    async unregister(name: string): Promise<void> {
      registeredTools.delete(name)
      await transport.request('tool-unregister', { name })
    },

    /**
     * List registered tools
     */
    list(): ToolDefinition[] {
      return Array.from(registeredTools.values())
    }
  }
}

