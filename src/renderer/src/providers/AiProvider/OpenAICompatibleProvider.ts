import {
  findTokenLimit,
  getOpenAIWebSearchParams,
  isHunyuanSearchModel,
  isOpenAIReasoningModel,
  isOpenAIWebSearch,
  isReasoningModel,
  isSupportedModel,
  isSupportedReasoningEffortGrokModel,
  isSupportedReasoningEffortModel,
  isSupportedReasoningEffortOpenAIModel,
  isSupportedThinkingTokenClaudeModel,
  isSupportedThinkingTokenModel,
  isSupportedThinkingTokenQwenModel,
  isVisionModel,
  isZhipuModel
} from '@renderer/config/models'
import { getStoreSetting } from '@renderer/hooks/useSettings'
import i18n from '@renderer/i18n'
import { extractReasoningMiddleware } from '@renderer/middlewares/extractReasoningMiddleware'
import { getAssistantSettings, getDefaultModel, getTopNamingModel } from '@renderer/services/AssistantService'
import { EVENT_NAMES } from '@renderer/services/EventService'
import {
  filterContextMessages,
  filterEmptyMessages,
  filterUserRoleStartMessages
} from '@renderer/services/MessagesService'
import { processPostsuffixQwen3Model, processReqMessages } from '@renderer/services/ModelMessageService'
import store from '@renderer/store'
import {
  Assistant,
  EFFORT_RATIO,
  FileTypes,
  MCPCallToolResponse,
  MCPTool,
  MCPToolResponse,
  Metrics,
  Model,
  Provider,
  Suggestion,
  ToolCallResponse,
  Usage,
  WebSearchSource
} from '@renderer/types'
import { ChunkType, LLMWebSearchCompleteChunk } from '@renderer/types/chunk'
import { Message } from '@renderer/types/newMessage'
import { removeSpecialCharactersForTopicName } from '@renderer/utils'
import { addImageFileToContents } from '@renderer/utils/formats'
import {
  convertLinks,
  convertLinksToHunyuan,
  convertLinksToOpenRouter,
  convertLinksToZhipu
} from '@renderer/utils/linkConverter'
import {
  isEnabledToolUse,
  mcpToolCallResponseToOpenAICompatibleMessage,
  mcpToolsToOpenAIChatTools,
  openAIToolsToMcpTool,
  parseAndCallTools
} from '@renderer/utils/mcp-tools'
import { findFileBlocks, findImageBlocks, getMainTextContent } from '@renderer/utils/messageUtils/find'
import { buildSystemPrompt } from '@renderer/utils/prompt'
import { asyncGeneratorToReadableStream, readableStreamAsyncIterable } from '@renderer/utils/stream'
import { isEmpty, takeRight } from 'lodash'
import OpenAI, { AzureOpenAI } from 'openai'
import type { ChatCompletion, ChatCompletionChunk } from 'openai/resources/chat/completions'
import type { Stream } from 'openai/streaming'
import {
  ChatCompletionContentPart,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  ChatCompletionTool,
  ChatCompletionToolMessageParam
} from 'openai/resources'

import { CompletionsParams } from '.'
import { BaseOpenAIProvider } from './OpenAIResponseProvider'

// 1. 定义联合类型
export type OpenAIStreamChunk =
  | { type: 'reasoning' | 'text-delta'; textDelta: string }
  | { type: 'tool-calls'; delta: any }
  | { type: 'finish'; finishReason: any; usage: any; delta: any; chunk: any }

export default class OpenAICompatibleProvider extends BaseOpenAIProvider {
  constructor(provider: Provider) {
    super(provider)

    if (provider.id === 'azure-openai' || provider.type === 'azure-openai') {
      this.sdk = new AzureOpenAI({
        dangerouslyAllowBrowser: true,
        apiKey: this.apiKey,
        apiVersion: provider.apiVersion,
        endpoint: provider.apiHost
      })
      return
    }

    this.sdk = new OpenAI({
      dangerouslyAllowBrowser: true,
      apiKey: this.apiKey,
      baseURL: this.getBaseURL(),
      defaultHeaders: {
        ...this.defaultHeaders(),
        ...(this.provider.id === 'copilot' ? { 'editor-version': 'vscode/1.97.2' } : {}),
        ...(this.provider.id === 'copilot' ? { 'copilot-vision-request': 'true' } : {})
      }
    })
  }

  /**
   * Check if the provider does not support files
   * @returns True if the provider does not support files, false otherwise
   */
  private get isNotSupportFiles() {
    if (this.provider?.isNotSupportArrayContent) {
      return true
    }

    const providers = ['deepseek', 'baichuan', 'minimax', 'xirang']

    return providers.includes(this.provider.id)
  }

