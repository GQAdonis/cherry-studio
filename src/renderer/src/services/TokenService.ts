import {
  getAvailableInputBudget,
  getEffectiveContextBudget,
  getModelContextLimit
} from '@renderer/config/models/contextLimits'
import type { Assistant, FileMetadata, Model, Usage } from '@renderer/types'
import { FileTypes } from '@renderer/types'
import type { Message} from '@renderer/types/newMessage';
import { MessageBlockType } from '@renderer/types/newMessage'
import { findAllBlocks, findFileBlocks, getMainTextContent, getThinkingContent } from '@renderer/utils/messageUtils/find'
import { flatten, takeRight } from 'lodash'
import { approximateTokenSize } from 'tokenx'

import { getAssistantSettings } from './AssistantService'
import { filterAfterContextClearMessages, filterMessages } from './MessagesService'

interface MessageItem {
  name?: string
  role: 'system' | 'user' | 'assistant'
  content: string
}

async function getFileContent(file: FileMetadata) {
  if (!file) {
    return ''
  }

  if (file.type === FileTypes.TEXT) {
    return await window.api.file.read(file.id + file.ext, true)
  }

  return ''
}

async function getMessageParam(message: Message): Promise<MessageItem[]> {
  const param: MessageItem[] = []

  const content = getMainTextContent(message)
  const files = findFileBlocks(message)

  param.push({
    role: message.role,
    content
  })

  if (files.length > 0) {
    for (const file of files) {
      param.push({
        role: 'assistant',
        content: await getFileContent(file.file)
      })
    }
  }

  return param
}

/**
 * 估算文本内容的 token 数量
 *
 * @param text - 需要估算的文本内容
 * @returns 返回估算的 token 数量
 */
export function estimateTextTokens(text: string) {
  return approximateTokenSize(text)
}

/**
 * 估算图片文件的 token 数量
 *
 * 根据图片文件大小计算预估的 token 数量。
 * 当前使用简单的文件大小除以 100 的方式进行估算。
 *
 * @param file - 图片文件对象
 * @returns 返回估算的 token 数量
 */
export function estimateImageTokens(file: FileMetadata) {
  return Math.floor(file.size / 100)
}

/**
 * 估算用户输入内容（文本和文件）的 token 用量。
 *
 * 该函数只根据传入的 content（文本内容）和 files（文件列表）估算，
 * 不依赖完整的 Message 结构，也不会处理消息块、上下文等信息。
 *
 * @param {Object} params - 输入参数对象
 * @param {string} [params.content] - 用户输入的文本内容
 * @param {FileMetadata[]} [params.files] - 用户上传的文件列表（支持图片和文本）
 * @returns {Promise<Usage>} 返回一个 Usage 对象，包含 prompt_tokens、completion_tokens、total_tokens
 */
export async function estimateUserPromptUsage({
  content,
  files
}: {
  content?: string
  files?: FileMetadata[]
}): Promise<Usage> {
  let imageTokens = 0

  if (files && files.length > 0) {
    const images = files.filter((f) => f.type === FileTypes.IMAGE)
    if (images.length > 0) {
      for (const image of images) {
        imageTokens = estimateImageTokens(image) + imageTokens
      }
    }
  }

  const tokens = estimateTextTokens(content || '')

  return {
    prompt_tokens: tokens,
    completion_tokens: tokens,
    total_tokens: tokens + (imageTokens ? imageTokens - 7 : 0)
  }
}

/**
 * 估算完整消息（Message）的 token 用量。
 *
 * 该函数会自动从 message 中提取主文本内容、推理内容（reasoningContent）和所有文件块，
 * 统计文本和图片的 token 数量，适用于对完整消息对象进行 usage 估算。
 *
 * @param {Partial<Message>} message - 消息对象，可以是完整或部分 Message
 * @returns {Promise<Usage>} 返回一个 Usage 对象，包含 prompt_tokens、completion_tokens、total_tokens
 */
export async function estimateMessageUsage(message: Partial<Message>): Promise<Usage> {
  const fileBlocks = findFileBlocks(message as Message)
  const files = fileBlocks.map((f) => f.file)

  let imageTokens = 0

  if (files.length > 0) {
    const images = files.filter((f) => f.type === FileTypes.IMAGE)
    if (images.length > 0) {
      for (const image of images) {
        imageTokens = estimateImageTokens(image) + imageTokens
      }
    }
  }

  const content = getMainTextContent(message as Message)
  const reasoningContent = getThinkingContent(message as Message)
  const combinedContent = [content, reasoningContent].filter((s) => s !== undefined).join(' ')
  const tokens = estimateTextTokens(combinedContent)

  return {
    prompt_tokens: tokens,
    completion_tokens: tokens,
    total_tokens: tokens + (imageTokens ? imageTokens - 7 : 0)
  }
}

