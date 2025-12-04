import { loggerService } from '@logger'
import { processMcpToolResult, shouldProcessMcpContent } from '@renderer/services/McpContentManager'
import type { MCPTool, MCPToolResponse } from '@renderer/types'
import { filterProperties } from '@renderer/utils/mcp-schema'
import { callMCPTool, getMcpServerByTool, isToolAutoApproved } from '@renderer/utils/mcp-tools'
import { requestToolConfirmation } from '@renderer/utils/userConfirmation'
import { type Tool, type ToolSet } from 'ai'
import { jsonSchema, tool } from 'ai'
import type { JSONSchema7 } from 'json-schema'

const logger = loggerService.withContext('MCP-utils')

/**
 * Pre-process MCP tool input schema to ensure OpenAI API compatibility.
 * OpenAI requires object schemas to have a 'properties' field, even if empty.
 * This is especially important for tools like 'get_stats' that have no parameters.
 */
function preprocessSchemaForOpenAI(schema: any): JSONSchema7 {
  if (!schema || typeof schema !== 'object') {
    return { type: 'object', properties: {} } as JSONSchema7
  }

  // Use the existing filterProperties function which handles:
  // 1. Adding properties: {} for object schemas without properties
  // 2. Setting required array with all property keys
  // 3. Setting additionalProperties: false
  const processed = filterProperties(schema)

  return processed as JSONSchema7
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
          // throw new Error(result.content?.[0]?.text || 'Tool execution failed')
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
        // } catch (error) {
        //   logger.error(`MCP Tool execution failed: ${mcpTool.name}`, { error })
        // }
      }
    })
  }

  return tools
}
