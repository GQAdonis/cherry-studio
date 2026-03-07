/**
 * Conversation Summarizer Service
 *
 * Generates AI-powered summaries of entire conversations for use in artifact refinement.
 * Includes smart caching by conversation ID + message count for instant re-access.
 *
 * Key features:
 * - Summarizes full conversation (not just last N messages)
 * - Caches summaries by conversationId + messageCount
 * - Focuses on artifact-relevant context (requirements, decisions, evolution)
 * - Uses the same LLM provider as the parent conversation
 */

import { loggerService } from '@logger'
import type { ModernAiProviderConfig } from '@renderer/aiCore/index_new'
import AiProviderNew from '@renderer/aiCore/index_new'
import { getDefaultModel, getProviderByModel } from '@renderer/services/AssistantService'
import type { Assistant, Model } from '@renderer/types'
import type { Message } from '@renderer/types/newMessage'
import { purifyMarkdownImages } from '@renderer/utils/markdown'
import { getMainTextContent } from '@renderer/utils/messageUtils/find'

import type { Artifact, ParsedArtifact } from '../types'

const logger = loggerService.withContext('ConversationSummarizer')

/**
 * Cache entry for conversation summaries
 */
interface SummaryCacheEntry {
  summary: string
  messageCount: number
  artifactIdentifier: string
  timestamp: number
}

/**
 * Cache for conversation summaries
 * Key: conversationId
 * Value: SummaryCacheEntry
 */
const summaryCache = new Map<string, SummaryCacheEntry>()

/**
 * Cache TTL in milliseconds (30 minutes)
 */
const CACHE_TTL = 30 * 60 * 1000

/**
 * System prompt for conversation summarization focused on artifact context
 */
const SUMMARIZATION_SYSTEM_PROMPT = `You are a context summarizer. Your task is to create a concise summary of a conversation that led to the creation of an artifact (interactive web component).

Focus on:
1. **Original User Requirements**: What did the user want to build?
2. **Design Decisions**: Key choices made during the conversation (colors, layout, functionality, etc.)
3. **Technical Constraints**: Any limitations or requirements mentioned (responsive design, accessibility, specific libraries, etc.)
4. **Artifact Evolution**: How the artifact changed through iterations (if any)
5. **Current State**: What the artifact does now

Output format:
- Write in first person from the user's perspective ("I wanted to build...")
- Be concise but capture all important context
- Include specific details that would help refine the artifact (colors, text, functionality)
- Keep the summary under 500 words

Do NOT include:
- Generic conversation pleasantries
- Step-by-step code explanations
- Raw code blocks
- Timestamps or metadata`

/**
 * Generate cache key for a conversation + artifact combination
 */
function getCacheKey(conversationId: string, artifactIdentifier: string): string {
  return `${conversationId}:${artifactIdentifier}`
}

/**
 * Check if a cached summary is still valid
 */
function isCacheValid(entry: SummaryCacheEntry, currentMessageCount: number): boolean {
  const isNotExpired = Date.now() - entry.timestamp < CACHE_TTL
  const hasCorrectCount = entry.messageCount === currentMessageCount
  return isNotExpired && hasCorrectCount
}

/**
 * Get cached summary if available and valid
 */
export function getCachedSummary(
  conversationId: string,
  artifactIdentifier: string,
  currentMessageCount: number
): string | null {
  const cacheKey = getCacheKey(conversationId, artifactIdentifier)
  const cached = summaryCache.get(cacheKey)

  if (cached && isCacheValid(cached, currentMessageCount)) {
    logger.info('Cache hit for conversation summary', { conversationId, artifactIdentifier })
    return cached.summary
  }

  if (cached) {
    logger.info('Cache miss - stale entry', {
      conversationId,
      cachedCount: cached.messageCount,
      currentCount: currentMessageCount
    })
    summaryCache.delete(cacheKey)
  }

  return null
}

/**
 * Store summary in cache
 */
function cacheSummary(conversationId: string, artifactIdentifier: string, summary: string, messageCount: number): void {
  const cacheKey = getCacheKey(conversationId, artifactIdentifier)
  summaryCache.set(cacheKey, {
    summary,
    messageCount,
    artifactIdentifier,
    timestamp: Date.now()
  })
  logger.info('Cached conversation summary', { conversationId, artifactIdentifier, messageCount })
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): void {
  const now = Date.now()
  for (const [key, entry] of summaryCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      summaryCache.delete(key)
    }
  }
}

/**
 * Clear all cache entries for a specific conversation
 */
export function clearConversationCache(conversationId: string): void {
  for (const key of summaryCache.keys()) {
    if (key.startsWith(`${conversationId}:`)) {
      summaryCache.delete(key)
    }
  }
}

/**
 * Format messages for summarization
 */
function formatMessagesForSummarization(messages: Message[], artifact: ParsedArtifact | Artifact): string {
  const formattedMessages = messages.map((message) => {
    const mainText = purifyMarkdownImages(getMainTextContent(message))
    const role = message.role.charAt(0).toUpperCase() + message.role.slice(1)
    return `**${role}**: ${mainText}`
  })

  return `## Conversation about: ${artifact.title}
Artifact Type: ${artifact.type}

---

${formattedMessages.join('\n\n')}

---

Please summarize this conversation focusing on the context needed to refine the artifact "${artifact.title}".`
}

