import type { ContentBlockParam, MessageParam, ToolUnion, ToolUseBlock } from '@anthropic-ai/sdk/resources'
import type OpenAI from '@cherrystudio/openai'
import type {
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  ChatCompletionTool
} from '@cherrystudio/openai/resources'
import type { Content, FunctionCall, Part, Tool } from '@google/genai'
import { Type as GeminiSchemaType } from '@google/genai'
import { loggerService } from '@logger'
import { isFunctionCallingModel, isVisionModel } from '@renderer/config/models'
import i18n from '@renderer/i18n'
import { currentSpan } from '@renderer/services/SpanManagerService'
import store from '@renderer/store'
import { addMCPServer, hubMCPServer } from '@renderer/store/mcp'
import type {
  Assistant,
  MCPCallToolResponse,
  MCPServer,
  MCPTool,
  MCPToolResponse,
  Model,
  ToolUseResponse
} from '@renderer/types'
import { BuiltinMCPServerNames } from '@renderer/types'
import type { MCPToolCompleteChunk, MCPToolInProgressChunk, MCPToolPendingChunk } from '@renderer/types/chunk'
import { ChunkType } from '@renderer/types/chunk'
import type { AwsBedrockSdkMessageParam, AwsBedrockSdkTool, AwsBedrockSdkToolCall } from '@renderer/types/sdk'
import { t } from 'i18next'
import { nanoid } from 'nanoid'

import { isToolUseModeFunction } from './assistant'
import { convertBase64ImageToAwsBedrockFormat } from './aws-bedrock-utils'
import { filterProperties, processSchemaForO3 } from './mcp-schema'

const logger = loggerService.withContext('Utils:MCPTools')

export function mcpToolsToOpenAIResponseTools(mcpTools: MCPTool[]): OpenAI.Responses.Tool[] {
  return mcpTools.map((tool) => {
    const parameters = processSchemaForO3(tool.inputSchema)

    return {
      type: 'function',
      name: tool.id,
      parameters: {
        type: 'object' as const,
        ...parameters
      },
      strict: true
    } satisfies OpenAI.Responses.Tool
  })
}

export function mcpToolsToOpenAIChatTools(mcpTools: MCPTool[]): Array<ChatCompletionTool> {
  return mcpTools.map((tool) => {
    const parameters = processSchemaForO3(tool.inputSchema)

    return {
      type: 'function',
      function: {
        name: tool.id,
        description: tool.description,
        parameters: {
          type: 'object' as const,
          ...parameters
        },
        strict: true
      }
    } as ChatCompletionTool
  })
}

export function openAIToolsToMcpTool(
  mcpTools: MCPTool[],
  toolCall: OpenAI.Responses.ResponseFunctionToolCall | ChatCompletionMessageToolCall
): MCPTool | undefined {
  let toolName = ''
  try {
    if ('name' in toolCall) {
      toolName = toolCall.name
    } else if (toolCall.type === 'function' && 'function' in toolCall) {
      toolName = toolCall.function.name
    } else {
      throw new Error('Unknown tool call type')
    }
  } catch (error) {
    logger.error(`Error parsing tool call: ${toolCall}`, error as Error)
    window.toast.error(t('chat.mcp.error.parse_tool_call', { toolCall: toolCall }))
    return undefined
  }
  const tools = mcpTools.filter((mcpTool) => {
    // toolName is mcpTool.id (registered with id as function name)
    return mcpTool.id === toolName
  })
  if (tools.length > 1) {
    logger.warn(`Multiple MCP Tools found for tool call: ${toolName}`)
    window.toast.warning(t('chat.mcp.warning.multiple_tools', { tool: tools[0].name }))
  }

  if (tools.length === 0) {
    logger.warn(`No MCP Tool found for tool call: ${toolName}`)
    window.toast.warning(t('chat.mcp.warning.no_tool', { tool: toolName }))
    return undefined
  }

  return tools[0]
}

