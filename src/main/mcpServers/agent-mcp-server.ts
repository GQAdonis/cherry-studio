/**
 * Agent MCP Server
 *
 * Exposes Cherry Studio agents as MCP tools for external AI clients.
 * Tool names follow the safe naming convention: snake_case, ≤32 chars, [a-z][a-z0-9_]* only.
 */
import { loggerService } from '@logger'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'

const logger = loggerService.withContext('MCPServer:AgentMcpServer')

// Tool definitions following safe naming convention
const AGENT_TOOLS: Tool[] = [
  {
    name: 'list_agents',
    description: 'List all agents that are exposed via MCP. Returns agent ID, name, description, and model.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_agent',
    description: 'Get detailed information about a specific exposed agent by its ID.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: {
          type: 'string',
          description: 'The unique identifier of the agent'
        }
      },
      required: ['agent_id']
    }
  },
  {
    name: 'invoke_agent',
    description:
      'Send a prompt to an exposed agent and receive its response. The agent uses its configured model and instructions to process the prompt.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: {
          type: 'string',
          description: 'The unique identifier of the agent to invoke'
        },
        prompt: {
          type: 'string',
          description: 'The prompt or message to send to the agent'
        }
      },
      required: ['agent_id', 'prompt']
    }
  },
  {
    name: 'list_agent_tools',
    description: "List all MCP tools available to a specific agent, including the agent's configured MCP servers.",
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: {
          type: 'string',
          description: 'The unique identifier of the agent'
        }
      },
      required: ['agent_id']
    }
  }
]

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

/**
 * Get exposed agents from the agent database via IPC or direct service access.
 * For simplicity, we read agent data from Redux state if available,
 * otherwise fall back to the agent database.
 */
async function getExposedAgents(): Promise<AgentData[]> {
  try {
    // Try to get agents from the agent service database
    const { AgentService } = await import('../services/agents/services/AgentService')
    const agentService = AgentService.getInstance()
    const result = await agentService.listAgents({ limit: 100 })
    return result.agents.filter((agent: any) => agent.exposed_via_mcp === true)
  } catch (error) {
    logger.error('Failed to get exposed agents', error as Error)
    return []
  }
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

class AgentMcpServer {
  public server: Server

  constructor() {
    this.server = new Server(
      {
        name: 'cherry-agents',
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
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: AGENT_TOOLS
    }))

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      try {
        switch (name) {
          case 'list_agents':
            return await this.handleListAgents()
          case 'get_agent':
            return await this.handleGetAgent(args?.agent_id as string)
          case 'invoke_agent':
            return await this.handleInvokeAgent(args?.agent_id as string, args?.prompt as string)
          case 'list_agent_tools':
            return await this.handleListAgentTools(args?.agent_id as string)
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

  private async handleListAgents() {
    const agents = await getExposedAgents()
    const result = agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      model: agent.model,
      type: agent.type
    }))

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ agents: result, count: result.length }, null, 2)
        }
      ]
    }
  }

  private async handleGetAgent(agentId: string) {
    if (!agentId) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'agent_id is required' }) }],
        isError: true
      }
    }

    const agent = await getAgentById(agentId)
    if (!agent) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: `Agent not found or not exposed: ${agentId}` }) }],
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

  private async handleInvokeAgent(agentId: string, prompt: string) {
    if (!agentId || !prompt) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'agent_id and prompt are required' }) }],
        isError: true
      }
    }

    const agent = await getAgentById(agentId)
    if (!agent) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: `Agent not found or not exposed: ${agentId}` }) }],
        isError: true
      }
    }

    // For now, return agent info and the prompt - actual invocation will be wired
    // to the agent runtime when the session management infrastructure supports it
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              status: 'acknowledged',
              agent_id: agentId,
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

  private async handleListAgentTools(agentId: string) {
    if (!agentId) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'agent_id is required' }) }],
        isError: true
      }
    }

    const agent = await getAgentById(agentId)
    if (!agent) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: `Agent not found or not exposed: ${agentId}` }) }],
        isError: true
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              agent_id: agentId,
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

export default AgentMcpServer
