/**
 * useArtifactRefinement Hook
 *
 * Handles AI refinement chat logic for artifacts.
 * Connects to AI provider, parses responses for updated artifact content,
 * and updates the store with new versions.
 */

import { useAppDispatch, useAppSelector } from '@renderer/store'
import { useCallback, useState } from 'react'

import {
  addRefinementMessage,
  saveVersion,
  selectIsRefining,
  selectRefinementMessages,
  setIsRefining,
  updateContent,
  updateRefinementMessage
} from '@renderer/store/artifacts'

import type { Artifact, RefinementMessage } from '../types'
import { extractArtifactContent, parseArtifacts } from '../utils/artifactParser'

interface UseArtifactRefinementOptions {
  /** The artifact being refined */
  artifact: Artifact
  /** Callback when refinement starts */
  onStart?: () => void
  /** Callback when refinement completes */
  onComplete?: (newContent: string) => void
  /** Callback when refinement fails */
  onError?: (error: Error) => void
}

interface UseArtifactRefinementResult {
  /** Refinement chat messages */
  messages: RefinementMessage[]
  /** Whether refinement is in progress */
  isRefining: boolean
  /** Send a refinement request */
  sendRefinement: (prompt: string) => Promise<void>
  /** Clear refinement messages */
  clearMessages: () => void
}

/**
 * Build system prompt for artifact refinement
 */
function buildSystemPrompt(artifact: Artifact): string {
  return `You are an expert developer helping to refine and improve ${artifact.type} artifacts.

Current artifact:
- Type: ${artifact.type}
- Title: ${artifact.title}
- Identifier: ${artifact.identifier}

Instructions:
1. When the user requests changes, understand the current code structure
2. Make precise, targeted changes to fulfill the request
3. Return the COMPLETE updated code wrapped in <cs-artifact> tags with the same attributes
4. Preserve the original structure and style where possible
5. Only change what's necessary

Response format:
<cs-artifact identifier="${artifact.identifier}" type="${artifact.type}" title="${artifact.title}">
[complete updated code here]
</cs-artifact>

Always return the complete artifact, not just the changes.`
}

/**
 * Build user prompt for artifact refinement
 */
function buildUserPrompt(request: string, artifact: Artifact): string {
  return `Current artifact content:
\`\`\`${artifact.type}
${artifact.content}
\`\`\`

Please make the following changes: ${request}`
}

/**
 * Extract updated artifact content from AI response
 */
function extractUpdatedContent(response: string, originalContent: string): string | null {
  // Try to parse cs-artifact tags from response
  const parseResult = parseArtifacts(response)

  if (parseResult.hasArtifacts && parseResult.artifacts.length > 0) {
    return parseResult.artifacts[0].content
  }

  // Try to extract raw artifact content
  const extracted = extractArtifactContent(response)
  if (extracted) {
    return extracted
  }

  // If no artifact tags found, check if the response is mostly code
  // (This handles cases where the AI returns code without wrapping it)
  const codeBlockMatch = response.match(/```[\w]*\n?([\s\S]*?)```/)
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim()
  }

  return null
}

/**
 * Hook for managing artifact refinement
 *
 * @param options - Refinement options
 * @returns Refinement methods and state
 */
export function useArtifactRefinement(options: UseArtifactRefinementOptions): UseArtifactRefinementResult {
  const { artifact, onStart, onComplete, onError } = options
  const dispatch = useAppDispatch()

  const messages = useAppSelector(selectRefinementMessages)
  const isRefining = useAppSelector(selectIsRefining)

  // Send refinement request
  const sendRefinement = useCallback(
    async (prompt: string) => {
      if (!prompt.trim() || isRefining) return

      // Notify start
      onStart?.()

      // Add user message
      dispatch(
        addRefinementMessage({
          role: 'user',
          content: prompt
        })
      )

      // Set refining state
      dispatch(setIsRefining(true))

      // Add placeholder assistant message
      const assistantMessageId = `assistant-${Date.now()}`
      dispatch(
        addRefinementMessage({
          role: 'assistant',
          content: '',
          isStreaming: true
        })
      )

      try {
        // Build prompts
        const systemPrompt = buildSystemPrompt(artifact)
        const userPrompt = buildUserPrompt(prompt, artifact)

        // TODO: Connect to actual AI provider
        // For now, we'll simulate a response that includes the updated artifact
        const response = await simulateAIResponse(systemPrompt, userPrompt, artifact)

        // Update the assistant message with full response
        dispatch(
          updateRefinementMessage({
            id: assistantMessageId,
            content: response,
            isStreaming: false
          })
        )

        // Extract updated content from response
        const newContent = extractUpdatedContent(response, artifact.content)

        if (newContent && newContent !== artifact.content) {
          // Save current version before updating
          await dispatch(
            saveVersion({
              artifact,
              newContent,
              refinementPrompt: prompt
            })
          )

          // Update artifact content
          dispatch(updateContent(newContent))

          // Notify completion
          onComplete?.(newContent)
        }
      } catch (error) {
        console.error('Refinement error:', error)
        dispatch(
          updateRefinementMessage({
            id: assistantMessageId,
            content: `Error: ${(error as Error).message}`,
            isStreaming: false
          })
        )
        onError?.(error as Error)
      } finally {
        dispatch(setIsRefining(false))
      }
    },
    [artifact, isRefining, dispatch, onStart, onComplete, onError]
  )

  // Clear messages
  const clearMessages = useCallback(() => {
    dispatch({ type: 'artifacts/clearRefinementMessages' })
  }, [dispatch])

  return {
    messages,
    isRefining,
    sendRefinement,
    clearMessages
  }
}

/**
 * Simulate AI response (placeholder for actual AI integration)
 */
async function simulateAIResponse(
  _systemPrompt: string,
  _userPrompt: string,
  artifact: Artifact
): Promise<string> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Return a simulated response that wraps the content in cs-artifact tags
  return `I've reviewed your request. Here's the updated artifact:

<cs-artifact identifier="${artifact.identifier}" type="${artifact.type}" title="${artifact.title}">
${artifact.content}

<!-- Note: This is a simulated response. To enable actual AI refinement, connect this hook to your AI provider. -->
</cs-artifact>

The artifact has been updated based on your request.`
}

export default useArtifactRefinement

