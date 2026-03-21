/**
 * MCP Exposure Service
 *
 * Manages the lifecycle of MCP exposure servers (agents, knowledge bases, configured MCP proxies).
 * Provides discovery aggregation and transport session management for external AI tools.
 */
import { loggerService } from '@main/services/LoggerService'
import type { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js'
import { isJSONRPCRequest, JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types.js'
import { randomUUID } from 'crypto'
import type { Request, Response } from 'express'
import type { IncomingMessage, ServerResponse } from 'http'

import AgentMcpServer from '../../mcpServers/agent-mcp-server'
import KnowledgeMcpServer from '../../mcpServers/knowledge-mcp-server'
import SingleAgentMcpServer from '../../mcpServers/single-agent-mcp-server'
import SingleKnowledgeMcpServer from '../../mcpServers/single-knowledge-mcp-server'
import { reduxService } from '../../services/ReduxService'
import { createMcpServerForTransport, getMCPServersFromRedux } from '../utils/mcp'

const logger = loggerService.withContext('McpExposeService')

/**
 * Server factory type — creates a fresh MCP Server instance per transport session.
 * This is critical for multi-client support: the MCP SDK Server class only supports
 * one transport at a time, so each concurrent client needs its own Server.
 */
type ServerFactory = () => Server | Promise<Server>

// Transport sessions keyed by `${prefix}:${sessionId}`
// Each transport has its own dedicated Server instance for multi-client isolation
const streamableTransports: Record<string, StreamableHTTPServerTransport> = {}
const sseTransports: Record<string, SSEServerTransport> = {}
const sessionServers: Record<string, Server> = {} // Track servers per session for cleanup

/**
 * Check if MCP exposure is enabled in settings
 */
async function isMcpExposureEnabled(): Promise<boolean> {
  try {
    const enabled = await reduxService.select<boolean>('state.settings.apiServer.mcpExposureEnabled')
    return enabled === true
  } catch {
    return false
  }
}

// ── Server factories ──────────────────────────────────────────────────────────
// Each factory creates a fresh, independent Server instance.

function createAgentServer(): Server {
  return new AgentMcpServer().server
}

function createKnowledgeServer(): Server {
  return new KnowledgeMcpServer().server
}

function createSingleAgentServer(agentId: string, agentName?: string): Server {
  return new SingleAgentMcpServer(agentId, agentName).server
}

function createSingleKnowledgeServer(kbId: string, kbName?: string): Server {
  return new SingleKnowledgeMcpServer(kbId, kbName).server
}

export interface ExposedServerInfo {
  id: string
  name: string
  type: 'agent' | 'knowledge' | 'mcp-proxy'
  description?: string
  url: string
}

/**
 * Get discovery info for all exposed resources
 */
export async function getExposedServers(req: Request): Promise<ExposedServerInfo[]> {
  const enabled = await isMcpExposureEnabled()
  if (!enabled) {
    return []
  }

  const baseUrl = `${req.protocol}://${req.get('host')}`
  const servers: ExposedServerInfo[] = []

  // Always include the aggregate endpoints for backward compatibility
  servers.push({
    id: 'agents',
    name: 'cherry-agents',
    type: 'agent',
    description: 'All Cherry Studio agents (aggregate)',
    url: `${baseUrl}/v1/mcp-servers/agents`
  })

  servers.push({
    id: 'knowledge',
    name: 'cherry-knowledge',
    type: 'knowledge',
    description: 'All Cherry Studio knowledge bases (aggregate)',
    url: `${baseUrl}/v1/mcp-servers/knowledge`
  })

  // List individual exposed agents
  try {
    const { AgentService } = await import('../../services/agents/services/AgentService')
    const agentService = AgentService.getInstance()
    const result = await agentService.listAgents({ limit: 100 })
    const exposedAgents = result.agents.filter((a: any) => a.exposed_via_mcp === true)
    for (const agent of exposedAgents) {
      servers.push({
        id: `agent-${agent.id}`,
        name: agent.name || agent.id,
        type: 'agent',
        description: agent.description || `Agent: ${agent.name}`,
        url: `${baseUrl}/v1/mcp-servers/agents/${agent.id}`
      })
    }
  } catch (error) {
    logger.error('Failed to get exposed agents for discovery', error as Error)
  }

  // List individual exposed knowledge bases
  try {
    const bases = await reduxService.select<any[]>('state.knowledge.bases')
    const exposedBases = (bases || []).filter((kb: any) => kb.exposedViaMcp === true)
    for (const kb of exposedBases) {
      servers.push({
        id: `kb-${kb.id}`,
        name: kb.name || kb.id,
        type: 'knowledge',
        description: kb.description || `Knowledge Base: ${kb.name}`,
        url: `${baseUrl}/v1/mcp-servers/knowledge/${kb.id}`
      })
    }
  } catch (error) {
    logger.error('Failed to get exposed knowledge bases for discovery', error as Error)
  }

  // Add consolidated proxy endpoint + individual proxied servers
  try {
    const mcpServers = await getMCPServersFromRedux()
    const exposedServers = mcpServers.filter((s) => s.isActive && s.exposedViaMcp)
    if (exposedServers.length > 0) {
      servers.push({
        id: 'proxy',
        name: 'cherry-proxy-all',
        type: 'mcp-proxy',
        description: 'All proxied MCP servers (consolidated)',
        url: `${baseUrl}/v1/mcp-servers/proxy`
      })
      for (const server of exposedServers) {
        servers.push({
          id: `proxy-${server.id}`,
          name: server.name,
          type: 'mcp-proxy',
          description: server.description || `Proxied MCP server: ${server.name}`,
          url: `${baseUrl}/v1/mcp-servers/proxy/${server.id}`
        })
      }
    }
  } catch (error) {
    logger.error('Failed to get exposed MCP servers', error as Error)
  }

  return servers
}

/**
 * Handle StreamableHTTP request for the agent MCP server
 */
export async function handleAgentRequest(req: Request, res: Response): Promise<void> {
  const enabled = await isMcpExposureEnabled()
  if (!enabled) {
    res.status(403).json({ error: 'MCP exposure is not enabled' })
    return
  }

  await handleMcpRequest(req, res, createAgentServer, 'agents')
}

/**
 * Handle StreamableHTTP request for the knowledge MCP server
 */
export async function handleKnowledgeRequest(req: Request, res: Response): Promise<void> {
  const enabled = await isMcpExposureEnabled()
  if (!enabled) {
    res.status(403).json({ error: 'MCP exposure is not enabled' })
    return
  }

  await handleMcpRequest(req, res, createKnowledgeServer, 'knowledge')
}

/**
 * Handle MCP request for a single agent by ID
 */
export async function handleSingleAgentRequest(req: Request, res: Response, agentId: string): Promise<void> {
  const enabled = await isMcpExposureEnabled()
  if (!enabled) {
    res.status(403).json({ error: 'MCP exposure is not enabled' })
    return
  }

  // Verify the agent exists and is exposed
  try {
    const { AgentService } = await import('../../services/agents/services/AgentService')
    const agentService = AgentService.getInstance()
    const agent = await agentService.getAgent(agentId)
    if (!agent || !agent.exposed_via_mcp) {
      res.status(404).json({ error: `Agent not found or not exposed: ${agentId}` })
      return
    }

    const factory = () => createSingleAgentServer(agentId, agent.name)
    await handleMcpRequest(req, res, factory, `agents/${agentId}`)
  } catch (error) {
    logger.error('Failed to handle single agent request', error as Error)
    res.status(500).json({ error: 'Failed to handle agent MCP request' })
  }
}

/**
 * Handle MCP request for a single knowledge base by ID
 */
export async function handleSingleKnowledgeRequest(req: Request, res: Response, kbId: string): Promise<void> {
  const enabled = await isMcpExposureEnabled()
  if (!enabled) {
    res.status(403).json({ error: 'MCP exposure is not enabled' })
    return
  }

  // Verify the KB exists and is exposed
  try {
    const bases = await reduxService.select<any[]>('state.knowledge.bases')
    const kb = (bases || []).find((b: any) => b.id === kbId)
    if (!kb || !kb.exposedViaMcp) {
      res.status(404).json({ error: `Knowledge base not found or not exposed: ${kbId}` })
      return
    }

    const factory = () => createSingleKnowledgeServer(kbId, kb.name)
    await handleMcpRequest(req, res, factory, `knowledge/${kbId}`)
  } catch (error) {
    logger.error('Failed to handle single knowledge request', error as Error)
    res.status(500).json({ error: 'Failed to handle knowledge MCP request' })
  }
}

/**
 * Handle StreamableHTTP request for a proxied MCP server (individual)
 */
export async function handleProxyRequest(req: Request, res: Response, serverId: string): Promise<void> {
  const enabled = await isMcpExposureEnabled()
  if (!enabled) {
    res.status(403).json({ error: 'MCP exposure is not enabled' })
    return
  }

  // Verify the server is exposed
  const servers = await getMCPServersFromRedux()
  const serverConfig = servers.find((s) => s.id === serverId)
  if (!serverConfig || !serverConfig.isActive || !serverConfig.exposedViaMcp) {
    res.status(404).json({ error: 'MCP server not found or not exposed' })
    return
  }

  try {
    const factory = () => createMcpServerForTransport(serverId)
    await handleMcpRequest(req, res, factory, `proxy/${serverId}`)
  } catch (error) {
    logger.error('Failed to handle proxy request', error as Error)
    res.status(500).json({ error: 'Failed to proxy MCP request' })
  }
}

/**
 * Generic MCP request handler supporting both StreamableHTTP and SSE transports.
 * Creates a fresh Server instance per transport session to support multiple concurrent clients.
 * - GET requests → SSE transport (legacy HTTP+SSE mode)
 * - POST requests → StreamableHTTP transport (modern mode)
 */
async function handleMcpRequest(
  req: Request,
  res: Response,
  serverFactory: ServerFactory,
  prefix: string
): Promise<void> {
  // Detect transport type from request method
  if (req.method === 'GET') {
    // Legacy SSE transport
    await handleSseRequest(req, res, serverFactory, prefix)
    return
  }

  // Modern StreamableHTTP transport (POST)
  const sessionId = req.headers['mcp-session-id'] as string | undefined
  const transportKey = sessionId ? `${prefix}:${sessionId}` : null

  let transport: StreamableHTTPServerTransport

  if (transportKey && streamableTransports[transportKey]) {
    // Reuse existing transport + server for this session
    transport = streamableTransports[transportKey]
  } else {
    // New session → fresh Server + Transport pair
    const server = await serverFactory()

    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (newSessionId) => {
        const key = `${prefix}:${newSessionId}`
        streamableTransports[key] = transport
        sessionServers[key] = server
        logger.debug('MCP StreamableHTTP session initialized', { key, transport: 'streamable-http' })
      }
    })

    transport.onclose = () => {
      if (transport.sessionId) {
        const key = `${prefix}:${transport.sessionId}`
        delete streamableTransports[key]
        delete sessionServers[key]
        logger.debug('MCP StreamableHTTP session closed', { key })
      }
    }

    await server.connect(transport)
  }

  // Parse and forward messages
  const jsonPayload = req.body
  const messages: JSONRPCMessage[] = []

  if (Array.isArray(jsonPayload)) {
    for (const payload of jsonPayload) {
      messages.push(JSONRPCMessageSchema.parse(payload))
    }
  } else {
    messages.push(JSONRPCMessageSchema.parse(jsonPayload))
  }

  // Inject metadata for proxied servers
  for (const message of messages) {
    if (isJSONRPCRequest(message)) {
      if (!message.params) {
        message.params = {}
      }
      if (!message.params._meta) {
        message.params._meta = {}
      }
      message.params._meta.exposurePrefix = prefix
    }
  }

  await transport.handleRequest(req as unknown as IncomingMessage, res as unknown as ServerResponse, messages)
}