export async function callBuiltInTool(toolResponse: MCPToolResponse): Promise<MCPCallToolResponse | undefined> {
  logger.info(`[BuiltIn] Calling Built-in Tool: ${toolResponse.tool.name}`, toolResponse.tool)

  if (
    toolResponse.tool.name === 'think' &&
    typeof toolResponse.arguments === 'object' &&
    toolResponse.arguments !== null &&
    !Array.isArray(toolResponse.arguments)
  ) {
    const thought = toolResponse.arguments?.thought
    return {
      isError: false,
      content: [
        {
          type: 'text',
          text: (thought as string) || ''
        }
      ]
    }
  }

  if (
    toolResponse.tool.name === 'process_document_with_unstructured' &&
    typeof toolResponse.arguments === 'object' &&
    toolResponse.arguments !== null &&
    !Array.isArray(toolResponse.arguments)
  ) {
    try {
      const result = await window.api.unstructured.processForTool(toolResponse.arguments as any)
      return {
        isError: false,
        content: [
          {
            type: 'text',
            text: `Document processed successfully:\n\n${result.content}\n\n---\nMetadata: File type: ${result.metadata.fileType}, Strategy: ${result.metadata.strategy}, Elements: ${result.metadata.elementCount}`
          }
        ]
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Failed to process document: ${errorMessage}`
          }
        ]
      }
    }
  }

  return undefined
}

export async function callMCPTool(
  toolResponse: MCPToolResponse,
  topicId?: string,
  modelName?: string
): Promise<MCPCallToolResponse> {
  logger.info(
    `Calling Tool: ${toolResponse.id} ${toolResponse.tool.serverName} ${toolResponse.tool.name}`,
    toolResponse.tool
  )
  try {
    const server = getMcpServerByTool(toolResponse.tool)

    if (!server) {
      throw new Error(`Server not found: ${toolResponse.tool.serverName}`)
    }

    const resp = await window.api.mcp.callTool(
      {
        server,
        name: toolResponse.tool.name,
        args: toolResponse.arguments,
        callId: toolResponse.id
      },
      topicId ? currentSpan(topicId, modelName)?.spanContext() : undefined
    )
    if (toolResponse.tool.serverName === BuiltinMCPServerNames.mcpAutoInstall) {
      if (resp.data) {
        const mcpServer: MCPServer = {
          id: `f${nanoid()}`,
          name: resp.data.name,
          description: resp.data.description,
          baseUrl: resp.data.baseUrl,
          command: resp.data.command,
          args: resp.data.args,
          env: resp.data.env,
          registryUrl: '',
          isActive: false,
          provider: 'CherryAI'
        }
        store.dispatch(addMCPServer(mcpServer))
      }
    }

    logger.info(`Tool called: ${toolResponse.tool.serverName} ${toolResponse.tool.name}`, resp)
    return resp
  } catch (e) {
    logger.error(`Error calling Tool: ${toolResponse.tool.serverName} ${toolResponse.tool.name}`, e as Error)
    return Promise.resolve({
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error calling tool ${toolResponse.tool.name}: ${e instanceof Error ? e.stack || e.message || 'No error details available' : JSON.stringify(e)}`
        }
      ]
    })
  }
}

export function mcpToolsToAnthropicTools(mcpTools: MCPTool[]): Array<ToolUnion> {
  return mcpTools.map((tool) => {
    const t: ToolUnion = {
      name: tool.id,
      description: tool.description,
      // @ts-ignore ignore type as it it unknown
      input_schema: tool.inputSchema
    }
    return t
  })
}

export function anthropicToolUseToMcpTool(mcpTools: MCPTool[] | undefined, toolUse: ToolUseBlock): MCPTool | undefined {
  if (!mcpTools) return undefined
  const tools = mcpTools.filter((tool) => tool.id === toolUse.name)
  if (tools.length === 0) {
    logger.warn(`No MCP Tool found for tool call: ${toolUse.name}`)
    window.toast.warning(t('chat.mcp.warning.no_tool', { tool: toolUse.name }))
    return undefined
  }
  if (tools.length > 1) {
    logger.warn(`Multiple MCP Tools found for tool call: ${toolUse.name}`)
    window.toast.warning(t('chat.mcp.warning.multiple_tools', { tool: tools[0].name }))
  }
  return tools[0]
}