  /**
   * Get the message parameter
   * @param message - The message
   * @param model - The model
   * @returns The message parameter
   */
  override async getMessageParam(
    message: Message,
    model: Model
  ): Promise<ChatCompletionMessageParam> {
    const isVision = isVisionModel(model)
    const content = await this.getMessageContent(message)
    const fileBlocks = findFileBlocks(message)
    const imageBlocks = findImageBlocks(message)

    if (fileBlocks.length === 0 && imageBlocks.length === 0) {
      return {
        role: message.role === 'system' ? 'user' : message.role,
        content
      }
    }

    // If the model does not support files, extract the file content
    if (this.isNotSupportFiles) {
      const fileContent = await this.extractFileContent(message)

      return {
        role: message.role === 'system' ? 'user' : message.role,
        content: content + '\n\n---\n\n' + fileContent
      }
    }

    // If the model supports files, add the file content to the message
    const parts: ChatCompletionContentPart[] = []

    if (content) {
      parts.push({ type: 'text', text: content })
    }

    for (const imageBlock of imageBlocks) {
      if (isVision) {
        if (imageBlock.file) {
          const image = await window.api.file.base64Image(imageBlock.file.id + imageBlock.file.ext)
          parts.push({ type: 'image_url', image_url: { url: image.data } })
        } else if (imageBlock.url && imageBlock.url.startsWith('data:')) {
          parts.push({ type: 'image_url', image_url: { url: imageBlock.url } })
        }
      }
    }

    for (const fileBlock of fileBlocks) {
      const file = fileBlock.file
      if (!file) {
        continue
      }

      if ([FileTypes.TEXT, FileTypes.DOCUMENT].includes(file.type)) {
        const fileContent = await (await window.api.file.read(file.id + file.ext)).trim()
        parts.push({
          type: 'text',
          text: file.origin_name + '\n' + fileContent
        })
      }
    }

    return {
      role: message.role === 'system' ? 'user' : message.role,
      content: parts
    } as ChatCompletionMessageParam
  }

  /**
   * Get the temperature for the assistant
   * @param assistant - The assistant
   * @param model - The model
   * @returns The temperature
   */
  override getTemperature(assistant: Assistant, model: Model) {
    return isReasoningModel(model) || isOpenAIWebSearch(model) ? undefined : assistant?.settings?.temperature
  }

  /**
   * Get the provider specific parameters for the assistant
   * @param assistant - The assistant
   * @param model - The model
   * @returns The provider specific parameters
   */
  private getProviderSpecificParameters(assistant: Assistant, model: Model) {
    const { maxTokens } = getAssistantSettings(assistant)

    if (this.provider.id === 'openrouter') {
      if (model.id.includes('deepseek-r1')) {
        return {
          include_reasoning: true
        }
      }
    }

    if (isOpenAIReasoningModel(model)) {
      return {
        max_tokens: undefined,
        max_completion_tokens: maxTokens
      }
    }

    return {}
  }

  /**
   * Get the top P for the assistant
   * @param assistant - The assistant
   * @param model - The model
   * @returns The top P
   */
  override getTopP(assistant: Assistant, model: Model) {
    if (isReasoningModel(model) || isOpenAIWebSearch(model)) {
      return undefined
    }

    return assistant?.settings?.topP
  }

  /**
   * Get the reasoning effort for the assistant
   * @param assistant - The assistant
   * @param model - The model
   * @returns The reasoning effort
   */
  /**
   * Convert our internal ReasoningEffortOptions to OpenAI SDK's ReasoningEffort type
   * @param effort Our internal reasoning effort option
   * @returns OpenAI SDK compatible reasoning effort value
   */
  private convertToOpenAIReasoningEffort(effort?: string): 'low' | 'medium' | 'high' | undefined {
    // If effort is 'auto' or any other unsupported value, default to 'high'
    if (effort === 'auto') {
      return 'high'
    }

    // Only return the value if it matches one of the allowed values
    if (effort === 'low' || effort === 'medium' || effort === 'high') {
      return effort
    }

    // Otherwise return undefined
    return undefined
  }

  private getReasoningEffort(assistant: Assistant, model: Model) {
    if (this.provider.id === 'groq') {
      return {}
    }

    if (!isReasoningModel(model)) {
      return {}
    }
    const reasoningEffort = assistant?.settings?.reasoning_effort
    if (!reasoningEffort) {
      if (isSupportedThinkingTokenQwenModel(model)) {
        return { enable_thinking: false }
      }

      if (isSupportedThinkingTokenClaudeModel(model)) {
        return { thinking: { type: 'disabled' } }
      }

      return {}
    }
    const effortRatio = EFFORT_RATIO[reasoningEffort]
    const budgetTokens = Math.floor((findTokenLimit(model.id)?.max || 0) * effortRatio)
    // OpenRouter models
    if (model.provider === 'openrouter') {
      if (isSupportedReasoningEffortModel(model)) {
        return {
          reasoning: {
            effort: assistant?.settings?.reasoning_effort
          }
        }
      }

      if (isSupportedThinkingTokenModel(model)) {
        return {
          reasoning: {
            max_tokens: budgetTokens
          }
        }
      }
    }

    // Qwen models
    if (isSupportedThinkingTokenQwenModel(model)) {
      return {
        enable_thinking: true,
        thinking_budget: budgetTokens
      }
    }

    // Grok models
    if (isSupportedReasoningEffortGrokModel(model)) {
      return {
        reasoning_effort: this.convertToOpenAIReasoningEffort(assistant?.settings?.reasoning_effort)
      }
    }

    // OpenAI models
    if (isSupportedReasoningEffortOpenAIModel(model)) {
      return {
        reasoning_effort: this.convertToOpenAIReasoningEffort(assistant?.settings?.reasoning_effort)
      }
    }

    // Claude models
    if (isSupportedThinkingTokenClaudeModel(model)) {
      return {
        thinking: {
          type: 'enabled',
          budget_tokens: budgetTokens
        }
      }
    }

    // Default case: no special thinking settings
    return {}
  }

  public convertMcpTools<T>(mcpTools: MCPTool[]): T[] {
    return mcpToolsToOpenAIChatTools(mcpTools) as T[]
  }

