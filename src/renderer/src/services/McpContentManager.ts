/**
 * MCP Content Manager Service
 *
 * This module provides content size management for MCP tool results.
 * It estimates token counts and automatically summarizes large content
 * before it's sent to the LLM to prevent "prompt too long" errors.
 *
 * Key features:
 * - Token estimation for MCP tool results
 * - Configurable thresholds for auto-summarization
 * - Integration with existing summarization infrastructure
 * - Graceful fallback to truncation if summarization fails
 */

import { loggerService } from '@logger'
import { getAvailableInputBudget, getModelContextLimit } from '@renderer/config/models/contextLimits'
import store from '@renderer/store'
import type { MCPCallToolResponse, MCPToolResultContent, Model } from '@renderer/types'

import { getDefaultModel, getQuickModel } from './AssistantService'
import { estimateTextTokens } from './TokenService'

const logger = loggerService.withContext('McpContentManager')

/**
 * Configuration for MCP content management
 */
export interface McpContentConfig {
  /** Enable auto-summarization of large MCP results */
  enableAutoSummarization: boolean
  /** Maximum tokens allowed for a single MCP tool result (default: 50000) */
  maxToolResultTokens: number
  /** Token threshold that triggers summarization (default: 30000) */
  summarizationThreshold: number
  /** Target token count after summarization (default: 8000) */
  targetSummarizedTokens: number
  /** Maximum characters for truncation fallback (default: 100000) */
  maxCharactersForTruncation: number
}

/**
 * Default configuration values
 */
export const DEFAULT_MCP_CONTENT_CONFIG: McpContentConfig = {
  enableAutoSummarization: true,
  maxToolResultTokens: 50_000,
  summarizationThreshold: 30_000,
  targetSummarizedTokens: 8_000,
  maxCharactersForTruncation: 100_000
}

/**
 * Result of content analysis
 */
export interface ContentAnalysisResult {
  /** Original token count */
  originalTokens: number
  /** Whether content exceeds the threshold */
  exceedsThreshold: boolean
  /** Whether content is critically oversized (would cause API error) */
  isCriticallyOversized: boolean
  /** Recommended action */
  action: 'none' | 'summarize' | 'truncate'
  /** Available budget for this content */
  availableBudget: number
}

/**
 * Result of content processing
 */
export interface ContentProcessingResult {
  /** Processed content */
  content: MCPToolResultContent[]
  /** Whether content was modified */
  wasModified: boolean
  /** Original token count */
  originalTokens: number
  /** Final token count */
  finalTokens: number
  /** Processing action taken */
  action: 'none' | 'summarized' | 'truncated'
  /** Warning message if any */
  warning?: string
}

/**
 * Get the current MCP content configuration from settings
 */
export function getMcpContentConfig(): McpContentConfig {
  const settings = store.getState().settings
  return {
    enableAutoSummarization: settings.mcpAutoSummarization ?? DEFAULT_MCP_CONTENT_CONFIG.enableAutoSummarization,
    maxToolResultTokens: settings.mcpMaxToolResultTokens ?? DEFAULT_MCP_CONTENT_CONFIG.maxToolResultTokens,
    summarizationThreshold: settings.mcpSummarizationThreshold ?? DEFAULT_MCP_CONTENT_CONFIG.summarizationThreshold,
    targetSummarizedTokens: settings.mcpTargetSummarizedTokens ?? DEFAULT_MCP_CONTENT_CONFIG.targetSummarizedTokens,
    maxCharactersForTruncation:
      settings.mcpMaxCharactersForTruncation ?? DEFAULT_MCP_CONTENT_CONFIG.maxCharactersForTruncation
  }
}

/**
 * Extract text content from MCP tool result
 */
export function extractTextFromMcpResult(content: MCPToolResultContent[]): string {
  return content
    .map((item) => {
      if (item.type === 'text') {
        return item.text || ''
      }
      // For non-text content, estimate based on data size
      if (item.type === 'image' || item.type === 'audio') {
        // Base64 data is roughly 4/3 the size of binary
        const dataLength = item.data?.length || 0
        return `[${item.type} content: ~${Math.round(dataLength / 1000)}KB]`
      }
      return `[${item.type} content]`
    })
    .join('\n')
}

/**
 * Estimate token count for MCP tool result content
 */