/**
 * Recursively clean schema properties for Gemini API compatibility
 * - Removes undefined values and "[undefined]" strings
 * - Ensures array items have proper schema objects
 * - Handles nested properties recursively
 * - Validates 'required' arrays against actual properties to prevent Gemini API errors
 */
function cleanSchemaForGemini(schema: any): any {
  if (!schema || typeof schema !== 'object') {
    return schema
  }

  if (Array.isArray(schema)) {
    return schema.map(cleanSchemaForGemini)
  }

  const cleaned: any = {}

  for (const [key, value] of Object.entries(schema)) {
    // GEMINI FIX: Normalize type string to uppercase (string -> STRING, array -> ARRAY)
    // Gemini API requires strict enum matching for types in Schema objects
    if (key === 'type' && typeof value === 'string') {
      cleaned[key] = value.toUpperCase()
      continue
    }

    // Handle undefined values and "[undefined]" strings
    if (value === undefined || value === '[undefined]') {
      // Special handling for array items - Gemini requires this field if present
      if (key === 'items') {
        // Provide a default schema that accepts any type
        cleaned[key] = { type: GeminiSchemaType.STRING }
      }
      // Skip other undefined values
      continue
    }

    // Recursively clean nested objects
    if (typeof value === 'object' && value !== null) {
      const cleanedValue = cleanSchemaForGemini(value)
      // Only include non-empty objects (or arrays which should always be included)
      if (Array.isArray(cleanedValue) || Object.keys(cleanedValue).length > 0) {
        cleaned[key] = cleanedValue
      }
    } else {
      cleaned[key] = value
    }
  }

  // GEMINI FIX: Enforce 'items' for array schemas if it ends up missing
  // This MUST happen AFTER all recursive processing to catch arrays at any nesting level
  // Note: we check for both 'ARRAY' (normalized) and 'array' (lowercase from original)
  if ((cleaned.type === 'ARRAY' || cleaned.type === 'array') && !cleaned.items) {
    cleaned.items = { type: GeminiSchemaType.STRING }
  }

  // GEMINI FIX: Recursively ensure all nested properties that are arrays have items
  // This catches cases where properties contain array schemas
  if (cleaned.properties && typeof cleaned.properties === 'object') {
    for (const [propKey, propValue] of Object.entries(cleaned.properties)) {
      if (propValue && typeof propValue === 'object') {
        const prop = propValue as any
        // Check if this property is an array type and missing items
        if ((prop.type === 'ARRAY' || prop.type === 'array') && !prop.items) {
          prop.items = { type: GeminiSchemaType.STRING }
        }
      }
    }
  }

  // CRITICAL: Validate 'required' array against actual properties
  // Gemini API returns "property is not defined" error if required references non-existent properties
  if (cleaned.required && Array.isArray(cleaned.required) && cleaned.properties) {
    const actualPropertyKeys = new Set(Object.keys(cleaned.properties))
    cleaned.required = cleaned.required.filter((key: string) => actualPropertyKeys.has(key))
    // Remove empty required array
    if (cleaned.required.length === 0) {
      delete cleaned.required
    }
  } else if (cleaned.required && !cleaned.properties) {
    // If there's a required array but no properties, remove it
    delete cleaned.required
  }

  return cleaned
}

/**
 * @param mcpTools
 * @returns
 */
export function mcpToolsToGeminiTools(mcpTools: MCPTool[]): Tool[] {
  return [
    {
      functionDeclarations: mcpTools?.map((tool) => {
        const filteredSchema = filterProperties(tool.inputSchema)
        const cleanedProperties = cleanSchemaForGemini(filteredSchema.properties || {})

        // Get the actual property keys from cleanedProperties
        // This ensures required only contains properties that exist after both filtering and cleaning
        const actualPropertyKeys = Object.keys(cleanedProperties)

        // Filter the required array to only include properties that actually exist
        // This prevents Gemini API errors like "property is not defined"
        const validRequired = (filteredSchema.required || []).filter((key: string) => actualPropertyKeys.includes(key))

        return {
          name: tool.id,
          description: tool.description,
          parameters: {
            type: GeminiSchemaType.OBJECT,
            properties: cleanedProperties,
            required: validRequired
          }
        }
      })
    }
  ]
}