export async function estimateMessagesUsage({
  assistant,
  messages
}: {
  assistant: Assistant
  messages: Message[]
}): Promise<Usage> {
  const outputMessage = messages.pop()!

  const prompt_tokens = await estimateHistoryTokens(assistant, messages)
  const { completion_tokens } = await estimateMessageUsage(outputMessage)

  return {
    prompt_tokens,
    completion_tokens,
    total_tokens: prompt_tokens + completion_tokens
  } as Usage
}

export async function estimateHistoryTokens(assistant: Assistant, msgs: Message[]) {
  const { contextCount } = getAssistantSettings(assistant)
  const maxContextCount = contextCount
  const messages = filterMessages(filterAfterContextClearMessages(takeRight(msgs, maxContextCount)))

  // 有 usage 数据的消息，快速计算总数
  const uasageTokens = messages
    .filter((m) => m.usage)
    .reduce((acc, message) => {
      const inputTokens = message.usage?.total_tokens ?? 0
      const outputTokens = message.usage!.completion_tokens ?? 0
      return acc + (message.role === 'user' ? inputTokens : outputTokens)
    }, 0)

  // 没有 usage 数据的消息，需要计算每条消息的 token
  let allMessages: MessageItem[][] = []

  for (const message of messages.filter((m) => !m.usage)) {
    const items = await getMessageParam(message)
    allMessages = allMessages.concat(items)
  }

  const prompt = assistant.prompt
  const input = flatten(allMessages)
    .map((m) => m.content)
    .join('\n')

  return estimateTextTokens(prompt + input) + uasageTokens
}

// ==================== Context Management Token Estimation ====================

/**
 * Estimate tokens for a single message (synchronous version for context strategies)
 *
 * @param message - The message to estimate
 * @returns Estimated token count
 */
export function estimateSingleMessageTokens(message: Message): number {
  if (!message.blocks || message.blocks.length === 0) {
    // Fallback for messages without blocks (legacy or simple)
    const content = getMainTextContent(message)
    const reasoningContent = getThinkingContent(message)
    const combinedContent = [content, reasoningContent].filter((s) => s !== undefined).join(' ')
    return estimateTextTokens(combinedContent)
  }

  let totalTokens = 0
  const blocks = findAllBlocks(message)

  for (const block of blocks) {
    // Skip blocks that don't contribute to context sent to LLM
    if (block.type === MessageBlockType.ERROR || block.type === MessageBlockType.UNKNOWN) {
      continue
    }

    switch (block.type) {
      case MessageBlockType.MAIN_TEXT:
      case MessageBlockType.THINKING:
      case MessageBlockType.TRANSLATION:
      case MessageBlockType.CODE:
      case MessageBlockType.COMPACT:
        // Text-based blocks
        if ((block as any).content) {
          totalTokens += estimateTextTokens((block as any).content)
        }
        break

      case MessageBlockType.IMAGE: {
        const imgBlock = block as any
        if (imgBlock.file) {
          totalTokens += estimateImageTokens(imgBlock.file)
        } else if (imgBlock.url) {
           // Heuristic for URL images if not downloaded: assume typical size
           totalTokens += 85 // Roughly small image tokens
        }
        break
      }

      case MessageBlockType.FILE: {
        const fileBlock = block as any
        // Rough estimate for text files: ~4 chars per token if we can't read it here
        if (fileBlock.file?.size) {
          totalTokens += Math.floor(fileBlock.file.size / 4)
        }
        break
      }

      case MessageBlockType.TOOL: {
        const toolBlock = block as any
        // Estimate tokens for tool name, args, and result
        let toolContent = `Tool: ${toolBlock.toolName || ''} `
        if (toolBlock.arguments) {
          toolContent += `Args: ${JSON.stringify(toolBlock.arguments)} `
        }
        if (toolBlock.content) {
          const contentStr = typeof toolBlock.content === 'string' 
            ? toolBlock.content 
            : JSON.stringify(toolBlock.content)
          toolContent += `Result: ${contentStr}`
        }
        totalTokens += estimateTextTokens(toolContent)
        break
      }

      case MessageBlockType.CITATION: {
        const citationBlock = block as any
        let citationContent = ''
        // Estimate for web search results
        if (citationBlock.response && Array.isArray(citationBlock.response.results)) {
           for (const result of citationBlock.response.results) {
             citationContent += `${result.title} ${result.url} ${result.content || ''} `
           }
        }
        // Estimate for knowledge base refs
        if (Array.isArray(citationBlock.knowledge)) {
           for (const k of citationBlock.knowledge) {
             citationContent += `${k.fileName} ${k.content} `
           }
        }
        if (citationContent) {
          totalTokens += estimateTextTokens(citationContent)
        }
        break
      }
      
      case MessageBlockType.VIDEO: {
         // Treat video similar to image/file metadata for now
         const videoBlock = block as any
         if (videoBlock.url) {
           totalTokens += estimateTextTokens(videoBlock.url)
         }
         break
      }
      
      case MessageBlockType.ARTIFACT: {
         const artifactBlock = block as any
         if (artifactBlock.content) {
           totalTokens += estimateTextTokens(artifactBlock.content)
         }
         break
      }

      default:
        // Try to find content property for unknown blocks
        if ((block as any).content && typeof (block as any).content === 'string') {
          totalTokens += estimateTextTokens((block as any).content)
        }
        break
    }
  }

  return totalTokens
}

