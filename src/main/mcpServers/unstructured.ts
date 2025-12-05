import { loggerService } from '@logger'
import { unstructuredService } from '@main/services/UnstructuredService'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from '@modelcontextprotocol/sdk/types.js'

const logger = loggerService.withContext('MCPServer:Unstructured')

/**
 * Unstructured MCP Server for processing documents
 */
class UnstructuredServer {
  public server: Server

  constructor(_apiKey: string = '', _apiHost?: string) {
    this.server = new Server(
      {
        name: 'unstructured-server',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    )

    this.setupRequestHandlers()
  }

  private setupRequestHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'unstructured_process_document',
            description: `Extract and process content from various document formats including PDF, Word, Excel, PowerPoint, images (with OCR), HTML, and more using Unstructured.io. Returns structured text content that can be analyzed, summarized, or used for further processing. Supports complex documents with tables, images, and multi-column layouts.`,
            inputSchema: {
              type: 'object',
              properties: {
                file_path: {
                  type: 'string',
                  description: 'Absolute path to the document file to process (e.g., /path/to/document.pdf)'
                },
                strategy: {
                  type: 'string',
                  enum: ['auto', 'fast', 'hi_res', 'ocr_only'],
                  description:
                    'Processing strategy: auto (automatic detection, default), fast (quick processing), hi_res (best quality for complex documents), ocr_only (text extraction from images)',
                  default: 'auto'
                },
                chunking_strategy: {
                  type: 'string',
                  enum: ['basic', 'by_title'],
                  description:
                    'How to chunk the document: basic (simple text chunking) or by_title (semantic chunking by document structure, default)',
                  default: 'by_title'
                }
              },
              required: ['file_path']
            }
          }
        ]
      }
    })

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      if (name !== 'unstructured_process_document') {
        throw new McpError(ErrorCode.MethodNotFound, `Tool ${name} not found`)
      }

      try {
        const { file_path, strategy, chunking_strategy } = args as any

        if (!file_path || typeof file_path !== 'string') {
          throw new McpError(ErrorCode.InvalidParams, 'file_path parameter is required and must be a string')
        }

        logger.debug(`Processing document: ${file_path}`)

        const result = await unstructuredService.processDocumentForTool({} as any, {
          file_path,
          strategy,
          chunking_strategy
        })

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error(`Unstructured processing error: ${errorMessage}`)
        throw new McpError(ErrorCode.InternalError, `Document processing failed: ${errorMessage}`)
      }
    })
  }
}

export default UnstructuredServer