/**
 * Options for summarizing a conversation
 */
export interface SummarizeConversationOptions {
  /** Messages from the conversation */
  messages: Message[]
  /** The artifact being opened */
  artifact: ParsedArtifact | Artifact
  /** Conversation ID for caching */
  conversationId: string
  /** Model to use for summarization (defaults to parent conversation model or default model) */
  model?: Model
  /** Assistant configuration (optional) */
  assistant?: Assistant
  /** Skip cache and force regeneration */
  skipCache?: boolean
}

/**
 * Result of conversation summarization
 */
export interface SummarizeConversationResult {
  summary: string
  fromCache: boolean
  messageCount: number
}

/**
 * Summarize an entire conversation for artifact refinement context
 *
 * @param options - Summarization options
 * @returns Promise with summary result
 */
export async function summarizeConversation(
  options: SummarizeConversationOptions
): Promise<SummarizeConversationResult> {
  const { messages, artifact, conversationId, model, assistant, skipCache = false } = options

  const artifactIdentifier = artifact.identifier
  const messageCount = messages.length

  logger.info('Summarizing conversation for artifact', {
    conversationId,
    artifactIdentifier,
    messageCount,
    artifactType: artifact.type
  })

  // Check cache first (unless skipped)
  if (!skipCache) {
    const cachedSummary = getCachedSummary(conversationId, artifactIdentifier, messageCount)
    if (cachedSummary) {
      return {
        summary: cachedSummary,
        fromCache: true,
        messageCount
      }
    }
  }

  // No cached summary or cache skipped, generate new one
  const summaryModel = model || getDefaultModel()
  const provider = getProviderByModel(summaryModel)

  if (!provider) {
    logger.warn('No provider available for summarization, using fallback', { modelId: summaryModel.id })
    // Return a minimal context summary if no provider available
    const fallbackSummary = generateFallbackSummary(messages, artifact)
    return {
      summary: fallbackSummary,
      fromCache: false,
      messageCount
    }
  }

  try {
    const AI = new AiProviderNew(summaryModel)
    const formattedConversation = formatMessagesForSummarization(messages, artifact)

    const llmMessages = {
      system: SUMMARIZATION_SYSTEM_PROMPT,
      prompt: formattedConversation
    }

    const middlewareConfig: Partial<ModernAiProviderConfig> = {
      streamOutput: false,
      enableWebSearch: false,
      mcpTools: []
    }

    const summaryAssistant = assistant || {
      id: 'conversation-summarizer',
      name: 'Conversation Summarizer',
      model: summaryModel,
      prompt: SUMMARIZATION_SYSTEM_PROMPT,
      settings: {
        reasoning_effort: undefined,
        qwenThinkMode: false,
        streamOutput: false,
        temperature: 0.3 // Lower temperature for more focused summaries
      }
    }

    const { getText } = await AI.completions(summaryModel.id, llmMessages, {
      ...middlewareConfig,
      assistant: summaryAssistant as Assistant,
      topicId: conversationId,
      callType: 'summary'
    })

    const summary = getText() || generateFallbackSummary(messages, artifact)

    // Cache the result
    cacheSummary(conversationId, artifactIdentifier, summary, messageCount)

    logger.info('Generated conversation summary', {
      conversationId,
      artifactIdentifier,
      summaryLength: summary.length
    })

    return {
      summary,
      fromCache: false,
      messageCount
    }
  } catch (error) {
    logger.error('Failed to summarize conversation', error as Error)

    // Return fallback summary on error
    const fallbackSummary = generateFallbackSummary(messages, artifact)
    return {
      summary: fallbackSummary,
      fromCache: false,
      messageCount
    }
  }
}

/**
 * Generate a fallback summary when LLM is unavailable
 */
function generateFallbackSummary(messages: Message[], artifact: ParsedArtifact | Artifact): string {
  const userMessages = messages.filter((m) => m.role === 'user')
  const title = artifact.title
  const type = artifact.type

  // Extract first user message as initial requirement
  const firstUserMessage = userMessages[0] ? purifyMarkdownImages(getMainTextContent(userMessages[0])) : ''
  const truncatedRequirement = firstUserMessage.length > 200 ? `${firstUserMessage.slice(0, 200)}...` : firstUserMessage

  // Extract last user message if different
  const lastUserMessage =
    userMessages.length > 1 ? purifyMarkdownImages(getMainTextContent(userMessages[userMessages.length - 1])) : ''
  const truncatedLastMessage = lastUserMessage.length > 200 ? `${lastUserMessage.slice(0, 200)}...` : lastUserMessage

  let summary = `## Artifact Context: ${title}

**Type:** ${type}
**Messages in conversation:** ${messages.length}

**Initial Request:**
${truncatedRequirement || 'Not available'}
`

  if (truncatedLastMessage && truncatedLastMessage !== truncatedRequirement) {
    summary += `
**Most Recent Request:**
${truncatedLastMessage}
`
  }

  return summary
}

/**
 * Clear entire summary cache
 */
export function clearAllCache(): void {
  summaryCache.clear()
  logger.info('Cleared all conversation summary cache')
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: summaryCache.size,
    keys: Array.from(summaryCache.keys())
  }
}

export default summarizeConversation