/**
 * Estimate total tokens for an array of messages
 *
 * @param messages - Array of messages to estimate
 * @returns Total estimated token count
 */
export function estimateMessagesTokens(messages: Message[]): number {
  return messages.reduce((total, message) => total + estimateSingleMessageTokens(message), 0)
}

/**
 * Estimate the total token usage for a conversation including system prompt
 *
 * @param messages - Array of messages in the conversation
 * @param systemPrompt - Optional system prompt text
 * @returns Total estimated token count
 */
export function estimateConversationTokens(messages: Message[], systemPrompt?: string): number {
  let total = estimateMessagesTokens(messages)

  if (systemPrompt) {
    total += estimateTextTokens(systemPrompt)
  }

  return total
}

/**
 * Calculate remaining token budget for a conversation
 *
 * @param model - The model being used
 * @param messages - Current messages in the conversation
 * @param systemPrompt - Optional system prompt
 * @param maxOutputTokens - Expected max output tokens (for response budget)
 * @returns Object with budget information
 */
export function calculateRemainingBudget(
  model: Model,
  messages: Message[],
  systemPrompt?: string,
  maxOutputTokens?: number
): {
  modelLimit: number
  effectiveBudget: number
  availableInputBudget: number
  currentUsage: number
  remainingBudget: number
  isOverBudget: boolean
  overBudgetBy: number
} {
  const modelLimit = getModelContextLimit(model)
  const effectiveBudget = getEffectiveContextBudget(model)
  const availableInputBudget = getAvailableInputBudget(model, maxOutputTokens)
  const currentUsage = estimateConversationTokens(messages, systemPrompt)
  const remainingBudget = availableInputBudget - currentUsage
  const isOverBudget = currentUsage > availableInputBudget
  const overBudgetBy = isOverBudget ? currentUsage - availableInputBudget : 0

  return {
    modelLimit,
    effectiveBudget,
    availableInputBudget,
    currentUsage,
    remainingBudget,
    isOverBudget,
    overBudgetBy
  }
}

/**
 * Find messages that fit within a token budget (from most recent)
 *
 * @param messages - Array of messages (oldest to newest)
 * @param tokenBudget - Maximum tokens allowed
 * @param systemPromptTokens - Tokens used by system prompt (already accounted for)
 * @returns Array of messages that fit within budget (oldest to newest order preserved)
 */
export function findMessagesThatFit(
  messages: Message[],
  tokenBudget: number,
  systemPromptTokens: number = 0
): {
  fittingMessages: Message[]
  removedCount: number
  tokensSaved: number
} {
  let availableBudget = tokenBudget - systemPromptTokens
  const fittingMessages: Message[] = []
  let removedCount = 0
  let tokensSaved = 0

  // Start from the end (most recent) and work backwards
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    const messageTokens = estimateSingleMessageTokens(message)

    if (messageTokens <= availableBudget) {
      fittingMessages.unshift(message) // Add to front to preserve order
      availableBudget -= messageTokens
    } else {
      removedCount++
      tokensSaved += messageTokens
    }
  }

  return {
    fittingMessages,
    removedCount,
    tokensSaved
  }
}

/**
 * Estimate tokens for each message in an array
 *
 * @param messages - Array of messages
 * @returns Array of objects with message and its estimated tokens
 */
export function estimateTokensPerMessage(messages: Message[]): Array<{ message: Message; tokens: number }> {
  return messages.map((message) => ({
    message,
    tokens: estimateSingleMessageTokens(message)
  }))
}
