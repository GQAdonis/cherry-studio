/**
 * Knowledge Base MCP Server
 *
 * Exposes Cherry Studio knowledge bases as MCP tools for external AI clients.
 * Tool names follow the safe naming convention: snake_case, ≤32 chars, [a-z][a-z0-9_]* only.
 */
import { loggerService } from '@logger'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import type { KnowledgeBase } from '@types'

import { reduxService } from '../services/ReduxService'

const logger = loggerService.withContext('MCPServer:KnowledgeMcpServer')

// Tool definitions following safe naming convention
const KNOWLEDGE_TOOLS: Tool[] = [
  {
    name: 'list_knowledge_bases',
    description:
      'List all knowledge bases that are exposed via MCP. Returns KB ID, name, description, model, and document count.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'search_knowledge',
    description:
      'Perform a RAG (Retrieval Augmented Generation) search across a specific knowledge base. Returns the most relevant document chunks.',
    inputSchema: {
      type: 'object',
      properties: {
        kb_id: {
          type: 'string',
          description: 'The unique identifier of the knowledge base to search'
        },
        query: {
          type: 'string',
          description: 'The search query to find relevant documents'
        },
        top_k: {
          type: 'number',
          description: 'Maximum number of results to return (default: 5, max: 20)',
          minimum: 1,
          maximum: 20
        }
      },
      required: ['kb_id', 'query']
    }
  },
  {
    name: 'get_knowledge_base',
    description: 'Get detailed information about a specific exposed knowledge base, including its configuration.',
    inputSchema: {
      type: 'object',
      properties: {
        kb_id: {
          type: 'string',
          description: 'The unique identifier of the knowledge base'
        }
      },
      required: ['kb_id']
    }
  }
]

/**
 * Get exposed knowledge bases from Redux state.
 */
async function getExposedKnowledgeBases(): Promise<KnowledgeBase[]> {
  try {
    const bases = await reduxService.select<KnowledgeBase[]>('state.knowledge.bases')
    if (!bases) return []
    return bases.filter((kb) => kb.exposedViaMcp === true)
  } catch (error) {
    logger.error('Failed to get exposed knowledge bases', error as Error)
    return []
  }
}

async function getKnowledgeBaseById(kbId: string): Promise<KnowledgeBase | null> {
  try {
    const bases = await reduxService.select<KnowledgeBase[]>('state.knowledge.bases')
    if (!bases) return null
    const kb = bases.find((b) => b.id === kbId)
    if (kb && kb.exposedViaMcp) {
      return kb
    }
    return null
  } catch (error) {
    logger.error('Failed to get knowledge base', error as Error)
    return null
  }
}

class KnowledgeMcpServer {
  public server: Server

  constructor() {
    this.server = new Server(
      {
        name: 'cherry-knowledge',
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
      tools: KNOWLEDGE_TOOLS
    }))

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      try {
        switch (name) {
          case 'list_knowledge_bases':
            return await this.handleListKnowledgeBases()
          case 'search_knowledge':
            return await this.handleSearchKnowledge(
              args?.kb_id as string,
              args?.query as string,
              args?.top_k as number | undefined
            )
          case 'get_knowledge_base':
            return await this.handleGetKnowledgeBase(args?.kb_id as string)
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

  private async handleListKnowledgeBases() {
    const bases = await getExposedKnowledgeBases()
    const result = bases.map((kb) => ({
      id: kb.id,
      name: kb.name,
      description: kb.description,
      model: kb.model?.id || 'unknown',
      document_count: kb.documentCount || kb.items?.length || 0,
      version: kb.version
    }))

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ knowledge_bases: result, count: result.length }, null, 2)
        }
      ]
    }
  }

  private async handleSearchKnowledge(kbId: string, query: string, _topK?: number) {
    if (!kbId || !query) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'kb_id and query are required' }) }],
        isError: true
      }
    }

    const kb = await getKnowledgeBaseById(kbId)
    if (!kb) {
      return {
        content: [
          { type: 'text', text: JSON.stringify({ error: `Knowledge base not found or not exposed: ${kbId}` }) }
        ],
        isError: true
      }
    }

    // topK will be used when KB search integration is completed
    // const limit = Math.min(topK || 5, 20)

    try {
      // Knowledge base search requires the KB embedding service to be running.
      // The actual search is performed via the KnowledgeService which handles
      // embedding generation and vector similarity search.
      // For now, we return KB metadata; full search integration requires
      // the IPC bridge from the renderer process to be available.
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                kb_id: kbId,
                kb_name: kb.name,
                query,
                results: [],
                result_count: 0,
                message:
                  'Knowledge base search is being integrated. The knowledge base has been validated and the query has been accepted.'
              },
              null,
              2
            )
          }
        ]
      }
    } catch (error) {
      logger.warn('Knowledge search failed, returning KB info', error as Error)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                kb_id: kbId,
                kb_name: kb.name,
                query,
                results: [],
                result_count: 0,
                message: 'Search is available when the knowledge base embedding service is running.'
              },
              null,
              2
            )
          }
        ]
      }
    }
  }

  private async handleGetKnowledgeBase(kbId: string) {
    if (!kbId) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'kb_id is required' }) }],
        isError: true
      }
    }

    const kb = await getKnowledgeBaseById(kbId)
    if (!kb) {
      return {
        content: [
          { type: 'text', text: JSON.stringify({ error: `Knowledge base not found or not exposed: ${kbId}` }) }
        ],
        isError: true
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              id: kb.id,
              name: kb.name,
              description: kb.description,
              model: kb.model?.id || 'unknown',
              dimensions: kb.dimensions,
              chunk_size: kb.chunkSize,
              chunk_overlap: kb.chunkOverlap,
              threshold: kb.threshold,
              document_count: kb.documentCount || kb.items?.length || 0,
              version: kb.version,
              created_at: kb.created_at,
              updated_at: kb.updated_at,
              item_types: [...new Set(kb.items?.map((i) => i.type) || [])]
            },
            null,
            2
          )
        }
      ]
    }
  }
}

export default KnowledgeMcpServer