export function geminiFunctionCallToMcpTool(
  mcpTools: MCPTool[] | undefined,
  toolCall: FunctionCall | undefined
): MCPTool | undefined {
  if (!toolCall) return undefined
  if (!mcpTools) return undefined

  const toolName = toolCall.name || toolCall.id
  if (!toolName) return undefined

  const tools = mcpTools.filter((tool) => tool.id.includes(toolName) || tool.name.includes(toolName))
  if (tools.length > 1) {
    logger.warn(`Multiple MCP Tools found for tool call: ${toolName}`)
    window.toast.warning(t('chat.mcp.warning.multiple_tools', { tool: tools[0].name }))
  }

  if (tools.length === 0) {
    logger.warn(`No MCP Tool found for tool call: ${toolName}`)
    window.toast.warning(t('chat.mcp.warning.no_tool', { tool: toolName }))
    return undefined
  }

  return tools[0]
}

export function upsertMCPToolResponse(
  results: MCPToolResponse[],
  resp: MCPToolResponse,
  onChunk: (chunk: MCPToolPendingChunk | MCPToolInProgressChunk | MCPToolCompleteChunk) => void
) {
  const index = results.findIndex((ret) => ret.id === resp.id)
  let result = resp
  if (index !== -1) {
    const cur = {
      ...results[index],
      response: resp.response,
      arguments: resp.arguments,
      status: resp.status
    }
    results[index] = cur
    result = cur
  } else {
    results.push(resp)
  }
  switch (resp.status) {
    case 'pending':
      onChunk({
        type: ChunkType.MCP_TOOL_PENDING,
        responses: [result]
      })
      break
    case 'invoking':
      onChunk({
        type: ChunkType.MCP_TOOL_IN_PROGRESS,
        responses: [result]
      })
      break
    case 'cancelled':
    case 'done':
      onChunk({
        type: ChunkType.MCP_TOOL_COMPLETE,
        responses: [result]
      })
      break
    default:
      break
  }
}

export function filterMCPTools(
  mcpTools: MCPTool[] | undefined,
  enabledServers: MCPServer[] | undefined
): MCPTool[] | undefined {
  if (mcpTools) {
    if (enabledServers) {
      mcpTools = mcpTools.filter((t) => enabledServers.some((m) => m.name === t.serverName))
    } else {
      mcpTools = []
    }
  }
  return mcpTools
}

export function getMcpServerByTool(tool: MCPTool) {
  const servers = store.getState().mcp.servers
  const server = servers.find((s) => s.id === tool.serverId)
  if (server) {
    return server
  }
  // For hub server (auto mode), the server isn't in the store
  // Return the hub server constant if the tool's serverId matches
  if (tool.serverId === 'hub') {
    return hubMCPServer
  }
  return undefined
}

export function isToolAutoApproved(tool: MCPTool, server?: MCPServer): boolean {
  if (tool.isBuiltIn) {
    return true
  }
  const effectiveServer = server ?? getMcpServerByTool(tool)
  return effectiveServer ? !effectiveServer.disabledAutoApproveTools?.includes(tool.name) : false
}