  public mcpToolCallResponseToMessage = (mcpToolResponse: MCPToolResponse, resp: MCPCallToolResponse, model: Model) => {
    if ('toolUseId' in mcpToolResponse && mcpToolResponse.toolUseId) {
      return mcpToolCallResponseToOpenAICompatibleMessage(mcpToolResponse, resp, isVisionModel(model))
    } else if ('toolCallId' in mcpToolResponse && mcpToolResponse.toolCallId) {
      const toolCallOut: ChatCompletionToolMessageParam = {
        role: 'tool',
        tool_call_id: mcpToolResponse.toolCallId,
        content: JSON.stringify(resp.content)
      }
      return toolCallOut
    }
    return
  }

  /**
   * Generate completions for the assistant
   * @param messages - The messages
   * @param assistant - The assistant
   * @param mcpTools - The MCP tools
   * @param onChunk - The onChunk callback
   * @param onFilterMessages - The onFilterMessages callback
   * @returns The completions
   */
  async completions({ messages, assistant, mcpTools, onChunk, onFilterMessages }: CompletionsParams): Promise<void> {
    if (assistant.enableGenerateImage) {
      await this.generateImageByChat({ messages, assistant, onChunk } as CompletionsParams)
      return
    }
    const defaultModel = getDefaultModel()
    const model = assistant.model || defaultModel

    const { contextCount, maxTokens, streamOutput } = getAssistantSettings(assistant)
    const isEnabledBultinWebSearch = assistant.enableWebSearch
    messages = addImageFileToContents(messages)
    const enableReasoning =
      ((isSupportedThinkingTokenModel(model) || isSupportedReasoningEffortModel(model)) &&
        assistant.settings?.reasoning_effort !== undefined) ||
      (isReasoningModel(model) && (!isSupportedThinkingTokenModel(model) || !isSupportedReasoningEffortModel(model)))
    let systemMessage = { role: 'system', content: assistant.prompt || '' }
    if (isSupportedReasoningEffortOpenAIModel(model)) {
      systemMessage = {
        role: 'developer',
        content: `Formatting re-enabled${systemMessage ? '\n' + systemMessage.content : ''}`
      }
    }
    
    // Use isEnabledToolUse from mcp-tools
    const { tools } = this.setupToolsConfig<ChatCompletionTool>({ 
      mcpTools, 
      model, 
      enableToolUse: isEnabledToolUse(assistant)
    })

    if (this.useSystemPromptForTools) {
      systemMessage.content = buildSystemPrompt(systemMessage.content || '', mcpTools)
    }

    const userMessages: ChatCompletionMessageParam[] = []
    const _messages = filterUserRoleStartMessages(
      filterEmptyMessages(filterContextMessages(takeRight(messages, contextCount + 1)))
    )

    onFilterMessages(_messages)

    for (const message of _messages) {
      userMessages.push(await this.getMessageParam(message, model))
    }

    const isSupportStreamOutput = () => {
      return streamOutput
    }

    const lastUserMessage = _messages.findLast((m) => m.role === 'user')
    const { abortController, cleanup, signalPromise } = this.createAbortController(lastUserMessage?.id, true)
    const { signal } = abortController
    await this.checkIsCopilot()

    const lastUserMsg = userMessages.findLast((m) => m.role === 'user')
    if (lastUserMsg && isSupportedThinkingTokenQwenModel(model)) {
      const postsuffix = '/no_think'
      // qwenThinkMode === true 表示思考模式啓用，此時不應添加 /no_think，如果存在則移除
      const qwenThinkModeEnabled = assistant.settings?.qwenThinkMode === true
      const currentContent = lastUserMsg.content // content 類型：string | ChatCompletionContentPart[] | null | undefined

      // Handle type compatibility and null/undefined cases
      if (currentContent === null || currentContent === undefined) {
        // If content is null or undefined, set it to empty string to avoid issues
        lastUserMsg.content = ''
      } else if (typeof currentContent === 'string') {
        // Process string content
        lastUserMsg.content = processPostsuffixQwen3Model(
          currentContent,
          postsuffix,
          qwenThinkModeEnabled
        ) as string
      } else if (Array.isArray(currentContent)) {
        // Process array content
        lastUserMsg.content = processPostsuffixQwen3Model(
          currentContent as ChatCompletionContentPart[],
          postsuffix,
          qwenThinkModeEnabled
        ) as ChatCompletionContentPart[]
      }
    }

    //当 systemMessage 内容为空时不发送 systemMessage
    let reqMessages: ChatCompletionMessageParam[]
    if (!systemMessage.content) {
      reqMessages = [...userMessages]
    } else {
      reqMessages = [systemMessage, ...userMessages].filter(Boolean) as ChatCompletionMessageParam[]
    }

    let finalUsage: Usage = {
      completion_tokens: 0,
      prompt_tokens: 0,
      total_tokens: 0
    }

    const finalMetrics: Metrics = {
      completion_tokens: 0,
      time_completion_millsec: 0,
      time_first_token_millsec: 0
    }

    const toolResponses: MCPToolResponse[] = []

    const processToolResults = async (toolResults: Awaited<ReturnType<typeof parseAndCallTools>>, idx: number) => {
      if (toolResults.length === 0) return

      toolResults.forEach((ts) => reqMessages.push(ts as ChatCompletionMessageParam))

      console.debug('[tool] reqMessages before processing', model.id, reqMessages)
      reqMessages = processReqMessages(model, reqMessages)
      console.debug('[tool] reqMessages', model.id, reqMessages)

      onChunk({ type: ChunkType.LLM_RESPONSE_CREATED })
      // Determine if streaming is supported
      const streamSupported = isSupportStreamOutput()

      // Create the base parameters
      const baseParams: ChatCompletionCreateParamsNonStreaming = {
        model: model.id,
        messages: reqMessages,
        temperature: this.getTemperature(assistant, model),
        top_p: this.getTopP(assistant, model),
        max_tokens: maxTokens,
        tools: !isEmpty(tools) ? tools : undefined,
        ...getOpenAIWebSearchParams(assistant, model),
        ...this.getProviderSpecificParameters(assistant, model),
        ...this.getCustomParameters(assistant)
      } as ChatCompletionCreateParamsNonStreaming

      // Handle reasoning effort separately to avoid type issues
      // Skip reasoning effort parameters for Groq provider
      if (this.provider.id !== 'groq') {
        const reasoningEffort = this.getReasoningEffort(assistant, model)
        if (reasoningEffort && typeof reasoningEffort === 'object') {
          // Create a properly typed parameter object
          const typedParams = baseParams as unknown as Record<string, any>
          
          // Only add valid OpenAI API properties
          if ('reasoning' in reasoningEffort) {
            typedParams.reasoning = reasoningEffort.reasoning
          }
          if ('thinking' in reasoningEffort) {
            typedParams.thinking = reasoningEffort.thinking
          }
          if ('enable_thinking' in reasoningEffort) {
            typedParams.enable_thinking = reasoningEffort.enable_thinking
          }
        }
      }

      // Create the appropriate parameters based on streaming support
      const params = streamSupported
        ? { ...baseParams, stream: true }
        : { ...baseParams, stream: false }

      // Make the API call with proper typing
      const newStream = await this.sdk.chat.completions.create(params, {
        signal
      })
      await processStream(newStream, idx + 1)
    }

    const processToolCalls = async (mcpTools, toolCalls: ChatCompletionMessageToolCall[]) => {
      const mcpToolResponses = toolCalls
        .map((toolCall) => {
          const mcpTool = openAIToolsToMcpTool(mcpTools, toolCall as ChatCompletionMessageToolCall)
          if (!mcpTool) return undefined

          const parsedArgs = (() => {
            try {
              return JSON.parse(toolCall.function.arguments)
            } catch {
              return toolCall.function.arguments
            }
          })()

          return {
            id: toolCall.id,
            toolCallId: toolCall.id,
            tool: mcpTool,
            arguments: parsedArgs,
            status: 'pending'
          } as ToolCallResponse
        })
        .filter((t): t is ToolCallResponse => typeof t !== 'undefined')
      return await parseAndCallTools(
        mcpToolResponses,
        toolResponses,
        onChunk,
        this.mcpToolCallResponseToMessage,
        model,
        mcpTools
      )
    }

    const processToolUses = async (content: string) => {
      return await parseAndCallTools(
        content,
        toolResponses,
        onChunk,
        this.mcpToolCallResponseToMessage,
        model,
        mcpTools
      )
    }

    const processStream = async (stream: any, idx: number) => {
      // Type guard to check if we have a non-streaming response
      const isCompletionResponse = (obj: any): obj is ChatCompletion => {
        return obj && Array.isArray(obj.choices)
      }
      const toolCalls: ChatCompletionMessageToolCall[] = []
      let time_first_token_millsec = 0
      const start_time_millsec = new Date().getTime()

      // Handle non-streaming case
      if (!isSupportStreamOutput() || isCompletionResponse(stream)) {
        // Calculate final metrics once
        finalMetrics.completion_tokens = stream.usage?.completion_tokens
        finalMetrics.time_completion_millsec = new Date().getTime() - start_time_millsec

        // Create a synthetic usage object if stream.usage is undefined
        finalUsage = { ...stream.usage }
        // Separate onChunk calls for text and usage/metrics
        let content = ''
        stream.choices.forEach((choice) => {
          // reasoning
          if (choice.message.reasoning) {
            onChunk({ type: ChunkType.THINKING_DELTA, text: choice.message.reasoning })
            onChunk({
              type: ChunkType.THINKING_COMPLETE,
              text: choice.message.reasoning,
              thinking_millsec: new Date().getTime() - start_time_millsec
            })
          }
          // text
          if (choice.message.content) {
            content += choice.message.content
            onChunk({ type: ChunkType.TEXT_DELTA, text: choice.message.content })
          }
          // tool call
          if (choice.message.tool_calls && choice.message.tool_calls.length) {
            choice.message.tool_calls.forEach((t) => toolCalls.push(t))
          }

          reqMessages.push({
            role: choice.message.role,
            content: choice.message.content,
            tool_calls: toolCalls.length
              ? toolCalls.map((toolCall) => ({
                  id: toolCall.id,
                  function: {
                    ...toolCall.function,
                    arguments:
                      typeof toolCall.function.arguments === 'string'
                        ? toolCall.function.arguments
                        : JSON.stringify(toolCall.function.arguments)
                  },
                  type: 'function'
                }))
              : undefined
          })
        })

        if (content.length) {
          onChunk({ type: ChunkType.TEXT_COMPLETE, text: content })
        }

        const toolResults: Awaited<ReturnType<typeof parseAndCallTools>> = []
        if (toolCalls.length) {
          toolResults.push(...(await processToolCalls(mcpTools, toolCalls)))
        }
        if (stream.choices[0].message?.content) {
          toolResults.push(...(await processToolUses(stream.choices[0].message?.content)))
        }
        await processToolResults(toolResults, idx)

        // Always send usage and metrics data
        onChunk({ type: ChunkType.BLOCK_COMPLETE, response: { usage: finalUsage, metrics: finalMetrics } })
        return
      }

      let content = ''
      let thinkingContent = ''
      let isFirstChunk = true

      // 1. 初始化中间件
      const reasoningTags = [
        { openingTag: '<think>', closingTag: '</think>', separator: '\n' },
        { openingTag: '###Thinking', closingTag: '###Response', separator: '\n' }
      ]
      const getAppropriateTag = (model: Model) => {
        if (model.id.includes('qwen3')) return reasoningTags[0]
        return reasoningTags[0]
      }
      const reasoningTag = getAppropriateTag(model)
      async function* openAIChunkToTextDelta(stream: any): AsyncGenerator<OpenAIStreamChunk> {
        for await (const chunk of stream) {
          if (window.keyv.get(EVENT_NAMES.CHAT_COMPLETION_PAUSED)) {
            break
          }

          const delta = chunk.choices[0]?.delta
          if (delta?.reasoning_content || delta?.reasoning) {
            yield { type: 'reasoning', textDelta: delta.reasoning_content || delta.reasoning }
          }
          if (delta?.content) {
            yield { type: 'text-delta', textDelta: delta.content }
          }
          if (delta?.tool_calls) {
            yield { type: 'tool-calls', delta: delta }
          }

          const finishReason = chunk.choices[0]?.finish_reason
          if (!isEmpty(finishReason)) {
            yield { type: 'finish', finishReason, usage: chunk.usage, delta, chunk }
            break
          }
        }
      }

      // 2. 使用中间件
      const { stream: processedStream } = await extractReasoningMiddleware<OpenAIStreamChunk>({
        openingTag: reasoningTag?.openingTag,
        closingTag: reasoningTag?.closingTag,
        separator: reasoningTag?.separator,
        enableReasoning
      }).wrapStream({
        doStream: async () => ({
          stream: asyncGeneratorToReadableStream(openAIChunkToTextDelta(stream))
        })
      })

      // 3. 消费 processedStream，分发 onChunk
      for await (const chunk of readableStreamAsyncIterable(processedStream)) {
        const delta = chunk.type === 'finish' ? chunk.delta : chunk
        const rawChunk = chunk.type === 'finish' ? chunk.chunk : chunk

        switch (chunk.type) {
          case 'reasoning': {
            if (time_first_token_millsec === 0) {
              time_first_token_millsec = new Date().getTime()
            }
            thinkingContent += chunk.textDelta
            onChunk({
              type: ChunkType.THINKING_DELTA,
              text: chunk.textDelta,
              thinking_millsec: new Date().getTime() - time_first_token_millsec
            })
            break
          }
          case 'text-delta': {
            let textDelta = chunk.textDelta
            if (assistant.enableWebSearch && delta) {
              const originalDelta = rawChunk?.choices?.[0]?.delta

              if (originalDelta?.annotations) {
                textDelta = convertLinks(textDelta, isFirstChunk)
              } else if (assistant.model?.provider === 'openrouter') {
                textDelta = convertLinksToOpenRouter(textDelta, isFirstChunk)
              } else if (isZhipuModel(assistant.model)) {
                textDelta = convertLinksToZhipu(textDelta, isFirstChunk)
              } else if (isHunyuanSearchModel(assistant.model)) {
                const searchResults = rawChunk?.search_info?.search_results || []
                textDelta = convertLinksToHunyuan(textDelta, searchResults, isFirstChunk)
              }
            }
            if (isFirstChunk) {
              isFirstChunk = false
              if (time_first_token_millsec === 0) {
                time_first_token_millsec = new Date().getTime()
              } else {
                onChunk({
                  type: ChunkType.THINKING_COMPLETE,
                  text: thinkingContent,
                  thinking_millsec: new Date().getTime() - time_first_token_millsec
                })
              }
            }
            content += textDelta
            onChunk({ type: ChunkType.TEXT_DELTA, text: textDelta })
            break
          }
          case 'tool-calls': {
            if (isFirstChunk) {
              isFirstChunk = false
              if (time_first_token_millsec === 0) {
                time_first_token_millsec = new Date().getTime()
              } else {
                onChunk({
                  type: ChunkType.THINKING_COMPLETE,
                  text: thinkingContent,
                  thinking_millsec: new Date().getTime() - time_first_token_millsec
                })
              }
            }
            chunk.delta.tool_calls.forEach((toolCall) => {
              const { id, index, type, function: fun } = toolCall
              if (id && type === 'function' && fun) {
                const { name, arguments: args } = fun
                toolCalls.push({
                  id,
                  function: {
                    name: name || '',
                    arguments: args || ''
                  },
                  type: 'function'
                })
              } else if (fun?.arguments) {
                toolCalls[index].function.arguments += fun.arguments
              }
            })
            break
          }
          case 'finish': {
            const finishReason = chunk.finishReason
            const usage = chunk.usage
            const originalFinishDelta = chunk.delta
            const originalFinishRawChunk = chunk.chunk

            if (!isEmpty(finishReason)) {
              onChunk({ type: ChunkType.TEXT_COMPLETE, text: content })
              if (usage) {
                finalUsage.completion_tokens += usage.completion_tokens || 0
                finalUsage.prompt_tokens += usage.prompt_tokens || 0
                finalUsage.total_tokens += usage.total_tokens || 0
                finalMetrics.completion_tokens += usage.completion_tokens || 0
              }
              finalMetrics.time_completion_millsec += new Date().getTime() - start_time_millsec
              finalMetrics.time_first_token_millsec = time_first_token_millsec - start_time_millsec
              if (originalFinishDelta?.annotations) {
                if (assistant.model?.provider === 'copilot') return

                onChunk({
                  type: ChunkType.LLM_WEB_SEARCH_COMPLETE,
                  llm_web_search: {
                    results: originalFinishDelta.annotations,
                    source: WebSearchSource.OPENAI
                  }
                } as LLMWebSearchCompleteChunk)
              }
              if (assistant.model?.provider === 'perplexity') {
                const citations = originalFinishRawChunk.citations
                if (citations) {
                  onChunk({
                    type: ChunkType.LLM_WEB_SEARCH_COMPLETE,
                    llm_web_search: {
                      results: citations,
                      source: WebSearchSource.PERPLEXITY
                    }
                  } as LLMWebSearchCompleteChunk)
                }
              }
              if (
                isEnabledBultinWebSearch &&
                isZhipuModel(model) &&
                finishReason === 'stop' &&
                originalFinishRawChunk?.web_search
              ) {
                onChunk({
                  type: ChunkType.LLM_WEB_SEARCH_COMPLETE,
                  llm_web_search: {
                    results: originalFinishRawChunk.web_search,
                    source: WebSearchSource.ZHIPU
                  }
                } as LLMWebSearchCompleteChunk)
              }
              if (
                isEnabledBultinWebSearch &&
                isHunyuanSearchModel(model) &&
                originalFinishRawChunk?.search_info?.search_results
              ) {
                onChunk({
                  type: ChunkType.LLM_WEB_SEARCH_COMPLETE,
                  llm_web_search: {
                    results: originalFinishRawChunk.search_info.search_results,
                    source: WebSearchSource.HUNYUAN
                  }
                } as LLMWebSearchCompleteChunk)
              }
            }
            break
          }
        }
      }

      reqMessages.push({
        role: 'assistant',
        content: content,
        tool_calls: toolCalls.length
          ? toolCalls.map((toolCall) => ({
              id: toolCall.id,
              function: {
                ...toolCall.function,
                arguments:
                  typeof toolCall.function.arguments === 'string'
                    ? toolCall.function.arguments
                    : JSON.stringify(toolCall.function.arguments)
              },
              type: 'function'
            }))
          : undefined
      })
      let toolResults: Awaited<ReturnType<typeof parseAndCallTools>> = []
      if (toolCalls.length) {
        toolResults = await processToolCalls(mcpTools, toolCalls)
      }
      if (content.length) {
        toolResults = toolResults.concat(await processToolUses(content))
      }
      if (toolResults.length) {
        await processToolResults(toolResults, idx)
      }

      onChunk({
        type: ChunkType.BLOCK_COMPLETE,
        response: {
          usage: finalUsage,
          metrics: finalMetrics
        }
      })
    }

    reqMessages = processReqMessages(model, reqMessages)
    // 等待接口返回流
    onChunk({ type: ChunkType.LLM_RESPONSE_CREATED })
    // Determine if we should use streaming
    const useStream = isSupportStreamOutput()

    // Create base parameters with proper typing
    const baseParams: Partial<ChatCompletionCreateParamsNonStreaming> = {
      model: model.id,
      messages: reqMessages,
      temperature: this.getTemperature(assistant, model),
      top_p: this.getTopP(assistant, model),
      max_tokens: maxTokens,
      tools: !isEmpty(tools) ? tools : undefined,
      ...getOpenAIWebSearchParams(assistant, model),
      ...this.getProviderSpecificParameters(assistant, model),
      ...this.getCustomParameters(assistant)
    }

    // Handle service_tier separately to avoid type issues
    const serviceTier = this.getServiceTier(model)
    if (serviceTier) {
      (baseParams as any).service_tier = serviceTier
    }

    // Add reasoning effort parameters
    const reasoningEffort = this.getReasoningEffort(assistant, model)
    if (reasoningEffort && typeof reasoningEffort === 'object') {
      Object.assign(baseParams, reasoningEffort)
    }

    // Create request options
    const requestOptions = {
      signal,
      timeout: this.getTimeout(model)
    }

    // Add keep_alive parameter if needed
    if (this.keepAliveTime !== undefined) {
      (baseParams as any).keep_alive = this.keepAliveTime
    }

    // Call the appropriate overload based on streaming preference
    let response
    if (useStream) {
      // Create streaming response
      const streamParams = { ...baseParams, stream: true }
      response = await this.sdk.chat.completions.create(streamParams as any, requestOptions)
    } else {
      // Create non-streaming response
      const nonStreamParams = { ...baseParams, stream: false }
      response = await this.sdk.chat.completions.create(nonStreamParams as ChatCompletionCreateParamsNonStreaming, requestOptions)
    }

    const stream = response

    await processStream(stream, 0).finally(cleanup)

    // 捕获signal的错误
    await signalPromise?.promise?.catch((error) => {
      throw error
    })
  }

