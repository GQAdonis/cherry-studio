import { loggerService } from '@logger'
import { getModelContextLimit } from '@renderer/config/models/contextLimits'
import { estimateTextTokens } from '@renderer/services/TokenService'
import { ChunkType } from '@renderer/types/chunk'
import type { LanguageModelMiddleware } from 'ai'

import type { AiSdkMiddlewareConfig } from '../AiSdkMiddlewareBuilder'

const logger = loggerService.withContext('TokenValidationMiddleware')

/**
 * Estimates total tokens in the final payload including all components
 */
function estimateTotalPayloadTokens(params: any): number {
  let total = 0

  // System prompt
  if (params.system) {
    const systemText = typeof params.system === 'string' ? params.system : params.system?.text || ''
    total += estimateTextTokens(systemText)
  }

  // Messages
  if (params.messages && Array.isArray(params.messages)) {
    for (const msg of params.messages) {
      if (typeof msg.content === 'string') {
        total += estimateTextTokens(msg.content)
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === 'text' && part.text) {
            total += estimateTextTokens(part.text)
          }
          // Image parts are harder to estimate, use conservative estimate
          if (part.type === 'image') {
            total += 1000 // Conservative estimate for image tokens
          }
        }
      }
    }
  }

  // Tools (schemas can be large)
  if (params.tools) {
    const toolsJson = JSON.stringify(params.tools)
    total += estimateTextTokens(toolsJson)
  }

  // Model-specific overhead (formatting, special tokens, etc.)
  // Conservative 10% overhead
  total = Math.ceil(total * 1.1)

  return total
}

/**
 * Creates a middleware that validates token count before sending to LLM.
 * If payload exceeds limit, applies emergency context management.
 */
export function createTokenValidationMiddleware(config: AiSdkMiddlewareConfig): LanguageModelMiddleware {
  return {
    wrapGenerate: async ({ doGenerate, params }) => {
      if (!config.model) {
        logger.warn('No model provided to token validation middleware, skipping validation')
        return doGenerate()
      }

      const totalTokens = estimateTotalPayloadTokens(params)
      const contextLimit = config.model ? getModelContextLimit(config.model) : 128000
      const maxOutputTokens = (params as any).maxTokens || 4096

      // Calculate available context for input (reserve space for output)
      const availableInputTokens = contextLimit - maxOutputTokens

      logger.debug('Token validation check', {
        totalTokens,
        contextLimit,
        maxOutputTokens,
        availableInputTokens,
        modelId: config.model.id
      })

      // If within limit, proceed normally
      if (totalTokens <= availableInputTokens) {
        logger.debug('Token validation passed', { totalTokens, availableInputTokens })
        return doGenerate()
      }

      // EMERGENCY: Payload exceeds limit even after context strategy
      const overage = totalTokens - availableInputTokens
      logger.warn('Emergency: Final payload exceeds context limit after all processing', {
        totalTokens,
        availableInputTokens,
        overage,
        modelId: config.model.id
      })

      // Notify user via chunk that emergency context management is being applied
      if (config.onChunk) {
        config.onChunk({
          type: ChunkType.CONTEXT_ACTION,
          action: 'pruned',
          summary:
            `⚠️ Context size (${totalTokens.toLocaleString()} tokens) exceeds model limit (${availableInputTokens.toLocaleString()} tokens). ` +
            `Applying emergency context reduction...`
        })
      }

      // Apply emergency context reduction
      applyEmergencyContextReduction(params, overage)

      // Verify reduction worked
      const newTotalTokens = estimateTotalPayloadTokens(params)
      logger.info('Emergency context reduction applied', {
        originalTokens: totalTokens,
        newTokens: newTotalTokens,
        reduction: totalTokens - newTotalTokens,
        targetReduction: overage
      })

      // Notify user that emergency reduction was successful
      if (config.onChunk) {
        const messagesRemoved = (params as any).messages?.length - (params as any).messages?.length
        config.onChunk({
          type: ChunkType.CONTEXT_ACTION,
          action: 'pruned',
          summary: `✓ Context reduced from ${totalTokens.toLocaleString()} to ${newTotalTokens.toLocaleString()} tokens to fit model limit.`,
          removedCount: messagesRemoved > 0 ? messagesRemoved : undefined
        })
      }

      // If still too large, we have a problem
      if (newTotalTokens > availableInputTokens) {
        const remainingOverage = newTotalTokens - availableInputTokens
        logger.error('Emergency context reduction failed to bring payload under limit', {
          newTotalTokens,
          availableInputTokens,
          remainingOverage
        })

        throw new Error(
          `Unable to reduce context size sufficiently. ` +
            `Current: ${newTotalTokens} tokens, Limit: ${availableInputTokens} tokens. ` +
            `Please reduce message count or disable tools/knowledge base.`
        )
      }

      return doGenerate()
    }
  }
}

/**
 * Applies emergency context reduction when final payload is too large.
 * Strategy: Remove oldest messages first, preserve system prompt and tools.
 * Mutates params in-place.
 */
function applyEmergencyContextReduction(params: any, targetReduction: number): void {
  if (!params.messages || params.messages.length === 0) {
    logger.warn('No messages to reduce')
    return
  }

  const originalMessageCount = params.messages.length

  // Calculate how many messages to remove
  // Start from oldest (beginning of array) and work forward
  let tokensRemoved = 0
  let messagesToKeep = params.messages.length

  for (let i = 0; i < params.messages.length; i++) {
    const msg = params.messages[i]
    const msgTokens = estimateMessageTokens(msg)

    if (tokensRemoved + msgTokens >= targetReduction * 1.2) {
      // Remove 20% more than needed for safety margin
      break
    }

    tokensRemoved += msgTokens
    messagesToKeep = params.messages.length - (i + 1)
  }

  // Always keep at least the last message (user's current question)
  messagesToKeep = Math.max(1, messagesToKeep)

  logger.info('Emergency context reduction plan', {
    originalMessageCount,
    messagesToKeep,
    messagesRemoved: originalMessageCount - messagesToKeep,
    tokensRemoved,
    targetReduction
  })

  // Keep only the most recent messages (mutate in-place)
  params.messages = params.messages.slice(-messagesToKeep)
}

/**
 * Estimates tokens for a single message
 */
function estimateMessageTokens(msg: any): number {
  let tokens = 0

  if (typeof msg.content === 'string') {
    tokens = estimateTextTokens(msg.content)
  } else if (Array.isArray(msg.content)) {
    for (const part of msg.content) {
      if (part.type === 'text' && part.text) {
        tokens += estimateTextTokens(part.text)
      }
      if (part.type === 'image') {
        tokens += 1000 // Conservative estimate
      }
    }
  }

  return tokens
}
