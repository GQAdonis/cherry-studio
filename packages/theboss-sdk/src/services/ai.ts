/**
 * AI Service Module
 *
 * Provides AI completion, streaming, and embedding services.
 */

import type {
  AICompletionOptions,
  AICompletionResult,
  AIEmbeddingResult,
  AIMessage,
  AIService,
  AIStreamChunk,
  Transport
} from '../types'

export function createAIService(transport: Transport): AIService {
  return {
    /**
     * Complete a chat conversation
     */
    async complete(messages: AIMessage[], options: AICompletionOptions = {}): Promise<AICompletionResult> {
      return transport.request<AICompletionResult>('ai:complete', {
        messages,
        ...options
      })
    },

    /**
     * Stream a chat completion
     */
    async *streamComplete(
      messages: AIMessage[],
      options: AICompletionOptions = {}
    ): AsyncGenerator<AIStreamChunk, AICompletionResult, unknown> {
      // Request streaming completion
      const streamId = await transport.request<string>('ai:stream-start', {
        messages,
        ...options
      })

      // Set up stream listener
      let done = false
      const chunks: AIStreamChunk[] = []
      let finalResult: AICompletionResult | null = null

      const cleanup = transport.onMessage((type, payload) => {
        if (type === `ai:stream-chunk:${streamId}`) {
          chunks.push(payload as AIStreamChunk)
        } else if (type === `ai:stream-end:${streamId}`) {
          finalResult = payload as AICompletionResult
          done = true
        } else if (type === `ai:stream-error:${streamId}`) {
          throw new Error((payload as { error: string }).error)
        }
      })

      try {
        // Yield chunks as they arrive
        while (!done) {
          while (chunks.length > 0) {
            yield chunks.shift()!
          }
          // Wait a bit for more chunks
          await new Promise((resolve) => setTimeout(resolve, 10))
        }

        // Yield any remaining chunks
        while (chunks.length > 0) {
          yield chunks.shift()!
        }

        if (!finalResult) {
          throw new Error('Stream ended without result')
        }

        return finalResult
      } finally {
        cleanup()
      }
    },

    /**
     * Generate embeddings for text
     */
    async embed(text: string): Promise<AIEmbeddingResult> {
      return transport.request<AIEmbeddingResult>('ai:embed', { text })
    }
  }
}