/**
 * Handle SSE (legacy HTTP+SSE) request.
 * Each SSE connection gets its own Server instance for multi-client isolation.
 */
async function handleSseRequest(
  req: Request,
  res: Response,
  serverFactory: ServerFactory,
  prefix: string
): Promise<void> {
  const sessionId = (req.query.sessionId as string) || randomUUID()
  const transportKey = `${prefix}:${sessionId}`

  let transport: SSEServerTransport

  if (sseTransports[transportKey]) {
    // Reuse existing transport - do NOT call start() again
    transport = sseTransports[transportKey]
    logger.debug('MCP SSE session reused', { key: transportKey })
  } else {
    // New SSE session → fresh Server + Transport pair
    const server = await serverFactory()
    const postEndpoint = `/v1/mcp-servers/${prefix}`
    transport = new SSEServerTransport(postEndpoint, res as unknown as ServerResponse)
    sseTransports[transportKey] = transport
    sessionServers[transportKey] = server

    transport.onclose = () => {
      delete sseTransports[transportKey]
      delete sessionServers[transportKey]
      logger.debug('MCP SSE session closed', { key: transportKey })
    }

    await server.connect(transport)
    logger.debug('MCP SSE session initialized', { key: transportKey, transport: 'sse' })

    // Start the SSE stream ONLY for new transports (this handles the GET request)
    await transport.start()
  }
}

/**
 * Clean up all transport sessions and their associated servers
 */
export function cleanup(): void {
  // Clean up StreamableHTTP transports
  for (const key of Object.keys(streamableTransports)) {
    try {
      streamableTransports[key].close?.()
    } catch {
      // Ignore cleanup errors
    }
    delete streamableTransports[key]
  }

  // Clean up SSE transports
  for (const key of Object.keys(sseTransports)) {
    try {
      sseTransports[key].close?.()
    } catch {
      // Ignore cleanup errors
    }
    delete sseTransports[key]
  }

  // Clean up session-bound servers
  for (const key of Object.keys(sessionServers)) {
    delete sessionServers[key]
  }

  logger.info('MCP exposure service cleaned up')
}