  /**
   * Translate a message
   * @param content
   * @param assistant - The assistant
   * @param onResponse - The onResponse callback
   * @returns The translated message
   */
  async translate(content: string, assistant: Assistant, onResponse?: (text: string, isComplete: boolean) => void) {
    const defaultModel = getDefaultModel()
    const model = assistant.model || defaultModel

    const messagesForApi = content
      ? [
          { role: 'system', content: assistant.prompt },
          { role: 'user', content }
        ]
      : [{ role: 'user', content: assistant.prompt }]

    const isSupportedStreamOutput = () => {
      if (!onResponse) {
        return false
      }
      return true
    }

    const stream = isSupportedStreamOutput()

    await this.checkIsCopilot()

    // console.debug('[translate] reqMessages', model.id, message)
    // Create base parameters with proper typing
    const baseParams: Partial<ChatCompletionCreateParamsNonStreaming> = {
      model: model.id,
      messages: messagesForApi as ChatCompletionMessageParam[],
      temperature: this.getTemperature(assistant, model),
      top_p: this.getTopP(assistant, model)
    }

    // Add reasoning effort parameters
    const reasoningEffort = this.getReasoningEffort(assistant, model)
    if (reasoningEffort && typeof reasoningEffort === 'object') {
      Object.assign(baseParams, reasoningEffort)
    }

    // Add keep_alive parameter if needed
    if (this.keepAliveTime !== undefined) {
      (baseParams as any).keep_alive = this.keepAliveTime
    }

    // Call the appropriate overload based on streaming preference
    let response
    if (stream) {
      // Create streaming response
      const streamParams = { ...baseParams, stream: true }
      response = await this.sdk.chat.completions.create(streamParams as any)
    } else {
      // Create non-streaming response
      const nonStreamParams = { ...baseParams, stream: false }
      response = await this.sdk.chat.completions.create(nonStreamParams as ChatCompletionCreateParamsNonStreaming)

      // For non-streaming responses, return the content directly
      return (response as ChatCompletion).choices[0].message?.content || ''
    }

    let text = ''
    let isThinking = false
    const isReasoning = isReasoningModel(model)

    // For streaming responses, iterate through the chunks
    try {
      for await (const chunk of response as unknown as Stream<ChatCompletionChunk>) {
        const deltaContent = chunk.choices[0]?.delta?.content || ''
        
        if (isReasoning) {
          if (deltaContent.includes('<think>')) {
            isThinking = true
          }
          
          if (!isThinking) {
            text += deltaContent
            onResponse?.(text, false)
          }
          
          if (deltaContent.includes('</think>')) {
            isThinking = false
          }
        } else {
          text += deltaContent
          onResponse?.(text, false)
        }
      }
      
      onResponse?.(text, true)
    } catch (error) {
      console.error('Error in streaming response:', error)
      // If streaming fails, still return the text we've collected so far
      onResponse?.(text, true)
    }
    
    return text
  }

