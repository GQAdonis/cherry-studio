import { loggerService } from '@logger'
import { e2bService } from '@main/services/E2BService'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from '@modelcontextprotocol/sdk/types.js'

const logger = loggerService.withContext('MCPServer:E2B')

/**
 * E2B MCP Server for executing code in secure cloud sandboxes
 */
class E2BServer {
  public server: Server

  constructor(_apiKey: string = '', _apiUrl?: string) {
    this.server = new Server(
      {
        name: 'e2b-server',
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
            name: 'e2b_execute_code',
            description: `Execute Python code in a secure E2B cloud sandbox. Perfect for data analysis, creating visualizations, running calculations, processing files, and any Python-based tasks. The sandbox provides a persistent Jupyter-like environment with common data science libraries pre-installed.`,
            inputSchema: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description:
                    'Python code to execute in the sandbox. Can use common libraries like pandas, numpy, matplotlib, etc.'
                },
                session_id: {
                  type: 'string',
                  description:
                    'Optional session identifier for persistent sandboxes. Use the same session_id to reuse the same sandbox and maintain state across multiple executions.'
                },
                timeout: {
                  type: 'number',
                  description: 'Optional execution timeout in milliseconds. Overrides the default timeout.',
                  default: 300000
                },
                env_vars: {
                  type: 'object',
                  description:
                    'Optional environment variables to set for this execution. Useful for passing configuration or secrets.',
                  additionalProperties: {
                    type: 'string'
                  }
                }
              },
              required: ['code']
            }
          },
          {
            name: 'e2b_list_files',
            description: 'List files and directories in the E2B sandbox at the specified path',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Directory path to list (default: /)',
                  default: '/'
                },
                session_id: {
                  type: 'string',
                  description: 'Optional session identifier for the sandbox'
                }
              }
            }
          },
          {
            name: 'e2b_read_file',
            description: 'Read file content from the E2B sandbox',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Path to the file to read'
                },
                encoding: {
                  type: 'string',
                  enum: ['utf8', 'base64'],
                  description: 'Encoding for output (default: utf8)',
                  default: 'utf8'
                },
                session_id: {
                  type: 'string',
                  description: 'Optional session identifier for the sandbox'
                }
              },
              required: ['path']
            }
          },
          {
            name: 'e2b_write_file',
            description: 'Write content to a file in the E2B sandbox',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Path to write the file'
                },
                content: {
                  type: 'string',
                  description: 'Content to write'
                },
                encoding: {
                  type: 'string',
                  enum: ['utf8', 'base64'],
                  description: 'Encoding of the content (default: utf8)',
                  default: 'utf8'
                },
                session_id: {
                  type: 'string',
                  description: 'Optional session identifier for the sandbox'
                }
              },
              required: ['path', 'content']
            }
          },
          {
            name: 'e2b_get_download_url',
            description: 'Get a public download URL for a file in the E2B sandbox',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Path to the file'
                },
                session_id: {
                  type: 'string',
                  description: 'Optional session identifier for the sandbox'
                }
              },
              required: ['path']
            }
          }
        ]
      }
    })

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      try {
        switch (name) {
          case 'e2b_execute_code': {
            const { code, session_id, timeout, env_vars } = args as any
            const result = await e2bService.executeCodeForTool({} as any, {
              code,
              session_id,
              timeout,
              env_vars
            })
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            }
          }

          case 'e2b_list_files': {
            const { path = '/', session_id } = args as any
            const files = await e2bService.listFiles({} as any, path, session_id)
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(files, null, 2)
                }
              ]
            }
          }

          case 'e2b_read_file': {
            const { path, encoding = 'utf8', session_id } = args as any
            const content = await e2bService.readFile({} as any, { path, encoding }, session_id)
            return {
              content: [
                {
                  type: 'text',
                  text: content
                }
              ]
            }
          }

          case 'e2b_write_file': {
            const { path, content, encoding = 'utf8', session_id } = args as any
            const result = await e2bService.writeFile({} as any, { path, content, encoding }, session_id)
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result)
                }
              ]
            }
          }

          case 'e2b_get_download_url': {
            const { path, session_id } = args as any
            const result = await e2bService.getDownloadUrl({} as any, path, session_id)
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result)
                }
              ]
            }
          }

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Tool ${name} not found`)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error(`E2B execution error: ${errorMessage}`)
        throw new McpError(ErrorCode.InternalError, `E2B execution failed: ${errorMessage}`)
      }
    })
  }
}

export default E2BServer