export function parseToolUse(
  content: string,
  mcpTools: MCPTool[],
  startIdx: number = 0
): (Omit<ToolUseResponse, 'tool'> & { tool: MCPTool })[] {
  if (!content || !mcpTools || mcpTools.length === 0) {
    return []
  }

  // 支持两种格式：
  // 1. 完整的 <tool_use></tool_use> 标签包围的内容
  // 2. 只有内部内容（从 TagExtractor 提取出来的）

  let contentToProcess = content

  // 如果内容不包含 <tool_use> 标签，说明是从 TagExtractor 提取的内部内容，需要包装
  if (!content.includes('<tool_use>')) {
    contentToProcess = `<tool_use>\n${content}\n</tool_use>`
  }

  const toolUsePattern =
    /<tool_use>([\s\S]*?)<name>([\s\S]*?)<\/name>([\s\S]*?)<arguments>([\s\S]*?)<\/arguments>([\s\S]*?)<\/tool_use>/g
  const tools: (Omit<ToolUseResponse, 'tool'> & { tool: MCPTool })[] = []
  let match
  let idx = startIdx
  // Find all tool use blocks
  while ((match = toolUsePattern.exec(contentToProcess)) !== null) {
    // const fullMatch = match[0]
    const toolName = match[2].trim()
    const toolArgs = match[4].trim()

    // Try to parse the arguments as JSON
    let parsedArgs
    try {
      parsedArgs = JSON.parse(toolArgs)
    } catch (error) {
      // If parsing fails, use the string as is
      parsedArgs = toolArgs
    }
    // Logger.log(`Parsed arguments for tool "${toolName}":`, parsedArgs)
    const mcpTool = mcpTools.find((tool) => tool.id === toolName || tool.name === toolName)
    if (!mcpTool) {
      logger.error(`Tool "${toolName}" not found in MCP tools`)
      window.toast.error(i18n.t('settings.mcp.errors.toolNotFound', { name: toolName }))
      continue
    }

    // Add to tools array
    tools.push({
      id: `${toolName}-${idx++}`, // Unique ID for each tool use
      toolUseId: mcpTool.id,
      tool: mcpTool,
      arguments: parsedArgs,
      status: 'pending'
    })

    // Remove the tool use block from the content
    // content = content.replace(fullMatch, '')
  }
  return tools
}

export function mcpToolCallResponseToOpenAICompatibleMessage(
  mcpToolResponse: MCPToolResponse,
  resp: MCPCallToolResponse,
  isVisionModel: boolean = false,
  noSupportArrayContent: boolean = false
): ChatCompletionMessageParam {
  const message = {
    role: 'user'
  } as ChatCompletionMessageParam
  if (resp.isError) {
    message.content = JSON.stringify(resp.content)
  } else if (noSupportArrayContent) {
    let content: string = `Here is the result of mcp tool use \`${mcpToolResponse.tool.name}\`:\n`

    if (isVisionModel) {
      for (const item of resp.content) {
        switch (item.type) {
          case 'text':
            content += (item.text || 'no content') + '\n'
            break
          case 'image':
            // NOTE: 假设兼容模式下支持解析base64图片，虽然我觉得应该不支持
            content += `Here is a image result: data:${item.mimeType};base64,${item.data}\n`
            break
          case 'audio':
            // NOTE: 假设兼容模式下支持解析base64音频，虽然我觉得应该不支持
            content += `Here is a audio result: data:${item.mimeType};base64,${item.data}\n`
            break
          default:
            content += `Here is a unsupported result type: ${item.type}\n`
            break
        }
      }
    } else {
      content += JSON.stringify(resp.content)
      content += '\n'
    }

    message.content = content
  } else {
    const content: ChatCompletionContentPart[] = [
      {
        type: 'text',
        text: `Here is the result of mcp tool use \`${mcpToolResponse.tool.name}\`:`
      }
    ]

    if (isVisionModel) {
      for (const item of resp.content) {
        switch (item.type) {
          case 'text':
            content.push({
              type: 'text',
              text: item.text || 'no content'
            })
            break
          case 'image':
            content.push({
              type: 'image_url',
              image_url: {
                url: `data:${item.mimeType};base64,${item.data}`,
                detail: 'auto'
              }
            })
            break
          case 'audio':
            content.push({
              type: 'input_audio',
              input_audio: {
                data: `data:${item.mimeType};base64,${item.data}`,
                format: 'mp3'
              }
            })
            break
          default:
            content.push({
              type: 'text',
              text: `Unsupported type: ${item.type}`
            })
            break
        }
      }
    } else {
      content.push({
        type: 'text',
        text: JSON.stringify(resp.content)
      })
    }

    message.content = content
  }

  return message
}

