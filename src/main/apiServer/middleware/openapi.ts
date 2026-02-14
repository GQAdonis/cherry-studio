import type { Express } from 'express'

import { loggerService } from '../../services/LoggerService'

const logger = loggerService.withContext('OpenAPIMiddleware')

/**
 * Complete OpenAPI 3.0 specification defined inline.
 *
 * swagger-jsdoc cannot be used here because it relies on scanning source .ts
 * files from disk via glob patterns. In the bundled Electron app those source
 * files do not exist – the code is compiled into a single JS bundle – so
 * swagger-jsdoc produces an empty spec and the Swagger UI shows
 * "cannot get api docs".
 *
 * Similarly, swagger-ui-express cannot be used because it serves static assets
 * (JS, CSS) from node_modules/swagger-ui-dist/ which don't exist in the
 * bundled app. Instead we serve a self-contained HTML page that loads Swagger
 * UI from a CDN.
 */
const openApiSpec: Record<string, unknown> = {
  openapi: '3.0.0',
  info: {
    title: 'The Boss API',
    version: '1.0.0',
    description: 'OpenAI-compatible API for The Boss with additional Cherry-specific endpoints',
    contact: {
      name: 'The Boss',
      url: 'https://github.com/CherryHQ/cherry-studio'
    }
  },
  servers: [
    {
      url: '/',
      description: 'Current server'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Use the API key from The Boss settings'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              type: { type: 'string' },
              code: { type: 'string' }
            }
          }
        }
      },
      ChatMessage: {
        type: 'object',
        properties: {
          role: {
            type: 'string',
            enum: ['system', 'user', 'assistant', 'tool']
          },
          content: {
            oneOf: [
              { type: 'string' },
              {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    text: { type: 'string' },
                    image_url: {
                      type: 'object',
                      properties: {
                        url: { type: 'string' }
                      }
                    }
                  }
                }
              }
            ]
          },
          name: { type: 'string' },
          tool_calls: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: { type: 'string' },
                function: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    arguments: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      },
      ChatCompletionRequest: {
        type: 'object',
        required: ['model', 'messages'],
        properties: {
          model: {
            type: 'string',
            description: 'The model to use for completion, in format provider:model-id'
          },
          messages: {
            type: 'array',
            items: { $ref: '#/components/schemas/ChatMessage' }
          },
          temperature: {
            type: 'number',
            minimum: 0,
            maximum: 2,
            default: 1
          },
          max_tokens: {
            type: 'integer',
            minimum: 1
          },
          stream: {
            type: 'boolean',
            default: false
          },
          tools: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                function: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    parameters: { type: 'object' }
                  }
                }
              }
            }
          }
        }
      },
      Model: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          object: { type: 'string', enum: ['model'] },
          created: { type: 'integer' },
          owned_by: { type: 'string' }
        }
      },
      MCPServer: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          command: { type: 'string' },
          args: {
            type: 'array',
            items: { type: 'string' }
          },
          env: { type: 'object' },
          disabled: { type: 'boolean' }
        }
      },
      PermissionMode: {
        type: 'string',
        enum: ['default', 'acceptEdits', 'bypassPermissions', 'plan'],
        description: 'Permission mode for agent operations'
      },
      AgentType: {
        type: 'string',
        enum: ['claude-code'],
        description: 'Type of agent'
      },
      AgentConfiguration: {
        type: 'object',
        properties: {
          permission_mode: { $ref: '#/components/schemas/PermissionMode', default: 'default' },
          max_turns: { type: 'integer', default: 10, description: 'Maximum number of interaction turns' }
        },
        additionalProperties: true
      },
      AgentBase: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Agent name' },
          description: { type: 'string', description: 'Agent description' },
          accessible_paths: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of directory paths the agent can access'
          },
          instructions: { type: 'string', description: 'System prompt/instructions' },
          model: { type: 'string', description: 'Main model ID' },
          plan_model: { type: 'string', description: 'Optional planning model ID' },
          small_model: { type: 'string', description: 'Optional small/fast model ID' },
          mcps: { type: 'array', items: { type: 'string' }, description: 'Array of MCP tool IDs' },
          allowed_tools: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of allowed tool IDs (whitelist)'
          },
          configuration: { $ref: '#/components/schemas/AgentConfiguration' }
        },
        required: ['model', 'accessible_paths']
      },
      AgentEntity: {
        allOf: [
          { $ref: '#/components/schemas/AgentBase' },
          {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique agent identifier' },
              type: { $ref: '#/components/schemas/AgentType' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' }
            },
            required: ['id', 'type', 'created_at', 'updated_at']
          }
        ]
      },
      CreateAgentRequest: {
        allOf: [
          { $ref: '#/components/schemas/AgentBase' },
          {
            type: 'object',
            properties: {
              type: { $ref: '#/components/schemas/AgentType' },
              name: { type: 'string', minLength: 1, description: 'Agent name (required)' },
              model: { type: 'string', minLength: 1, description: 'Main model ID (required)' }
            },
            required: ['type', 'name', 'model']
          }
        ]
      },
      UpdateAgentRequest: {
        type: 'object',
        description: 'Partial update - all fields are optional',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          accessible_paths: { type: 'array', items: { type: 'string' } },
          instructions: { type: 'string' },
          model: { type: 'string' },
          plan_model: { type: 'string' },
          small_model: { type: 'string' },
          mcps: { type: 'array', items: { type: 'string' } },
          allowed_tools: { type: 'array', items: { type: 'string' } },
          configuration: { $ref: '#/components/schemas/AgentConfiguration' }
        }
      },
      ReplaceAgentRequest: { $ref: '#/components/schemas/AgentBase' },
      SessionEntity: {
        allOf: [
          { $ref: '#/components/schemas/AgentBase' },
          {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique session identifier' },
              agent_id: { type: 'string', description: 'Primary agent ID' },
              agent_type: { $ref: '#/components/schemas/AgentType' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' }
            },
            required: ['id', 'agent_id', 'agent_type', 'created_at', 'updated_at']
          }
        ]
      },
      CreateSessionRequest: {
        allOf: [
          { $ref: '#/components/schemas/AgentBase' },
          {
            type: 'object',
            properties: {
              model: { type: 'string', minLength: 1, description: 'Main model ID (required)' }
            },
            required: ['model']
          }
        ]
      },
      UpdateSessionRequest: {
        type: 'object',
        description: 'Partial update - all fields are optional',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          accessible_paths: { type: 'array', items: { type: 'string' } },
          instructions: { type: 'string' },
          model: { type: 'string' },
          plan_model: { type: 'string' },
          small_model: { type: 'string' },
          mcps: { type: 'array', items: { type: 'string' } },
          allowed_tools: { type: 'array', items: { type: 'string' } },
          configuration: { $ref: '#/components/schemas/AgentConfiguration' }
        }
      },
      ReplaceSessionRequest: {
        allOf: [
          { $ref: '#/components/schemas/AgentBase' },
          {
            type: 'object',
            properties: {
              model: { type: 'string', minLength: 1, description: 'Main model ID (required)' }
            },
            required: ['model']
          }
        ]
      },
      CreateSessionMessageRequest: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string', minLength: 1, description: 'Message content' }
        }
      },
      ErrorResponse: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['message', 'type', 'code'],
            properties: {
              message: { type: 'string' },
              type: { type: 'string' },
              code: { type: 'string' }
            }
          }
        }
      },
      ListAgentsResponse: {
        type: 'object',
        required: ['agents', 'total', 'limit', 'offset'],
        properties: {
          agents: { type: 'array', items: { $ref: '#/components/schemas/AgentEntity' } },
          total: { type: 'integer' },
          limit: { type: 'integer' },
          offset: { type: 'integer' }
        }
      },
      ListSessionsResponse: {
        type: 'object',
        required: ['sessions', 'total', 'limit', 'offset'],
        properties: {
          sessions: { type: 'array', items: { $ref: '#/components/schemas/SessionEntity' } },
          total: { type: 'integer' },
          limit: { type: 'integer' },
          offset: { type: 'integer' }
        }
      }
    }
  },
  security: [{ BearerAuth: [] }],
  paths: {
    '/': {
      get: {
        summary: 'API information',
        description: 'Get basic API information and available endpoints',
        tags: ['General'],
        security: [],
        responses: {
          '200': {
            description: 'API information',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'The Boss API' },
                    version: { type: 'string', example: '1.0.0' },
                    endpoints: { type: 'object' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/health': {
      get: {
        summary: 'Health check endpoint',
        description: 'Check server status (no authentication required)',
        tags: ['Health'],
        security: [],
        responses: {
          '200': {
            description: 'Server is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                    version: { type: 'string', example: '1.0.0' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/v1/chat/completions': {
      post: {
        summary: 'Create chat completion',
        description: 'Create a chat completion response, compatible with OpenAI API',
        tags: ['Chat'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ChatCompletionRequest' } } }
        },
        responses: {
          '200': {
            description: 'Chat completion response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    object: { type: 'string', example: 'chat.completion' },
                    created: { type: 'integer' },
                    model: { type: 'string' },
                    choices: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          index: { type: 'integer' },
                          message: { $ref: '#/components/schemas/ChatMessage' },
                          finish_reason: { type: 'string' }
                        }
                      }
                    },
                    usage: {
                      type: 'object',
                      properties: {
                        prompt_tokens: { type: 'integer' },
                        completion_tokens: { type: 'integer' },
                        total_tokens: { type: 'integer' }
                      }
                    }
                  }
                }
              },
              'text/event-stream': {
                schema: { type: 'string', description: 'Server-sent events stream (when stream=true)' }
              }
            }
          },
          '400': {
            description: 'Bad request',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
          },
          '429': {
            description: 'Rate limit exceeded',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
          },
          '500': {
            description: 'Internal server error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
          }
        }
      }
    },
    '/v1/models': {
      get: {
        summary: 'List available models',
        description: 'Returns a list of available AI models from all configured providers with optional filtering',
        tags: ['Models'],
        parameters: [
          {
            in: 'query',
            name: 'providerType',
            schema: { type: 'string', enum: ['openai', 'openai-response', 'anthropic', 'gemini'] },
            description: 'Filter by provider type'
          },
          {
            in: 'query',
            name: 'offset',
            schema: { type: 'integer', minimum: 0, default: 0 },
            description: 'Pagination offset'
          },
          {
            in: 'query',
            name: 'limit',
            schema: { type: 'integer', minimum: 1 },
            description: 'Maximum number of models to return'
          }
        ],
        responses: {
          '200': {
            description: 'List of available models',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    object: { type: 'string', example: 'list' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Model' } },
                    total: { type: 'integer' },
                    offset: { type: 'integer' },
                    limit: { type: 'integer' }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Invalid query parameters',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
          },
          '503': {
            description: 'Service unavailable',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
          }
        }
      }
    },
    '/v1/messages': {
      post: {
        summary: 'Create message',
        description: "Create a message response using Anthropic's API format",
        tags: ['Messages'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['model', 'max_tokens', 'messages'],
                properties: {
                  model: {
                    type: 'string',
                    description: 'Model ID in format "provider:model_id"',
                    example: 'my-anthropic:claude-3-5-sonnet-20241022'
                  },
                  max_tokens: { type: 'integer', minimum: 1, example: 1024 },
                  messages: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        role: { type: 'string', enum: ['user', 'assistant'] },
                        content: { oneOf: [{ type: 'string' }, { type: 'array' }] }
                      }
                    }
                  },
                  system: { type: 'string' },
                  temperature: { type: 'number', minimum: 0, maximum: 1 },
                  top_p: { type: 'number', minimum: 0, maximum: 1 },
                  top_k: { type: 'integer', minimum: 0 },
                  stream: { type: 'boolean' },
                  tools: { type: 'array', description: 'Available tools for the model' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Message response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    type: { type: 'string', example: 'message' },
                    role: { type: 'string', example: 'assistant' },
                    content: { type: 'array', items: { type: 'object' } },
                    model: { type: 'string' },
                    stop_reason: { type: 'string' },
                    stop_sequence: { type: 'string' },
                    usage: {
                      type: 'object',
                      properties: { input_tokens: { type: 'integer' }, output_tokens: { type: 'integer' } }
                    }
                  }
                }
              },
              'text/event-stream': {
                schema: { type: 'string', description: 'Server-sent events stream (when stream=true)' }
              }
            }
          },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '429': { description: 'Rate limit exceeded' },
          '500': { description: 'Internal server error' }
        }
      }
    },
    '/{provider_id}/v1/messages': {
      post: {
        summary: 'Create message with provider in path',
        description: 'Create a message response using provider ID from URL path',
        tags: ['Messages'],
        parameters: [
          {
            in: 'path',
            name: 'provider_id',
            required: true,
            schema: { type: 'string' },
            description: 'Provider ID',
            example: 'my-anthropic'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['model', 'max_tokens', 'messages'],
                properties: {
                  model: { type: 'string', example: 'claude-3-5-sonnet-20241022' },
                  max_tokens: { type: 'integer', minimum: 1, example: 1024 },
                  messages: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        role: { type: 'string', enum: ['user', 'assistant'] },
                        content: { oneOf: [{ type: 'string' }, { type: 'array' }] }
                      }
                    }
                  },
                  system: { type: 'string' },
                  temperature: { type: 'number', minimum: 0, maximum: 1 },
                  top_p: { type: 'number', minimum: 0, maximum: 1 },
                  top_k: { type: 'integer', minimum: 0 },
                  stream: { type: 'boolean' },
                  tools: { type: 'array' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Message response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    type: { type: 'string', example: 'message' },
                    role: { type: 'string', example: 'assistant' },
                    content: { type: 'array', items: { type: 'object' } },
                    model: { type: 'string' },
                    stop_reason: { type: 'string' },
                    stop_sequence: { type: 'string' },
                    usage: {
                      type: 'object',
                      properties: { input_tokens: { type: 'integer' }, output_tokens: { type: 'integer' } }
                    }
                  }
                }
              },
              'text/event-stream': {
                schema: { type: 'string', description: 'Server-sent events stream (when stream=true)' }
              }
            }
          },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '429': { description: 'Rate limit exceeded' },
          '500': { description: 'Internal server error' }
        }
      }
    },
    '/v1/mcps': {
      get: {
        summary: 'List MCP servers',
        description: 'Get a list of all configured Model Context Protocol servers',
        tags: ['MCP'],
        responses: {
          '200': {
            description: 'List of MCP servers',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/MCPServer' } }
                  }
                }
              }
            }
          },
          '503': { description: 'Service unavailable' }
        }
      }
    },
    '/v1/mcps/{server_id}': {
      get: {
        summary: 'Get MCP server info',
        description: 'Get detailed information about a specific MCP server',
        tags: ['MCP'],
        parameters: [
          { in: 'path', name: 'server_id', required: true, schema: { type: 'string' }, description: 'MCP server ID' }
        ],
        responses: {
          '200': {
            description: 'MCP server information',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/MCPServer' } }
                }
              }
            }
          },
          '404': { description: 'MCP server not found' }
        }
      }
    },
    '/v1/agents': {
      post: {
        summary: 'Create a new agent',
        description:
          'Creates a new autonomous agent with the specified configuration and automatically provisions an initial session.',
        tags: ['Agents'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateAgentRequest' } } }
        },
        responses: {
          '201': {
            description: 'Agent created successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AgentEntity' } } }
          },
          '400': {
            description: 'Validation error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          },
          '500': {
            description: 'Internal server error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
          }
        }
      },
      get: {
        summary: 'List all agents',
        description: 'Retrieves a paginated list of all agents',
        tags: ['Agents'],
        parameters: [
          { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { in: 'query', name: 'offset', schema: { type: 'integer', minimum: 0, default: 0 } },
          {
            in: 'query',
            name: 'sortBy',
            schema: { type: 'string', enum: ['created_at', 'updated_at', 'name'], default: 'created_at' }
          },
          { in: 'query', name: 'orderBy', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } }
        ],
        responses: {
          '200': {
            description: 'List of agents',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ListAgentsResponse' } } }
          },
          '400': {
            description: 'Validation error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
          },
          '500': {
            description: 'Internal server error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
          }
        }
      }
    },
    '/v1/agents/{agentId}': {
      get: {
        summary: 'Get agent by ID',
        tags: ['Agents'],
        parameters: [{ in: 'path', name: 'agentId', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Agent details',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AgentEntity' } } }
          },
          '404': {
            description: 'Agent not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          }
        }
      },
      put: {
        summary: 'Replace agent (full update)',
        tags: ['Agents'],
        parameters: [{ in: 'path', name: 'agentId', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ReplaceAgentRequest' } } }
        },
        responses: {
          '200': {
            description: 'Agent updated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AgentEntity' } } }
          },
          '400': {
            description: 'Validation error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          },
          '404': {
            description: 'Agent not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          }
        }
      },
      patch: {
        summary: 'Update agent (partial update)',
        tags: ['Agents'],
        parameters: [{ in: 'path', name: 'agentId', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateAgentRequest' } } }
        },
        responses: {
          '200': {
            description: 'Agent updated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AgentEntity' } } }
          },
          '400': {
            description: 'Validation error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          },
          '404': {
            description: 'Agent not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          }
        }
      },
      delete: {
        summary: 'Delete agent',
        tags: ['Agents'],
        parameters: [{ in: 'path', name: 'agentId', required: true, schema: { type: 'string' } }],
        responses: {
          '204': { description: 'Agent deleted' },
          '404': {
            description: 'Agent not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          }
        }
      }
    },
    '/v1/agents/{agentId}/sessions': {
      post: {
        summary: 'Create a new session for an agent',
        tags: ['Sessions'],
        parameters: [{ in: 'path', name: 'agentId', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateSessionRequest' } } }
        },
        responses: {
          '201': {
            description: 'Session created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SessionEntity' } } }
          },
          '400': {
            description: 'Invalid request',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          },
          '404': {
            description: 'Agent not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          }
        }
      },
      get: {
        summary: 'List sessions for an agent',
        tags: ['Sessions'],
        parameters: [
          { in: 'path', name: 'agentId', required: true, schema: { type: 'string' } },
          { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { in: 'query', name: 'offset', schema: { type: 'integer', minimum: 0, default: 0 } },
          {
            in: 'query',
            name: 'status',
            schema: { type: 'string', enum: ['idle', 'running', 'completed', 'failed', 'stopped'] }
          }
        ],
        responses: {
          '200': {
            description: 'List of sessions',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ListSessionsResponse' } } }
          },
          '404': {
            description: 'Agent not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          }
        }
      }
    },
    '/v1/agents/{agentId}/sessions/{sessionId}': {
      get: {
        summary: 'Get session by ID',
        tags: ['Sessions'],
        parameters: [
          { in: 'path', name: 'agentId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'sessionId', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': {
            description: 'Session details',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SessionEntity' } } }
          },
          '404': {
            description: 'Not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          }
        }
      },
      put: {
        summary: 'Replace session (full update)',
        tags: ['Sessions'],
        parameters: [
          { in: 'path', name: 'agentId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'sessionId', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ReplaceSessionRequest' } } }
        },
        responses: {
          '200': {
            description: 'Session updated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SessionEntity' } } }
          },
          '400': {
            description: 'Invalid request',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          },
          '404': {
            description: 'Not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          }
        }
      },
      patch: {
        summary: 'Update session (partial update)',
        tags: ['Sessions'],
        parameters: [
          { in: 'path', name: 'agentId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'sessionId', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateSessionRequest' } } }
        },
        responses: {
          '200': {
            description: 'Session updated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SessionEntity' } } }
          },
          '400': {
            description: 'Invalid request',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          },
          '404': {
            description: 'Not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          }
        }
      },
      delete: {
        summary: 'Delete session',
        tags: ['Sessions'],
        parameters: [
          { in: 'path', name: 'agentId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'sessionId', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '204': { description: 'Session deleted' },
          '404': {
            description: 'Not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          }
        }
      }
    },
    '/v1/agents/{agentId}/sessions/{sessionId}/messages': {
      post: {
        summary: 'Send a message to a session',
        tags: ['Session Messages'],
        parameters: [
          { in: 'path', name: 'agentId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'sessionId', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateSessionMessageRequest' } } }
        },
        responses: {
          '200': { description: 'Message sent and response streamed' },
          '400': { description: 'Invalid request' },
          '404': { description: 'Agent or session not found' }
        }
      },
      get: {
        summary: 'List messages in a session',
        tags: ['Session Messages'],
        parameters: [
          { in: 'path', name: 'agentId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'sessionId', required: true, schema: { type: 'string' } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 50 } },
          { in: 'query', name: 'offset', schema: { type: 'integer', default: 0 } }
        ],
        responses: {
          '200': { description: 'List of messages' },
          '404': { description: 'Agent or session not found' }
        }
      }
    },
    '/v1/agents/{agentId}/sessions/{sessionId}/messages/{messageId}': {
      get: {
        summary: 'Get a specific message',
        tags: ['Session Messages'],
        parameters: [
          { in: 'path', name: 'agentId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'sessionId', required: true, schema: { type: 'string' } },
          { in: 'path', name: 'messageId', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Message details' },
          '404': { description: 'Not found' }
        }
      }
    }
  }
}

/**
 * Self-contained Swagger UI HTML page that loads all assets from a CDN.
 * This avoids the need for swagger-ui-express which tries to serve static
 * files from node_modules/swagger-ui-dist/ — files that don't exist in the
 * bundled Electron app.
 */
const SWAGGER_UI_VERSION = '5.18.2'

function generateSwaggerHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Boss API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}/swagger-ui.css">
  <style>
    html { box-sizing: border-box; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { color: #1890ff; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '/api-docs.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`
}

export function setupOpenAPIDocumentation(app: Express) {
  try {
    // Serve OpenAPI JSON spec
    app.get('/api-docs.json', (_req, res) => {
      res.setHeader('Content-Type', 'application/json')
      res.send(openApiSpec)
    })

    // Serve self-contained Swagger UI HTML (CDN-based, no local static files needed)
    const swaggerHtml = generateSwaggerHtml()
    app.get('/api-docs', (_req, res) => {
      res.setHeader('Content-Type', 'text/html')
      res.send(swaggerHtml)
    })

    logger.info('OpenAPI documentation ready', {
      docsPath: '/api-docs',
      specPath: '/api-docs.json'
    })
  } catch (error) {
    logger.error('Failed to setup OpenAPI documentation', { error })
  }
}
