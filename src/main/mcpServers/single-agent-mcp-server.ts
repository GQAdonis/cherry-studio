/**
 * Single Agent MCP Server
 *
 * Exposes a single Cherry Studio agent as MCP tools for external AI clients.
 * Unlike AgentMcpServer which exposes ALL agents, this is scoped to one agent —
 * tools don't require agent_id params, making them simpler and more natural.
 */
import { loggerService } from '@logger'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'

const logger = loggerService.withContext('MCPServer:SingleAgentMcpServer')

interface AgentData {
  id: string
  name?: string
  description?: string
  model: string
  type: string
  exposed_via_mcp?: boolean
  instructions?: string
  mcps?: string[]
  allowed_tools?: string[]
}

async function getAgentById(agentId: string): Promise<AgentData | null> {
  try {
    const { AgentService } = await import('../services/agents/services/AgentService')
    const agentService = AgentService.getInstance()
    const agent = await agentService.getAgent(agentId)
    if (agent && agent.exposed_via_mcp) {
      return agent as AgentData
    }
    return null
  } catch (error) {
    logger.error('Failed to get agent', error as Error)
    return null
  }
}

class SingleAgentMcpServer {
  public server: Server
  private agentId: string

  constructor(agentId: string, agentName?: string) {
    this.agentId = agentId
    this.server = new Server(
      {
        name: `cherry-agent-${agentName || agentId}`,
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    )
    this.initialize()
  }

  private initialize() {
    const tools: Tool[] = [
      {
        name: 'invoke',
        description: 'Send a prompt to this agent and receive its response.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'The prompt or message to send to the agent'
            }
          },
          required: ['prompt']
        }
      },
      {
        name: 'get_info',
        description: 'Get detailed information about this agent.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'list_tools',
        description: 'List all MCP tools available to this agent.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    ]

    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools
    }))

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      try {
        switch (name) {
          case 'invoke':
            return await this.handleInvoke(args?.prompt as string)
          case 'get_info':
            return await this.handleGetInfo()
          case 'list_tools':
            return await this.handleListTools()
          default:
            return {
              content: [{ type: 'text', text: `Unknown tool: ${name}` }],
              isError: true
            }
        }
      } catch (error) {
        logger.error(`Error executing tool ${name}`, error as Error)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
                status: 'failed'
              })
            }
          ],
          isError: true
        }
      }
    })
  }

  private async handleInvoke(prompt: string) {
    if (!prompt) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'prompt is required' }) }],
        isError: true
      }
    }

    const agent = await getAgentById(this.agentId)
    if (!agent) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: `Agent not found or not exposed: ${this.agentId}` }) }],
        isError: true
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              status: 'acknowledged',
              agent_id: this.agentId,
              agent_name: agent.name,
              model: agent.model,
              prompt_received: prompt,
              message:
                'Agent invocation received. Full agent runtime integration is in progress. The agent configuration has been validated and the prompt has been accepted.'
            },
            null,
            2
          )
        }
      ]
    }
  }

  private async handleGetInfo() {
    const agent = await getAgentById(this.agentId)
    if (!agent) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: `Agent not found or not exposed: ${this.agentId}` }) }],
        isError: true
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              id: agent.id,
              name: agent.name,
              description: agent.description,
              model: agent.model,
              type: agent.type,
              instructions: agent.instructions ? agent.instructions.substring(0, 500) + '...' : undefined,
              mcps: agent.mcps,
              allowed_tools: agent.allowed_tools
            },
            null,
            2
          )
        }
      ]
    }
  }

  private async handleListTools() {
    const agent = await getAgentById(this.agentId)
    if (!agent) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: `Agent not found or not exposed: ${this.agentId}` }) }],
        isError: true
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              agent_id: this.agentId,
              agent_name: agent.name,
              mcps: agent.mcps || [],
              allowed_tools: agent.allowed_tools || []
            },
            null,
            2
          )
        }
      ]
    }
  }
}

export default SingleAgentMcpServer