export function mcpToolCallResponseToOpenAIMessage(
  mcpToolResponse: MCPToolResponse,
  resp: MCPCallToolResponse,
  isVisionModel: boolean = false
): OpenAI.Responses.EasyInputMessage {
  const message = {
    role: 'user'
  } as OpenAI.Responses.EasyInputMessage

  if (resp.isError) {
    message.content = JSON.stringify(resp.content)
  } else {
    const content: OpenAI.Responses.ResponseInputContent[] = [
      {
        type: 'input_text',
        text: `Here is the result of mcp tool use \`${mcpToolResponse.tool.name}\`:`
      }
    ]

    if (isVisionModel) {
      for (const item of resp.content) {
        switch (item.type) {
          case 'text':
            content.push({
              type: 'input_text',
              text: item.text || 'no content'
            })
            break
          case 'image':
            content.push({
              type: 'input_image',
              image_url: `data:${item.mimeType};base64,${item.data}`,
              detail: 'auto'
            })
            break
          default:
            content.push({
              type: 'input_text',
              text: `Unsupported type: ${item.type}`
            })
            break
        }
      }
    } else {
      content.push({
        type: 'input_text',
        text: JSON.stringify(resp.content)
      })
    }

    message.content = content
  }

  return message
}

export function mcpToolCallResponseToAnthropicMessage(
  mcpToolResponse: MCPToolResponse,
  resp: MCPCallToolResponse,
  model: Model
): MessageParam {
  const message = {
    role: 'user'
  } as MessageParam
  if (resp.isError) {
    message.content = JSON.stringify(resp.content)
  } else {
    const content: ContentBlockParam[] = [
      {
        type: 'text',
        text: `Here is the result of mcp tool use \`${mcpToolResponse.tool.name}\`:`
      }
    ]
    if (isVisionModel(model)) {
      for (const item of resp.content) {
        switch (item.type) {
          case 'text':
            content.push({
              type: 'text',
              text: item.text || 'no content'
            })
            break
          case 'image':
            if (
              item.mimeType === 'image/png' ||
              item.mimeType === 'image/jpeg' ||
              item.mimeType === 'image/webp' ||
              item.mimeType === 'image/gif'
            ) {
              content.push({
                type: 'image',
                source: {
                  type: 'base64',
                  data: `data:${item.mimeType};base64,${item.data}`,
                  media_type: item.mimeType
                }
              })
            } else {
              content.push({
                type: 'text',
                text: `Unsupported image type: ${item.mimeType}`
              })
            }
            break
          default:
            content.push({
              type: 'text',
              text: `Unsupported type: ${item.type}`
            })
            break
        }
      }
    } else {
      content.push({
        type: 'text',
        text: JSON.stringify(resp.content)
      })
    }
    message.content = content
  }

  return message
}

export function mcpToolCallResponseToGeminiMessage(
  mcpToolResponse: MCPToolResponse,
  resp: MCPCallToolResponse,
  isVisionModel: boolean = false
): Content {
  const message = {
    role: 'user'
  } as Content

  if (resp.isError) {
    message.parts = [
      {
        text: JSON.stringify(resp.content)
      }
    ]
  } else {
    const parts: Part[] = [
      {
        text: `Here is the result of mcp tool use \`${mcpToolResponse.tool.name}\`:`
      }
    ]
    if (isVisionModel) {
      for (const item of resp.content) {
        switch (item.type) {
          case 'text':
            parts.push({
              text: item.text || 'no content'
            })
            break
          case 'image':
            if (!item.data) {
              parts.push({
                text: 'No image data provided'
              })
            } else {
              parts.push({
                inlineData: {
                  data: item.data,
                  mimeType: item.mimeType || 'image/png'
                }
              })
            }
            break
          default:
            parts.push({
              text: `Unsupported type: ${item.type}`
            })
            break
        }
      }
    } else {
      parts.push({
        text: JSON.stringify(resp.content)
      })
    }
    message.parts = parts
  }

  return message
}

