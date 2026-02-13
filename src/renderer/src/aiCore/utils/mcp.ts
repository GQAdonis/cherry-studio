import { loggerService } from '@logger'
import { processMcpToolResult, shouldProcessMcpContent } from '@renderer/services/McpContentManager'
import type { MCPCallToolResponse, MCPTool, MCPToolResponse } from '@renderer/types'
import { filterProperties, isUndefinedVariant } from '@renderer/utils/mcp-schema'
import { callMCPTool, getMcpServerByTool, isToolAutoApproved } from '@renderer/utils/mcp-tools'
import { requestToolConfirmation } from '@renderer/utils/userConfirmation'
import { type Tool, type ToolSet } from 'ai'
import { jsonSchema, tool } from 'ai'
import type { JSONSchema7 } from 'json-schema'

const logger = loggerService.withContext('MCP-utils')

/**
 * Recursively ensures all array schemas have valid 'items' fields.
 * This is a defensive post-processing step to catch any edge cases that
 * might slip through the main filterProperties function.
 *
 * Gemini API requires all array types to have a valid 'items' schema object.
 */
function ensureArrayItemsValid(schema: any): any {
  if (!schema || typeof schema !== 'object') {
    return schema
  }

  if (Array.isArray(schema)) {
    return schema.map(ensureArrayItemsValid)
  }

  const fixed = { ...schema }

  // Fix array items at current level
  if (fixed.type === 'array' && (!fixed.items || isUndefinedVariant(fixed.items))) {
    fixed.items = { type: 'string' }
  }

  // Recursively process items
  if (fixed.items && typeof fixed.items === 'object') {
    fixed.items = ensureArrayItemsValid(fixed.items)
  }

  // Recursively process properties
  if (fixed.properties && typeof fixed.properties === 'object') {
    const newProperties: any = {}
    for (const [key, value] of Object.entries(fixed.properties)) {
      if (isUndefinedVariant(value)) {
        continue
      }
      newProperties[key] = ensureArrayItemsValid(value)
    }
    fixed.properties = newProperties
  }

  return fixed
}

/**
 * Pre-process MCP tool input schema to ensure OpenAI API compatibility.
 * OpenAI requires object schemas to have a 'properties' field, even if empty.
 * This is especially important for tools like 'get_stats' that have no parameters.
 *
 * Also applies Gemini-specific fixes to ensure array schemas have valid items.
 */
function preprocessSchemaForOpenAI(schema: any): JSONSchema7 {
  if (!schema || typeof schema !== 'object') {
    return { type: 'object', properties: {} } as JSONSchema7
  }

  // Use the existing filterProperties function which handles:
  // 1. Adding properties: {} for object schemas without properties
  // 2. Setting required array with all property keys
  // 3. Setting additionalProperties: false
  // 4. Fixing array items (now using isUndefinedVariant helper)
  const processed = filterProperties(schema)

  // Post-processing: ensure all array items are valid across all nested levels
  // This is a defensive measure to catch any edge cases, especially for Gemini API
  const validated = ensureArrayItemsValid(processed)

  return validated as JSONSchema7
}

// Setup tools configuration based on provided parameters
export function setupToolsConfig(mcpTools?: MCPTool[]): Record<string, Tool<any, any>> | undefined {
  let tools: ToolSet = {}

  if (!mcpTools?.length) {
    return undefined
  }

  tools = convertMcpToolsToAiSdkTools(mcpTools)

  return tools
}

/**
 * 检查 MCP 工具调用结果是否包含可能携带大体积 base64 数据的多模态内容。
 * 包括 image、audio 以及含 blob 的 resource 类型。
 */
export function hasMultimodalContent(result: MCPCallToolResponse): boolean {
  return (
    Array.isArray(result?.content) &&
    result.content.some(
      (item) => item.type === 'image' || item.type === 'audio' || (item.type === 'resource' && !!item.resource?.blob)
    )
  )
}

/**
 * 将 MCP 工具调用结果转换为纯文本摘要，把图片/音频/resource blob 替换为文本占位描述，
 * 避免 base64 数据超出消息大小限制（如 kimi 的 4MB 限制）。
 */