export function estimateMcpResultTokens(content: MCPToolResultContent[]): number {
  let totalTokens = 0

  for (const item of content) {
    if (item.type === 'text') {
      totalTokens += estimateTextTokens(item.text || '')
    } else if (item.type === 'image' || item.type === 'audio') {
      // Base64 encoded media contributes significantly to tokens
      // Rough estimate: base64 is ~4 chars per 3 bytes, ~4 chars per token
      const dataLength = item.data?.length || 0
      totalTokens += Math.ceil(dataLength / 4)
    } else {
      // Unknown type, estimate conservatively
      totalTokens += 100
    }
  }

  return totalTokens
}

/**
 * Analyze MCP tool result content to determine if processing is needed
 */
export function analyzeMcpContent(
  content: MCPToolResultContent[],
  model?: Model,
  existingContextTokens: number = 0
): ContentAnalysisResult {
  const config = getMcpContentConfig()
  const effectiveModel = model || getDefaultModel()
  const availableBudget = getAvailableInputBudget(effectiveModel) - existingContextTokens

  const originalTokens = estimateMcpResultTokens(content)
  const exceedsThreshold = originalTokens > config.summarizationThreshold
  const isCriticallyOversized = originalTokens > availableBudget * 0.8 // 80% of available budget

  let action: 'none' | 'summarize' | 'truncate' = 'none'

  if (isCriticallyOversized) {
    action = config.enableAutoSummarization ? 'summarize' : 'truncate'
  } else if (exceedsThreshold && config.enableAutoSummarization) {
    action = 'summarize'
  }

  logger.debug('MCP content analysis', {
    originalTokens,
    availableBudget,
    exceedsThreshold,
    isCriticallyOversized,
    action
  })

  return {
    originalTokens,
    exceedsThreshold,
    isCriticallyOversized,
    action,
    availableBudget
  }
}

/**
 * Truncate text content to fit within token limit
 */
function truncateContent(text: string, maxTokens: number): string {
  const config = getMcpContentConfig()

  // Rough estimate: 4 characters per token
  const maxChars = Math.min(maxTokens * 4, config.maxCharactersForTruncation)

  if (text.length <= maxChars) {
    return text
  }

  // Keep beginning and end, truncate middle
  const keepChars = Math.floor(maxChars / 2)
  const beginning = text.substring(0, keepChars)
  const ending = text.substring(text.length - keepChars)

  const truncationNote = `\n\n[... CONTENT TRUNCATED: Original was ${text.length.toLocaleString()} characters, showing first and last ${keepChars.toLocaleString()} characters each ...]\n\n`

  return beginning + truncationNote + ending
}

/**
 * Summarize large text content using the quick model
 * This is a lightweight summarization for MCP tool results
 */
async function summarizeContent(text: string, targetTokens: number): Promise<string> {
  const model = getQuickModel() || getDefaultModel()

  // Dynamic import to avoid circular dependencies
  const { fetchGenerate } = await import('./ApiService')

  const prompt = `You are a content summarizer. Summarize the following content into approximately ${targetTokens} tokens while preserving:
1. Key facts, data, and specific details
2. Main topics and conclusions
3. Any actionable information or answers

Keep the summary factual and information-dense. Do not add commentary.

Content to summarize:`

  try {
    logger.info('Summarizing large MCP content', {
      originalLength: text.length,
      targetTokens,
      model: model.name
    })

    const summary = await fetchGenerate({
      prompt,
      content: text.substring(0, 100_000), // Limit input to prevent nested issues
      model
    })

    if (summary && summary.length > 0) {
      return `[AUTO-SUMMARIZED CONTENT]\n\n${summary}\n\n[Note: Original content was ${text.length.toLocaleString()} characters. Key information has been preserved.]`
    }

    // Fallback to truncation if summarization returns empty
    logger.warn('Summarization returned empty, falling back to truncation')
    return truncateContent(text, targetTokens)
  } catch (error) {
    logger.error('Failed to summarize MCP content, falling back to truncation', error as Error)
    return truncateContent(text, targetTokens)
  }
}

/**
 * Process MCP tool result content to ensure it fits within context limits
 * This is the main entry point for MCP content management
 */