export function mcpToolsToAwsBedrockTools(mcpTools: MCPTool[]): Array<AwsBedrockSdkTool> {
  return mcpTools.map((tool) => ({
    toolSpec: {
      name: tool.id,
      description: tool.description,
      inputSchema: {
        json: {
          type: 'object',
          properties: tool.inputSchema?.properties
            ? Object.fromEntries(
                Object.entries(tool.inputSchema.properties).map(([key, value]) => [
                  key,
                  {
                    type:
                      typeof value === 'object' && value !== null && 'type' in value ? (value as any).type : 'string',
                    description:
                      typeof value === 'object' && value !== null && 'description' in value
                        ? (value as any).description
                        : undefined
                  }
                ])
              )
            : {},
          required: tool.inputSchema?.required || []
        }
      }
    }
  }))
}

export function awsBedrockToolUseToMcpTool(
  mcpTools: MCPTool[] | undefined,
  toolCall: AwsBedrockSdkToolCall
): MCPTool | undefined {
  if (!toolCall) return undefined
  if (!mcpTools) return undefined
  const tool = mcpTools.find((tool) => tool.id === toolCall.name || tool.name === toolCall.name)
  if (!tool) {
    return undefined
  }
  return tool
}

export function mcpToolCallResponseToAwsBedrockMessage(
  mcpToolResponse: MCPToolResponse,
  resp: MCPCallToolResponse,
  model: Model
): AwsBedrockSdkMessageParam {
  const message: AwsBedrockSdkMessageParam = {
    role: 'user',
    content: []
  }

  const toolUseId =
    'toolUseId' in mcpToolResponse && mcpToolResponse.toolUseId
      ? mcpToolResponse.toolUseId
      : 'toolCallId' in mcpToolResponse && mcpToolResponse.toolCallId
        ? mcpToolResponse.toolCallId
        : 'unknown-tool-id'

  if (resp.isError) {
    message.content = [
      {
        toolResult: {
          toolUseId: toolUseId,
          content: [
            {
              text: `Error: ${JSON.stringify(resp.content)}`
            }
          ],
          status: 'error'
        }
      }
    ]
  } else {
    const toolResultContent: Array<{
      json?: any
      text?: string
      image?: {
        format: 'png' | 'jpeg' | 'gif' | 'webp'
        source: {
          bytes?: Uint8Array
          s3Location?: {
            uri: string
            bucketOwner?: string
          }
        }
      }
    }> = []

    if (isVisionModel(model)) {
      for (const item of resp.content) {
        switch (item.type) {
          case 'text':
            toolResultContent.push({
              text: item.text || 'no content'
            })
            break
          case 'image':
            if (item.data && item.mimeType) {
              const awsImage = convertBase64ImageToAwsBedrockFormat(item.data, item.mimeType)
              if (awsImage) {
                toolResultContent.push({ image: awsImage })
              } else {
                toolResultContent.push({
                  text: `[Image received: ${item.mimeType}, size: ${item.data?.length || 0} bytes]`
                })
              }
            } else {
              toolResultContent.push({
                text: '[Image received but no data available]'
              })
            }
            break
          default:
            toolResultContent.push({
              text: `Unsupported content type: ${item.type}`
            })
            break
        }
      }
    } else {
      // 对于非视觉模型，将所有内容合并为文本
      const textContent = resp.content
        .map((item) => {
          if (item.type === 'text') {
            return item.text
          } else {
            // 对于非文本内容，尝试转换为JSON格式
            try {
              return JSON.stringify(item)
            } catch {
              return `[${item.type} content]`
            }
          }
        })
        .join('\n')

      toolResultContent.push({
        text: textContent || 'Tool execution completed with no output'
      })
    }

    message.content = [
      {
        toolResult: {
          toolUseId: toolUseId,
          content: toolResultContent,
          status: 'success'
        }
      }
    ]
  }

  return message
}

/**
 * 是否启用工具使用(function call)
 * @param assistant
 * @returns 是否启用工具使用
 */
export function isSupportedToolUse(assistant: Assistant) {
  if (assistant.model) {
    return isFunctionCallingModel(assistant.model) && isToolUseModeFunction(assistant)
  }

  return false
}

/**
 * 是否使用提示词工具使用
 * @param assistant
 * @returns 是否使用提示词工具使用
 */
export function isPromptToolUse(assistant: Assistant) {
  return assistant.settings?.toolUseMode === 'prompt'
}
