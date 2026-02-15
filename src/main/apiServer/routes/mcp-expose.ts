/**
 * MCP Exposure Routes
 *
 * Endpoints for exposing Cherry Studio resources as MCP servers for external AI tools.
 * Uses StreamableHTTP transport for compatibility with Claude Desktop, Gemini CLI, Cursor, etc.
 */
import type { Request, Response } from 'express'
import express from 'express'

import { loggerService } from '../../services/LoggerService'
import {
  getExposedServers,
  handleAgentRequest,
  handleKnowledgeRequest,
  handleProxyRequest,
  handleSingleAgentRequest,
  handleSingleKnowledgeRequest
} from '../services/mcp-expose'

const logger = loggerService.withContext('McpExposeRoutes')

const router = express.Router()

/**
 * GET /v1/mcp-servers
 * Discovery endpoint — lists all exposed MCP servers.
 * External tools use this to discover available endpoints.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    logger.debug('MCP exposure discovery request')
    const servers = await getExposedServers(req)
    return res.json({
      success: true,
      data: {
        servers,
        count: servers.length
      }
    })
  } catch (error: any) {
    logger.error('Error in MCP exposure discovery', { error })
    return res.status(500).json({
      success: false,
      error: {
        message: `Failed to retrieve exposed MCP servers: ${error.message}`,
        type: 'internal_error',
        code: 'discovery_failed'
      }
    })
  }
})

/**
 * ALL /v1/mcp-servers/agents
 * Agent MCP server endpoint — handles StreamableHTTP for agent tools.
 * Supports POST (RPC), GET (SSE stream), DELETE (session close).
 */
router.all('/agents', async (req: Request, res: Response) => {
  try {
    await handleAgentRequest(req, res)
  } catch (error: any) {
    logger.error('Error handling agent MCP request', { error })
    if (!res.headersSent) {
      res.status(500).json({
        error: {
          message: `Agent MCP request failed: ${error.message}`,
          type: 'internal_error',
          code: 'agent_mcp_error'
        }
      })
    }
  }
})

/**
 * ALL /v1/mcp-servers/agents/:agentId
 * Per-agent MCP server endpoint — scoped tools for a single agent.
 * Tools: invoke, get_info, list_tools (no agent_id param needed).
 */
router.all('/agents/:agentId', async (req: Request, res: Response) => {
  try {
    const agentId = req.params.agentId
    if (!agentId) {
      return res.status(400).json({
        error: {
          message: 'Agent ID is required',
          type: 'invalid_request',
          code: 'missing_agent_id'
        }
      })
    }
    return handleSingleAgentRequest(req, res, agentId)
  } catch (error: any) {
    logger.error('Error handling single agent MCP request', { error })
    if (!res.headersSent) {
      res.status(500).json({
        error: {
          message: `Single agent MCP request failed: ${error.message}`,
          type: 'internal_error',
          code: 'single_agent_mcp_error'
        }
      })
    }
  }
})

/**
 * ALL /v1/mcp-servers/knowledge
 * Knowledge base MCP server endpoint — handles StreamableHTTP for knowledge tools.
 * Supports POST (RPC), GET (SSE stream), DELETE (session close).
 */
router.all('/knowledge', async (req: Request, res: Response) => {
  try {
    await handleKnowledgeRequest(req, res)
  } catch (error: any) {
    logger.error('Error handling knowledge MCP request', { error })
    if (!res.headersSent) {
      res.status(500).json({
        error: {
          message: `Knowledge MCP request failed: ${error.message}`,
          type: 'internal_error',
          code: 'knowledge_mcp_error'
        }
      })
    }
  }
})

/**
 * ALL /v1/mcp-servers/knowledge/:kbId
 * Per-knowledge-base MCP server endpoint — scoped tools for a single KB.
 * Tools: search, get_info (no kb_id param needed).
 */
router.all('/knowledge/:kbId', async (req: Request, res: Response) => {
  try {
    const kbId = req.params.kbId
    if (!kbId) {
      return res.status(400).json({
        error: {
          message: 'Knowledge base ID is required',
          type: 'invalid_request',
          code: 'missing_kb_id'
        }
      })
    }
    return handleSingleKnowledgeRequest(req, res, kbId)
  } catch (error: any) {
    logger.error('Error handling single knowledge MCP request', { error })
    if (!res.headersSent) {
      res.status(500).json({
        error: {
          message: `Single knowledge MCP request failed: ${error.message}`,
          type: 'internal_error',
          code: 'single_kb_mcp_error'
        }
      })
    }
  }
})

/**
 * ALL /v1/mcp-servers/proxy/:id
 * Proxy endpoint — forwards StreamableHTTP to an exposed configured MCP server.
 * Only servers with exposedViaMcp=true and isActive=true are accessible.
 */
router.all('/proxy/:id', async (req: Request, res: Response) => {
  try {
    const serverId = req.params.id
    if (!serverId) {
      return res.status(400).json({
        error: {
          message: 'Server ID is required',
          type: 'invalid_request',
          code: 'missing_server_id'
        }
      })
    }
    return handleProxyRequest(req, res, serverId)
  } catch (error: any) {
    logger.error('Error handling proxy MCP request', { error, serverId: req.params.id })
    if (!res.headersSent) {
      res.status(500).json({
        error: {
          message: `Proxy MCP request failed: ${error.message}`,
          type: 'internal_error',
          code: 'proxy_mcp_error'
        }
      })
    }
  }
})

export { router as mcpExposeRoutes }
