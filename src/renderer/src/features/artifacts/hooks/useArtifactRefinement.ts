/**
 * useArtifactRefinement Hook
 *
 * Handles AI refinement chat logic for artifacts.
 * Connects to AI provider, parses responses for updated artifact content,
 * and updates the store with new versions.
 *
 * Key features:
 * - Handles ALL chunk types (text, thinking, web search, knowledge, MCP tools)
 * - Separates conversational text from artifact content during streaming
 * - Streams artifact content to code view in real-time
 * - Displays AI explanations, thinking, citations in chat panel
 */

import { loggerService } from '@logger'
import { fetchChatCompletion } from '@renderer/services/ApiService'
import { getDefaultAssistant, getDefaultModel } from '@renderer/services/AssistantService'
import { useAppDispatch, useAppSelector } from '@renderer/store'
import {
  addRefinementMessage,
  saveVersion,
  selectContextMessages,
  selectIsRefining,
  selectParentModelId,
  selectRefinementMessages,
  setIsArtifactStreaming,
  setIsRefining,
  updateContent,
  updateRefinementMessage,
  updateStreamingArtifactContent
} from '@renderer/store/artifacts'
import type { Assistant } from '@renderer/types'
import { ChunkType } from '@renderer/types/chunk'
import { useCallback, useRef } from 'react'

import { getArtifactRefinementPrompt } from '../agent/refinementPrompt'
import type {
  Artifact,
  ArtifactLifecycleEvent,
  ContextMessage,
  RefinementContextAction,
  RefinementMessage,
  RefinementSkillActivation
} from '../types'
import { extractArtifactContent, separateTextAndArtifact } from '../utils/artifactParser'

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
  /** Context messages from original conversation */
  contextMessages: ContextMessage[]
  /** Send a refinement request */
  sendRefinement: (prompt: string) => Promise<void>
  /** Clear refinement messages */
  clearMessages: () => void
}

const logger = loggerService.withContext('useArtifactRefinement')

/**
 * Build system prompt for artifact refinement
 * Uses the locked-in artifact refinement agent prompt
 */