  /**
   * Summarize a message
   * @param messages - The messages
   * @param assistant - The assistant
   * @returns The summary
   */
  public async summaries(messages: Message[], assistant: Assistant): Promise<string> {
    const model = getTopNamingModel() || assistant.model || getDefaultModel()

    const userMessages = takeRight(messages, 5)
      .filter((message) => !message.isPreset)
      .map((message) => ({
        role: message.role,
        content: getMainTextContent(message)
      }))

    const userMessageContent = userMessages.reduce((prev, curr) => {
      const content = curr.role === 'user' ? `User: ${curr.content}` : `Assistant: ${curr.content}`
      return prev + (prev ? '\n' : '') + content
    }, '')

    const systemMessage = {
      role: 'system',
      content: getStoreSetting('topicNamingPrompt') || i18n.t('prompts.title')
    }

    const userMessage = {
      role: 'user',
      content: userMessageContent
    }

    await this.checkIsCopilot()

    // Create base parameters with proper typing
    const baseParams: ChatCompletionCreateParamsNonStreaming = {
      model: model.id,
      messages: [systemMessage, userMessage] as ChatCompletionMessageParam[],
      stream: false,
      max_tokens: 1000
    }

    // Add keep_alive parameter if needed
    if (this.keepAliveTime !== undefined) {
      (baseParams as any).keep_alive = this.keepAliveTime
    }

    const response = await this.sdk.chat.completions.create(baseParams)

    // 针对思考类模型的返回，总结仅截取</think>之后的内容
    let content = response.choices[0].message?.content || ''
    content = content.replace(/^<think>(.*?)<\/think>/s, '')

    return removeSpecialCharactersForTopicName(content.substring(0, 50))
  }