export async function processMcpToolResult(
  response: MCPCallToolResponse,
  model?: Model,
  existingContextTokens: number = 0
): Promise<ContentProcessingResult> {
  const config = getMcpContentConfig()

  // Don't process error responses
  if (response.isError) {
    return {
      content: response.content,
      wasModified: false,
      originalTokens: estimateMcpResultTokens(response.content),
      finalTokens: estimateMcpResultTokens(response.content),
      action: 'none'
    }
  }

  const analysis = analyzeMcpContent(response.content, model, existingContextTokens)

  if (analysis.action === 'none') {
    return {
      content: response.content,
      wasModified: false,
      originalTokens: analysis.originalTokens,
      finalTokens: analysis.originalTokens,
      action: 'none'
    }
  }

  // Extract text for processing
  const originalText = extractTextFromMcpResult(response.content)

  let processedText: string
  let action: 'summarized' | 'truncated'
  let warning: string | undefined

  if (analysis.action === 'summarize' && config.enableAutoSummarization) {
    try {
      processedText = await summarizeContent(originalText, config.targetSummarizedTokens)
      action = 'summarized'
      warning = `Content was auto-summarized from ~${analysis.originalTokens.toLocaleString()} to ~${estimateTextTokens(processedText).toLocaleString()} tokens`
    } catch (error) {
      // Fallback to truncation
      processedText = truncateContent(originalText, config.targetSummarizedTokens)
      action = 'truncated'
      warning = `Summarization failed, content was truncated from ~${analysis.originalTokens.toLocaleString()} tokens`
    }
  } else {
    processedText = truncateContent(originalText, config.maxToolResultTokens)
    action = 'truncated'
    warning = `Content was truncated from ~${analysis.originalTokens.toLocaleString()} to ~${estimateTextTokens(processedText).toLocaleString()} tokens`
  }

  // Reconstruct content array with processed text
  const processedContent: MCPToolResultContent[] = [
    {
      type: 'text',
      text: processedText
    }
  ]

  // Preserve non-text content items (images, etc.) if they fit
  for (const item of response.content) {
    if (item.type !== 'text') {
      // Add small non-text items, skip large ones
      const itemTokens = estimateMcpResultTokens([item])
      if (itemTokens < 10_000) {
        processedContent.push(item)
      }
    }
  }

  const finalTokens = estimateMcpResultTokens(processedContent)

  logger.info('MCP content processed', {
    action,
    originalTokens: analysis.originalTokens,
    finalTokens,
    reduction: `${Math.round((1 - finalTokens / analysis.originalTokens) * 100)}%`
  })

  return {
    content: processedContent,
    wasModified: true,
    originalTokens: analysis.originalTokens,
    finalTokens,
    action,
    warning
  }
}

/**
 * Check if MCP content management should be applied based on settings
 */
export function shouldProcessMcpContent(): boolean {
  const config = getMcpContentConfig()
  return config.enableAutoSummarization || config.maxToolResultTokens < Infinity
}

/**
 * Get a human-readable description of the content analysis
 */
export function getContentAnalysisDescription(analysis: ContentAnalysisResult): string {
  if (analysis.isCriticallyOversized) {
    return `Content is critically oversized (~${analysis.originalTokens.toLocaleString()} tokens) and would exceed context limits. ${analysis.action === 'summarize' ? 'Will be auto-summarized.' : 'Will be truncated.'}`
  }

  if (analysis.exceedsThreshold) {
    return `Content is large (~${analysis.originalTokens.toLocaleString()} tokens) and may affect response quality. ${analysis.action === 'summarize' ? 'Will be auto-summarized.' : 'Consider enabling auto-summarization.'}`
  }

  return `Content size is acceptable (~${analysis.originalTokens.toLocaleString()} tokens)`
}

/**
 * Calculate optimal content limits based on model and current context
 */
export function calculateOptimalLimits(
  model?: Model,
  existingContextTokens: number = 0
): {
  maxSafeTokens: number
  recommendedThreshold: number
  warningThreshold: number
} {
  const effectiveModel = model || getDefaultModel()
  const modelLimit = getModelContextLimit(effectiveModel)
  const availableBudget = getAvailableInputBudget(effectiveModel) - existingContextTokens

  // Reserve space for response and other messages
  const maxSafeTokens = Math.floor(availableBudget * 0.5) // Max 50% of available for single tool result
  const recommendedThreshold = Math.floor(availableBudget * 0.3) // Trigger summarization at 30%
  const warningThreshold = Math.floor(availableBudget * 0.7) // Warning at 70%

  logger.debug('Calculated optimal limits', {
    modelLimit,
    availableBudget,
    existingContextTokens,
    maxSafeTokens,
    recommendedThreshold,
    warningThreshold
  })

  return {
    maxSafeTokens,
    recommendedThreshold,
    warningThreshold
  }
}

export default {
  getMcpContentConfig,
  analyzeMcpContent,
  processMcpToolResult,
  estimateMcpResultTokens,
  extractTextFromMcpResult,
  shouldProcessMcpContent,
  getContentAnalysisDescription,
  calculateOptimalLimits
}