function buildSystemPrompt(artifact: Artifact, contextMessages: ContextMessage[]): string {
  // Get the base refinement prompt with artifact-specific instructions
  const basePrompt = getArtifactRefinementPrompt(artifact)

  // Build context section from original conversation
  let contextSection = ''
  if (contextMessages.length > 0) {
    contextSection = `

## Original Conversation Context

The following is context from the original conversation where this artifact was created:

${contextMessages.map((msg) => `**${msg.role.charAt(0).toUpperCase() + msg.role.slice(1)}**: ${msg.content}`).join('\n\n')}

---

`
  }

  // Append context section to the base prompt
  return `${basePrompt}
${contextSection}`
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
 * Create a refinement assistant with the artifact-specific prompt
 */
function createRefinementAssistant(artifact: Artifact, contextMessages: ContextMessage[], modelId?: string): Assistant {
  const baseAssistant = getDefaultAssistant()
  const model = modelId ? { ...getDefaultModel(), id: modelId } : getDefaultModel()
  const systemPrompt = buildSystemPrompt(artifact, contextMessages)

  return {
    ...baseAssistant,
    id: 'artifact-refinement-assistant',
    name: 'Artifact Designer',
    model,
    prompt: systemPrompt,
    settings: {
      ...baseAssistant.settings,
      temperature: 0.7,
      streamOutput: true
    }
  }
}

/**
 * Hook for managing artifact refinement
 *
 * Handles ALL chunk types from AI responses:
 * - TEXT_DELTA/COMPLETE: Text content and artifact code
 * - THINKING_START/DELTA/COMPLETE: AI reasoning/thinking
 * - WEB_SEARCH_IN_PROGRESS/COMPLETE: Web search results
 * - KNOWLEDGE_SEARCH_IN_PROGRESS/COMPLETE: Knowledge base hits
 * - MCP_TOOL_IN_PROGRESS/COMPLETE: MCP tool calls
 *
 * @param options - Refinement options
 * @returns Refinement methods and state
 */
export function useArtifactRefinement(options: UseArtifactRefinementOptions): UseArtifactRefinementResult {
  const { artifact, onStart, onComplete, onError } = options
  const dispatch = useAppDispatch()

  const messages = useAppSelector(selectRefinementMessages)
  const isRefining = useAppSelector(selectIsRefining)
  const contextMessages = useAppSelector(selectContextMessages)
  const parentModelId = useAppSelector(selectParentModelId)

  // Track accumulated content
  const responseContentRef = useRef<string>('')
  const thinkingContentRef = useRef<string>('')
  const assistantMessageIdRef = useRef<string>('')
  const skillActivationsRef = useRef<RefinementSkillActivation[]>([])
  const contextActionsRef = useRef<RefinementContextAction[]>([])
  const artifactLifecycleRef = useRef<ArtifactLifecycleEvent[]>([])

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
      dispatch(setIsArtifactStreaming(false))
      dispatch(updateStreamingArtifactContent(null))

      // Reset tracking refs
      responseContentRef.current = ''
      thinkingContentRef.current = ''
      assistantMessageIdRef.current = `assistant-${Date.now()}`
      skillActivationsRef.current = []
      contextActionsRef.current = []
      artifactLifecycleRef.current = [
        {
          stage: 'started',
          summary: 'Artifact refinement started',
          timestamp: new Date().toISOString()
        }
      ]

      // Add placeholder assistant message
      dispatch(
        addRefinementMessage({
          id: assistantMessageIdRef.current,
          role: 'assistant',
          content: '',
          isStreaming: true,
          artifactLifecycle: artifactLifecycleRef.current
        })
      )

      try {
        // Create assistant with refinement prompt
        const assistant = createRefinementAssistant(artifact, contextMessages, parentModelId || undefined)

        // Build the user prompt with artifact content
        const userPrompt = buildUserPrompt(prompt, artifact)

        // Call AI with streaming - handle ALL chunk types
        await fetchChatCompletion({
          prompt: userPrompt,
          assistant,
          requestOptions: {},
          onChunkReceived: (chunk) => {
            const msgId = assistantMessageIdRef.current

            switch (chunk.type) {
              // ========== TEXT CHUNKS ==========
              case ChunkType.TEXT_DELTA:
                if (chunk.text) {
                  // Accumulate full response
                  responseContentRef.current += chunk.text

                  // Separate text from artifact content
                  const { textContent, artifactContent, isArtifactStreaming } = separateTextAndArtifact(
                    responseContentRef.current
                  )

                  // Update streaming state
                  dispatch(setIsArtifactStreaming(isArtifactStreaming))

                  // Stream artifact content to code view in real-time
                  if (artifactContent) {
                    dispatch(updateStreamingArtifactContent(artifactContent))
                  }

                  // Update chat message with text content only
                  dispatch(
                    updateRefinementMessage({
                      id: msgId,
                      content: textContent,
                      isStreaming: true
                    })
                  )
                }
                break

              case ChunkType.TEXT_COMPLETE:
                // Text streaming complete
                break

              // ========== THINKING/REASONING CHUNKS ==========
              case ChunkType.THINKING_START:
                dispatch(
                  updateRefinementMessage({
                    id: msgId,
                    isThinking: true
                  })
                )
                break

              case ChunkType.THINKING_DELTA:
                if (chunk.text) {
                  thinkingContentRef.current += chunk.text
                  dispatch(
                    updateRefinementMessage({
                      id: msgId,
                      thinking: thinkingContentRef.current,
                      thinkingTime: chunk.thinking_millsec,
                      isThinking: true
                    })
                  )
                }
                break

              case ChunkType.THINKING_COMPLETE:
                dispatch(
                  updateRefinementMessage({
                    id: msgId,
                    thinking: chunk.text || thinkingContentRef.current,
                    thinkingTime: chunk.thinking_millsec,
                    isThinking: false
                  })
                )
                break

              // ========== WEB SEARCH CHUNKS ==========
              case ChunkType.WEB_SEARCH_IN_PROGRESS:
              case ChunkType.LLM_WEB_SEARCH_IN_PROGRESS:
              case ChunkType.SEARCH_IN_PROGRESS_UNION:
                dispatch(
                  updateRefinementMessage({
                    id: msgId,
                    isSearching: true
                  })
                )
                break

              case ChunkType.WEB_SEARCH_COMPLETE:
                dispatch(
                  updateRefinementMessage({
                    id: msgId,
                    webSearchResults: chunk.web_search,
                    isSearching: false
                  })
                )
                break

              case ChunkType.LLM_WEB_SEARCH_COMPLETE:
                dispatch(
                  updateRefinementMessage({
                    id: msgId,
                    webSearchResults: chunk.llm_web_search,
                    isSearching: false
                  })
                )
                break

              case ChunkType.SEARCH_COMPLETE_UNION:
                dispatch(
                  updateRefinementMessage({
                    id: msgId,
                    isSearching: false
                  })
                )
                break

              // ========== KNOWLEDGE BASE CHUNKS ==========
              case ChunkType.KNOWLEDGE_SEARCH_IN_PROGRESS:
                dispatch(
                  updateRefinementMessage({
                    id: msgId,
                    isKnowledgeSearching: true
                  })
                )
                break

              case ChunkType.KNOWLEDGE_SEARCH_COMPLETE:
                dispatch(
                  updateRefinementMessage({
                    id: msgId,
                    knowledgeResults: chunk.knowledge,
                    isKnowledgeSearching: false
                  })
                )
                break

              // ========== MCP TOOL CHUNKS ==========
              case ChunkType.MCP_TOOL_CREATED:
              case ChunkType.MCP_TOOL_PENDING:
              case ChunkType.MCP_TOOL_IN_PROGRESS:
                dispatch(
                  updateRefinementMessage({
                    id: msgId,
                    isMcpToolRunning: true
                  })
                )
                break

              case ChunkType.MCP_TOOL_COMPLETE:
                dispatch(
                  updateRefinementMessage({
                    id: msgId,
                    mcpTools: chunk.responses,
                    isMcpToolRunning: false
                  })
                )
                break

              // ========== SKILLS / CONTEXT / LIFECYCLE CHUNKS ==========
              case ChunkType.SKILL_ACTIVATION:
                skillActivationsRef.current = [
                  ...skillActivationsRef.current,
                  {
                    skillName: chunk.skillName,
                    action: chunk.action,
                    toolName: chunk.toolName,
                    result: chunk.result,
                    error: chunk.error
                  }
                ]
                dispatch(
                  updateRefinementMessage({
                    id: msgId,
                    skillActivations: skillActivationsRef.current
                  })
                )
                break

              case ChunkType.CONTEXT_ACTION:
                contextActionsRef.current = [
                  ...contextActionsRef.current,
                  {
                    action: chunk.action,
                    summary: chunk.summary,
                    removedCount: chunk.removedCount
                  }
                ]
                dispatch(
                  updateRefinementMessage({
                    id: msgId,
                    contextActions: contextActionsRef.current
                  })
                )
                break

              case ChunkType.ARTIFACT_LIFECYCLE:
                artifactLifecycleRef.current = [
                  ...artifactLifecycleRef.current,
                  {
                    stage: chunk.stage,
                    summary: chunk.summary,
                    timestamp: new Date().toISOString()
                  }
                ]
                dispatch(
                  updateRefinementMessage({
                    id: msgId,
                    artifactLifecycle: artifactLifecycleRef.current
                  })
                )
                break

              // ========== COMPLETION CHUNKS ==========
              case ChunkType.BLOCK_COMPLETE:
              case ChunkType.LLM_RESPONSE_COMPLETE:
                dispatch(setIsArtifactStreaming(false))
                dispatch(updateStreamingArtifactContent(null))
                break

              case ChunkType.LLM_RESPONSE_CREATED:
              case ChunkType.LLM_RESPONSE_IN_PROGRESS:
              case ChunkType.BLOCK_CREATED:
              case ChunkType.BLOCK_IN_PROGRESS:
                // Informational chunks, no action needed
                break

              // ========== ERROR CHUNK ==========
              case ChunkType.ERROR:
                dispatch(setIsArtifactStreaming(false))
                dispatch(updateStreamingArtifactContent(null))
                throw new Error(chunk.error?.message || 'Unknown error')

              default:
                // Handle any other chunk types gracefully
                break
            }
          }
        })

        // Final processing after streaming completes
        const { textContent, artifactContent } = separateTextAndArtifact(responseContentRef.current)
        artifactLifecycleRef.current = [
          ...artifactLifecycleRef.current,
          {
            stage: 'completed',
            summary: 'Artifact refinement completed',
            timestamp: new Date().toISOString()
          }
        ]

        // Mark message as complete
        dispatch(
          updateRefinementMessage({
            id: assistantMessageIdRef.current,
            content: textContent || (artifactContent ? '_Artifact has been updated._' : ''),
            isStreaming: false,
            isThinking: false,
            isSearching: false,
            isKnowledgeSearching: false,
            isMcpToolRunning: false,
            skillActivations: skillActivationsRef.current,
            contextActions: contextActionsRef.current,
            artifactLifecycle: artifactLifecycleRef.current
          })
        )

        // Clear streaming artifact content
        dispatch(updateStreamingArtifactContent(null))

        // Extract final artifact content and update
        const finalContent = extractArtifactContent(responseContentRef.current)

        if (finalContent && finalContent !== artifact.content) {
          // Save current version before updating
          await dispatch(
            saveVersion({
              artifact,
              newContent: finalContent,
              refinementPrompt: prompt
            })
          )

          // Update artifact content
          dispatch(updateContent(finalContent))

          // Notify completion
          onComplete?.(finalContent)
        }
      } catch (error) {
        logger.error('Refinement error', error as Error)
        dispatch(setIsArtifactStreaming(false))
        dispatch(updateStreamingArtifactContent(null))
        artifactLifecycleRef.current = [
          ...artifactLifecycleRef.current,
          {
            stage: 'failed',
            summary: (error as Error).message || 'Artifact refinement failed',
            timestamp: new Date().toISOString()
          }
        ]

        // Get current text content for error display
        const { textContent } = separateTextAndArtifact(responseContentRef.current)

        dispatch(
          updateRefinementMessage({
            id: assistantMessageIdRef.current,
            content: textContent + `\n\nError: ${(error as Error).message}`,
            isStreaming: false,
            isThinking: false,
            isSearching: false,
            isKnowledgeSearching: false,
            isMcpToolRunning: false,
            skillActivations: skillActivationsRef.current,
            contextActions: contextActionsRef.current,
            artifactLifecycle: artifactLifecycleRef.current
          })
        )
        onError?.(error as Error)
      } finally {
        dispatch(setIsRefining(false))
        dispatch(setIsArtifactStreaming(false))
      }
    },
    [artifact, isRefining, contextMessages, parentModelId, dispatch, onStart, onComplete, onError]
  )

  // Clear messages
  const clearMessages = useCallback(() => {
    dispatch({ type: 'artifacts/clearRefinementMessages' })
  }, [dispatch])

  return {
    messages,
    isRefining,
    contextMessages,
    sendRefinement,
    clearMessages
  }
}

export default useArtifactRefinement