  /**
   * Summarize a message for search
   * @param messages - The messages
   * @param assistant - The assistant
   * @returns The summary
   */
  public async summaryForSearch(messages: Message[], assistant: Assistant): Promise<string | null> {
    const model = assistant.model || getDefaultModel()

    const systemMessage = {
      role: 'system',
      content: assistant.prompt
    }

    const messageContents = messages.map((m) => getMainTextContent(m))
    const userMessageContent = messageContents.join('\n')

    const userMessage = {
      role: 'user',
      content: userMessageContent
    }

    const lastUserMessage = messages[messages.length - 1]
    const { abortController, cleanup } = this.createAbortController(lastUserMessage?.id)
    const { signal } = abortController

    // Create base parameters with proper typing
    const baseParams: ChatCompletionCreateParamsNonStreaming = {
      model: model.id,
      messages: [systemMessage, userMessage] as ChatCompletionMessageParam[],
      stream: false,
      max_tokens: 1000
    }

    // Add keep_alive parameter if needed
    if (this.keepAliveTime !== undefined) {
      (baseParams as any).keep_alive = this.keepAliveTime
    }

    // Request options
    const requestOptions = {
      timeout: 20 * 1000,
      signal: signal
    }

    const response = await this.sdk.chat.completions.create(baseParams, requestOptions).finally(cleanup)

    // 针对思考类模型的返回，总结仅截取</think>之后的内容
    let content = response.choices[0].message?.content || ''
    content = content.replace(/^<think>(.*?)<\/think>/s, '')

    return content
  }

