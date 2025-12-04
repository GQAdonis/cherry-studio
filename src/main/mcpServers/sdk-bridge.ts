/**
 * SDK Bridge MCP Server
 *
 * This server acts as a bridge for tools registered by external apps via the @theboss/sdk.
 * It dynamically manages tools that are registered and unregistered by SDK clients.
 */

import { loggerService } from '@logger'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { EventEmitter } from 'events'

const logger = loggerService.withContext('SDKBridgeServer')

export interface SDKTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  appId: string
  appName: string
  handler?: (args: Record<string, unknown>) => Promise<unknown>
}

export interface SDKToolCallRequest {
  toolName: string
  appId: string
  args: Record<string, unknown>
  callId: string
}

export interface SDKToolCallResponse {
  callId: string
  success: boolean
  result?: unknown
  error?: string
}

// Event emitter for SDK tool communication
class SDKToolEventEmitter extends EventEmitter {
  private static instance: SDKToolEventEmitter

  static getInstance(): SDKToolEventEmitter {
    if (!SDKToolEventEmitter.instance) {
      SDKToolEventEmitter.instance = new SDKToolEventEmitter()
    }
    return SDKToolEventEmitter.instance
  }
}

export const sdkToolEvents = SDKToolEventEmitter.getInstance()

// Tool registry
const registeredTools: Map<string, SDKTool> = new Map()
const pendingCalls: Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }> = new Map()

/**
 * Register a tool from an SDK client
 */
export function registerSDKTool(tool: SDKTool): void {
  const toolKey = `${tool.appId}:${tool.name}`
  registeredTools.set(toolKey, tool)
  logger.info(`Registered SDK tool: ${toolKey}`)
  sdkToolEvents.emit('tool-registered', tool)
}

/**
 * Unregister a tool from an SDK client
 */
export function unregisterSDKTool(appId: string, toolName: string): void {
  const toolKey = `${appId}:${toolName}`
  registeredTools.delete(toolKey)
  logger.info(`Unregistered SDK tool: ${toolKey}`)
  sdkToolEvents.emit('tool-unregistered', { appId, toolName })
}

/**
 * Unregister all tools from an SDK client
 */
export function unregisterAllToolsForApp(appId: string): void {
  const keysToDelete: string[] = []
  for (const [key, tool] of registeredTools) {
    if (tool.appId === appId) {
      keysToDelete.push(key)
    }
  }
  keysToDelete.forEach((key) => registeredTools.delete(key))
  logger.info(`Unregistered ${keysToDelete.length} tools for app: ${appId}`)
  sdkToolEvents.emit('app-tools-unregistered', { appId, count: keysToDelete.length })
}

/**
 * Handle a tool call response from an SDK client
 */
export function handleSDKToolResponse(response: SDKToolCallResponse): void {
  const pending = pendingCalls.get(response.callId)
  if (pending) {
    pendingCalls.delete(response.callId)
    if (response.success) {
      pending.resolve(response.result)
    } else {
      pending.reject(new Error(response.error || 'Tool call failed'))
    }
  }
}

/**
 * Get all registered tools
 */
export function getRegisteredTools(): SDKTool[] {
  return Array.from(registeredTools.values())
}

/**
 * Check if a tool is registered
 */
export function isToolRegistered(appId: string, toolName: string): boolean {
  return registeredTools.has(`${appId}:${toolName}`)
}

// Generate unique call ID
function generateCallId(): string {
  return `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

const server = new Server(
  {
    name: '@cherry/sdk-bridge',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
)

// List tools handler - returns dynamically registered tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = Array.from(registeredTools.values()).map((tool) => ({
    name: `sdk_${tool.appId}_${tool.name}`,
    description: `[${tool.appName}] ${tool.description}`,
    inputSchema: tool.inputSchema
  }))

  // Add meta tools for SDK management
  tools.push({
    name: 'sdk_list_apps',
    description: 'List all connected SDK apps and their registered tools',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  })

  return { tools }
})

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  logger.debug(`SDK Bridge tool called: ${name}`, args as Record<string, unknown>)

  try {
    // Handle meta tool
    if (name === 'sdk_list_apps') {
      const apps = new Map<string, { appName: string; tools: string[] }>()

      for (const tool of registeredTools.values()) {
        if (!apps.has(tool.appId)) {
          apps.set(tool.appId, { appName: tool.appName, tools: [] })
        }
        apps.get(tool.appId)!.tools.push(tool.name)
      }

      const appList = Array.from(apps.entries()).map(([appId, info]) => ({
        appId,
        appName: info.appName,
        tools: info.tools
      }))

      return {
        content: [{ type: 'text', text: JSON.stringify(appList, null, 2) }]
      }
    }

    // Parse SDK tool name: sdk_{appId}_{toolName}
    const match = name.match(/^sdk_([^_]+)_(.+)$/)
    if (!match) {
      return {
        content: [{ type: 'text', text: `Invalid SDK tool name format: ${name}` }],
        isError: true
      }
    }

    const [, appId, toolName] = match
    const toolKey = `${appId}:${toolName}`
    const tool = registeredTools.get(toolKey)

    if (!tool) {
      return {
        content: [{ type: 'text', text: `SDK tool not found: ${toolKey}` }],
        isError: true
      }
    }

    // If the tool has a direct handler, call it
    if (tool.handler) {
      const result = await tool.handler(args as Record<string, unknown>)
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      }
    }

    // Otherwise, emit event for SDK client to handle
    const callId = generateCallId()
    const callRequest: SDKToolCallRequest = {
      toolName,
      appId,
      args: args as Record<string, unknown>,
      callId
    }

    // Create promise to wait for response
    const resultPromise = new Promise<unknown>((resolve, reject) => {
      pendingCalls.set(callId, { resolve, reject })

      // Timeout after 60 seconds
      setTimeout(() => {
        if (pendingCalls.has(callId)) {
          pendingCalls.delete(callId)
          reject(new Error('Tool call timeout'))
        }
      }, 60000)
    })

    // Emit the call request
    sdkToolEvents.emit('tool-call', callRequest)

    // Wait for response
    const result = await resultPromise

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error(`SDK Bridge tool ${name} failed:`, error as Error)
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true
    }
  }
})

class SDKBridgeServer {
  public server: Server

  constructor() {
    this.server = server
    logger.info('SDKBridgeServer initialized')
  }

  /**
   * Register a tool from external SDK
   */
  registerTool(tool: SDKTool): void {
    registerSDKTool(tool)
  }

  /**
   * Unregister a tool
   */
  unregisterTool(appId: string, toolName: string): void {
    unregisterSDKTool(appId, toolName)
  }

  /**
   * Unregister all tools for an app
   */
  unregisterAllForApp(appId: string): void {
    unregisterAllToolsForApp(appId)
  }

  /**
   * Handle response from SDK client
   */
  handleResponse(response: SDKToolCallResponse): void {
    handleSDKToolResponse(response)
  }

  /**
   * Subscribe to tool call events
   */
  onToolCall(callback: (request: SDKToolCallRequest) => void): void {
    sdkToolEvents.on('tool-call', callback)
  }

  /**
   * Get all registered tools
   */
  getTools(): SDKTool[] {
    return getRegisteredTools()
  }
}

export default SDKBridgeServer