export function mcpResultToTextSummary(result: MCPCallToolResponse): string {
  if (!result || !result.content || !Array.isArray(result.content)) {
    return JSON.stringify(result)
  }

  const parts: string[] = []
  for (const item of result.content) {
    switch (item.type) {
      case 'text':
        parts.push(item.text || '')
        break
      case 'image':
        parts.push(`[Image: ${item.mimeType || 'image/png'}, delivered to user]`)
        break
      case 'audio':
        parts.push(`[Audio: ${item.mimeType || 'audio/mp3'}, delivered to user]`)
        break
      case 'resource':
        if (item.resource?.blob) {
          parts.push(
            `[Resource: ${item.resource.mimeType || 'application/octet-stream'}, uri=${item.resource.uri || 'unknown'}, delivered to user]`
          )
        } else {
          parts.push(item.resource?.text || JSON.stringify(item))
        }
        break
      default:
        parts.push(JSON.stringify(item))
        break
    }
  }

  return parts.join('\n')
}

/**
 * 将 MCPTool 转换为 AI SDK 工具格式
 */
export function convertMcpToolsToAiSdkTools(mcpTools: MCPTool[]): ToolSet {
  const tools: ToolSet = {}

  for (const mcpTool of mcpTools) {
    // Pre-process schema to ensure OpenAI API compatibility
    // This adds 'properties: {}' for empty object schemas (like get_stats, read_graph)
    const processedSchema = preprocessSchemaForOpenAI(mcpTool.inputSchema)

    // Use mcpTool.id (which includes serverId suffix) to ensure uniqueness
    // when multiple instances of the same MCP server type are configured
    tools[mcpTool.id] = tool({
      description: mcpTool.description || `Tool from ${mcpTool.serverName}`,
      inputSchema: jsonSchema(processedSchema),
      execute: async (params, { toolCallId }) => {
        // 检查是否启用自动批准
        const server = getMcpServerByTool(mcpTool)
        const isAutoApproveEnabled = isToolAutoApproved(mcpTool, server)

        let confirmed = true

        if (!isAutoApproveEnabled) {
          // 请求用户确认
          logger.debug(`Requesting user confirmation for tool: ${mcpTool.name}`)
          confirmed = await requestToolConfirmation(toolCallId)
        }

        if (!confirmed) {
          // 用户拒绝执行工具
          logger.debug(`User cancelled tool execution: ${mcpTool.name}`)
          return {
            content: [
              {
                type: 'text',
                text: `User declined to execute tool "${mcpTool.name}".`
              }
            ],
            isError: false
          }
        }

        // 用户确认或自动批准，执行工具
        logger.debug(`Executing tool: ${mcpTool.name}`)

        // 创建适配的 MCPToolResponse 对象
        const toolResponse: MCPToolResponse = {
          id: toolCallId,
          tool: mcpTool,
          arguments: params,
          status: 'pending',
          toolCallId
        }

        const result = await callMCPTool(toolResponse)

        // 返回结果，AI SDK 会处理序列化
        if (result.isError) {
          return Promise.reject(result)
        }

        // Process large MCP results to prevent "prompt too long" errors
        if (shouldProcessMcpContent()) {
          try {
            const processedResult = await processMcpToolResult(result)
            if (processedResult.wasModified) {
              logger.info(`MCP tool result processed: ${processedResult.action}`, {
                tool: mcpTool.name,
                originalTokens: processedResult.originalTokens,
                finalTokens: processedResult.finalTokens,
                warning: processedResult.warning
              })
              return {
                ...result,
                content: processedResult.content
              }
            }
          } catch (processingError) {
            logger.warn('Failed to process MCP tool result, using original', processingError as Error)
            // Fall through to return original result
          }
        }

        // 返回工具执行结果
        return result
      },
      // 将多模态结果 (image/audio/resource blob) 转为文本摘要，避免 base64 超出消息大小限制。
      // 图片/音频已通过 IMAGE_COMPLETE chunk 展示给用户。
      // TODO: 待 AI SDK 支持 provider 感知后，可按 provider 返回 media 格式。
      toModelOutput(rawOutput: unknown) {
        // rawOutput 来自上方 execute 的 return result，类型始终为 MCPCallToolResponse
        // mcpResultToTextSummary 内部已有 null/content 校验，不会因意外输入崩溃
        const result = rawOutput as MCPCallToolResponse
        return { type: 'text' as const, value: mcpResultToTextSummary(result) }
      }
    })
  }

  return tools
}