  /**
   * Generate text
   * @param prompt - The prompt
   * @param content - The content
   * @returns The generated text
   */
  public async generateText({ prompt, content }: { prompt: string; content: string }): Promise<string> {
    const model = getDefaultModel()

    await this.checkIsCopilot()

    const response = await this.sdk.chat.completions.create({
      model: model.id,
      stream: false,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content }
      ] as ChatCompletionMessageParam[]
    })

    return response.choices[0].message?.content || ''
  }

  /**
   * Generate suggestions
   * @param messages - The messages
   * @param assistant - The assistant
   * @returns The suggestions
   */
  async suggestions(messages: Message[], assistant: Assistant): Promise<Suggestion[]> {
    const { model } = assistant

    if (!model) {
      return []
    }

    await this.checkIsCopilot()

    const userMessagesForApi = messages
      .filter((m) => m.role === 'user')
      .map((m) => ({
        role: m.role,
        content: getMainTextContent(m)
      }))

    const response: any = await this.sdk.request({
      method: 'post',
      path: '/advice_questions',
      body: {
        messages: userMessagesForApi,
        model: model.id,
        max_tokens: 0,
        temperature: 0,
        n: 0
      }
    })

    return response?.questions?.filter(Boolean)?.map((q: any) => ({ content: q })) || []
  }

  /**
   * Check if the model is valid
   * @param model - The model
   * @param stream - Whether to use streaming interface
   * @returns The validity of the model
   */
  public async check(model: Model, stream: boolean = false): Promise<{ valid: boolean; error: Error | null }> {
    if (!model) {
      return { valid: false, error: new Error('No model found') }
    }

    const messages: ChatCompletionMessageParam[] = [{ role: 'user', content: 'hi' }]
    
    try {
      await this.checkIsCopilot()
      if (!stream) {
        // Non-streaming request
        const params: ChatCompletionCreateParamsNonStreaming = {
          model: model.id,
          messages,
          stream: false
        }
        
        const response = await this.sdk.chat.completions.create(params)
        if (!response?.choices[0].message) {
          throw new Error('Empty response')
        }
        return { valid: true, error: null }
      } else {
        // Streaming request
        const params = {
          model: model.id,
          messages,
          stream: true
        }
        
        const response = await this.sdk.chat.completions.create(params as any)
        // Wait for the entire streaming response to finish
        let hasContent = false
        try {
          for await (const chunk of response as unknown as Stream<ChatCompletionChunk>) {
            if (chunk.choices?.[0]?.delta?.content) {
              hasContent = true
            }
          }
          if (hasContent) {
            return { valid: true, error: null }
          }
          throw new Error('Empty streaming response')
        } catch (streamError) {
          console.error('Error in streaming check:', streamError);
          return { valid: false, error: streamError instanceof Error ? streamError : new Error(String(streamError)) };
        }
      }
    } catch (error: any) {
      return {
        valid: false,
        error
      }
    }
  }

  /**
   * Get the models
   * @returns The models
   */
  public async models(): Promise<OpenAI.Models.Model[]> {
    try {
      console.log(`[OpenAICompatibleProvider] Fetching models for provider: ${this.provider.id}`)
      await this.checkIsCopilot()

      console.log(`[OpenAICompatibleProvider] Calling SDK models.list for ${this.provider.id}`)
      const response = await this.sdk.models.list()
      console.log(`[OpenAICompatibleProvider] SDK models.list response received for ${this.provider.id}`)

      if (this.provider.id === 'github') {
        console.log(`[OpenAICompatibleProvider] Processing GitHub models`)
        // @ts-ignore key is not typed
        return response.body
          .map((model) => ({
            id: model.name,
            description: model.summary,
            object: 'model',
            owned_by: model.publisher
          }))
          .filter(isSupportedModel)
      }

      if (this.provider.id === 'together') {
        console.log(`[OpenAICompatibleProvider] Processing Together models`)
        // @ts-ignore key is not typed
        return response?.body
          .map((model: any) => ({
            id: model.id,
            description: model.display_name,
            object: 'model',
            owned_by: model.organization
          }))
          .filter(isSupportedModel)
      }

      if (this.provider.id === 'openrouter') {
        console.log(`[OpenAICompatibleProvider] Processing OpenRouter models, response:`, response)
      }

      const models = response.data || []
      console.log(`[OpenAICompatibleProvider] Got ${models.length} models for ${this.provider.id}`)

      models.forEach((model) => {
        if (model.id && typeof model.id === 'string') {
          model.id = model.id.trim()
        }
      })

      const filteredModels = models.filter(isSupportedModel)
      console.log(
        `[OpenAICompatibleProvider] Returning ${filteredModels.length} filtered models for ${this.provider.id}`
      )

      return filteredModels
    } catch (error) {
      console.error(`[OpenAICompatibleProvider] Error fetching models for ${this.provider.id}:`, error)
      return []
    }
  }

  /**
   * Get the embedding dimensions
   * @param model - The model
   * @returns The embedding dimensions
   */
  public async getEmbeddingDimensions(model: Model): Promise<number> {
    await this.checkIsCopilot()

    const data = await this.sdk.embeddings.create({
      model: model.id,
      input: model?.provider === 'baidu-cloud' ? ['hi'] : 'hi'
    })
    return data.data[0].embedding.length
  }

  public async checkIsCopilot() {
    if (this.provider.id !== 'copilot') {
      return
    }
    const defaultHeaders = store.getState().copilot.defaultHeaders
    // copilot每次请求前需要重新获取token，因为token中附带时间戳
    const { token } = await window.api.copilot.getToken(defaultHeaders)
    this.sdk.apiKey = token
  }
}
