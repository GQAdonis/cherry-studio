/**
 * useArtifactRefinement Hook
 *
 * Handles AI refinement chat logic for artifacts.
 * Connects to AI provider, parses responses for updated artifact content,
 * and updates the store with new versions.
 *
 * Key features:
 * - Handles ALL chunk types (text, thinking, web search, knowledge, MCP tools)
 * - Uses StudioStreamParser to separate code from chat text during streaming
 * - Streams code blocks to code view in real-time via <cs-studio-code> protocol
 * - Displays AI explanations, thinking, citations in chat panel
 * - Falls back to legacy <cs-artifact> parsing for backward compatibility
 */

import { loggerService } from '@logger'
import { useAppDispatch, useAppSelector } from '@renderer/store'
import {
  addRefinementMessage,
  saveVersion,
  selectActiveProjectResolvedContext,
  selectActiveStudioSessionId,
  selectContextMessages,
  selectIsRefining,
  selectParentModelId,
  selectRefinementMessages,
  setActiveStudioSessionId,
  setIsArtifactStreaming,
  setIsCodeStreaming,
  setIsRefining,
  setRefinementContext,
  updateContent,
  updateRefinementMessage,
  updateStreamingArtifactContent
} from '@renderer/store/artifacts'
import type { Chunk } from '@renderer/types/chunk'
import { ChunkType } from '@renderer/types/chunk'
import { useCallback, useEffect, useRef } from 'react'

import { buildArtifactRefinementRequestMessage } from '../agent/artifactStudioPrompt'
import { runPMPOWorkflow } from '../agent/pmpoEngine'
import {
  ARTIFACT_STUDIO_AGENT_ID,
  ensureArtifactStudioSession,
  streamArtifactStudioSessionMessage
} from '../services/ArtifactStudioRuntimeService'
import type {
  Artifact,
  ArtifactDiagnosticSnapshot,
  ArtifactLifecycleEvent,
  ArtifactRefinementIntent,
  ArtifactSelection,
  ContextMessage,
  PMPOPhaseEvent,
  RefinementContextAction,
  RefinementMessage,
  RefinementSkillActivation
} from '../types'
import { extractArtifactContent, separateTextAndArtifact } from '../utils/artifactParser'
import { extractStudioCode, hasStudioCodeTag, StudioStreamParser } from '../utils/studioStreamParser'
import { validateXhtmlContent } from '../utils/xhtmlValidation'

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
  sendRefinement: (
    prompt: string,
    options?: {
      intent?: ArtifactRefinementIntent
      selection?: ArtifactSelection | null
      diagnostics?: ArtifactDiagnosticSnapshot[]
    }
  ) => Promise<void>
  /** Clear refinement messages */
  clearMessages: () => void
}

const logger = loggerService.withContext('useArtifactRefinement')

/**
 * Build user prompt for artifact refinement
 * Includes current artifact content and optional conversation context
 */
function inferRefinementIntent(
  request: string,
  diagnostics: ArtifactDiagnosticSnapshot[] = []
): ArtifactRefinementIntent {
  if (diagnostics.length > 0 || /compilation error|runtime error|please fix/i.test(request)) {
    return 'fix'
  }
  if (/brainstorm|ideate|concept|wireframe|explore/i.test(request)) {
    return 'ideate'
  }
  return 'extend'
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
  const resolvedProjectContext = useAppSelector(selectActiveProjectResolvedContext)
  const defaultModel = useAppSelector((state) => state.llm.defaultModel)
  const apiServer = useAppSelector((state) => state.settings.apiServer)
  const activeStudioSessionId = useAppSelector(selectActiveStudioSessionId)
  const contextStrategyType = useAppSelector((state) => state.settings?.contextStrategy?.type || 'sliding_window')

  // Track accumulated content
  const responseContentRef = useRef<string>('')
  const thinkingContentRef = useRef<string>('')
  const assistantMessageIdRef = useRef<string>('')
  const skillActivationsRef = useRef<RefinementSkillActivation[]>([])
  const contextActionsRef = useRef<RefinementContextAction[]>([])
  const artifactLifecycleRef = useRef<ArtifactLifecycleEvent[]>([])
  const pmpoPhaseEventsRef = useRef<PMPOPhaseEvent[]>([])
  const runtimeSessionIdRef = useRef<string | null>(activeStudioSessionId)

  // Studio stream parser instance (persists across re-renders)
  const studioParserRef = useRef<StudioStreamParser | null>(null)

  useEffect(() => {
    runtimeSessionIdRef.current = activeStudioSessionId
  }, [activeStudioSessionId])

  // Send refinement request
  const sendRefinement = useCallback(
    async (
      prompt: string,
      options?: {
        intent?: ArtifactRefinementIntent
        selection?: ArtifactSelection | null
        diagnostics?: ArtifactDiagnosticSnapshot[]
      }
    ) => {
      if (!prompt.trim() || isRefining) return

      const diagnostics = options?.diagnostics || []
      const intent = options?.intent || inferRefinementIntent(prompt, diagnostics)
      const selection = options?.selection || null

      // Notify start
      onStart?.()

      dispatch(
        setRefinementContext({
          intent,
          selection,
          diagnostics
        })
      )

      // Add user message
      dispatch(
        addRefinementMessage({
          role: 'user',
          content: prompt,
          intent,
          selection: selection || undefined,
          diagnostics
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
      artifactLifecycleRef.current = []
      pmpoPhaseEventsRef.current = []

      // Initialize StudioStreamParser with callbacks that route to Redux
      const messageId = assistantMessageIdRef.current
      studioParserRef.current = new StudioStreamParser({
        callbacks: {
          onCodeStart: ({ metadata }) => {
            dispatch(setIsCodeStreaming(true))
            dispatch(setIsArtifactStreaming(true))
            logger.info('Studio code streaming started', { metadata })
          },
          onCodeStream: ({ content }) => {
            // Stream code content to the code editor in real-time
            dispatch(updateStreamingArtifactContent(content))
          },
          onCodeComplete: ({ content, metadata }) => {
            dispatch(setIsCodeStreaming(false))
            dispatch(setIsArtifactStreaming(false))
            // Final streaming content will be processed in the completion handler
            dispatch(updateStreamingArtifactContent(content))
            logger.info('Studio code streaming complete', {
              contentLength: content.length,
              metadata
            })
          },
          onChatText: (text) => {
            // Route chat text to the refinement message
            dispatch(
              updateRefinementMessage({
                id: messageId,
                content: text,
                isStreaming: true
              })
            )
          }
        }
      })

      // Add placeholder assistant message
      dispatch(
        addRefinementMessage({
          id: assistantMessageIdRef.current,
          role: 'assistant',
          content: '',
          isStreaming: true,
          intent,
          selection: selection || undefined,
          diagnostics,
          artifactLifecycle: artifactLifecycleRef.current,
          pmpoPhases: pmpoPhaseEventsRef.current
        })
      )

      try {
        const skillStrategy = resolvedProjectContext?.skills?.strategy || 'inherit'
        const resolvedContextStrategy = resolvedProjectContext?.contextManagement?.type || contextStrategyType
        const fallbackModelId =
          parentModelId ||
          (defaultModel?.provider && defaultModel?.id ? `${defaultModel.provider}:${defaultModel.id}` : undefined)

        const runtimeSession = await ensureArtifactStudioSession({
          apiServer,
          preferredSessionId: runtimeSessionIdRef.current,
          sessionName: `Artifact Studio - ${artifact.title}`,
          preferredModelId: parentModelId || undefined,
          fallbackModelId,
          skillScope: resolvedProjectContext?.skills,
          contextStrategy: resolvedProjectContext?.contextManagement
        })

        runtimeSessionIdRef.current = runtimeSession.sessionId
        if (activeStudioSessionId !== runtimeSession.sessionId) {
          dispatch(setActiveStudioSessionId(runtimeSession.sessionId))
        }

        // Build the user prompt with artifact content and structured diagnostics
        const userPrompt = buildArtifactRefinementRequestMessage({
          artifact,
          request: prompt,
          intent,
          selection,
          diagnostics,
          contextMessages
        })

        const handleChunk = (chunk: Chunk) => {
          const msgId = assistantMessageIdRef.current

          switch (chunk.type) {
            case ChunkType.TEXT_DELTA:
              if (chunk.text) {
                responseContentRef.current += chunk.text

                // Use StudioStreamParser for <cs-studio-code> protocol
                if (studioParserRef.current) {
                  // The parser handles routing: code → code editor, text → chat panel
                  studioParserRef.current.parse(msgId, responseContentRef.current)
                } else {
                  // Fallback to legacy <cs-artifact> parsing
                  const { textContent, artifactContent, isArtifactStreaming } = separateTextAndArtifact(
                    responseContentRef.current
                  )
                  dispatch(setIsArtifactStreaming(isArtifactStreaming))
                  if (artifactContent) {
                    dispatch(updateStreamingArtifactContent(artifactContent))
                  }
                  dispatch(
                    updateRefinementMessage({
                      id: msgId,
                      content: textContent,
                      isStreaming: true
                    })
                  )
                }
              }
              break
            case ChunkType.THINKING_START:
              dispatch(updateRefinementMessage({ id: msgId, isThinking: true }))
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
            case ChunkType.WEB_SEARCH_IN_PROGRESS:
            case ChunkType.LLM_WEB_SEARCH_IN_PROGRESS:
            case ChunkType.SEARCH_IN_PROGRESS_UNION:
              dispatch(updateRefinementMessage({ id: msgId, isSearching: true }))
              break
            case ChunkType.WEB_SEARCH_COMPLETE:
              dispatch(updateRefinementMessage({ id: msgId, webSearchResults: chunk.web_search, isSearching: false }))
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
              dispatch(updateRefinementMessage({ id: msgId, isSearching: false }))
              break
            case ChunkType.KNOWLEDGE_SEARCH_IN_PROGRESS:
              dispatch(updateRefinementMessage({ id: msgId, isKnowledgeSearching: true }))
              break
            case ChunkType.KNOWLEDGE_SEARCH_COMPLETE:
              dispatch(
                updateRefinementMessage({ id: msgId, knowledgeResults: chunk.knowledge, isKnowledgeSearching: false })
              )
              break
            case ChunkType.MCP_TOOL_CREATED:
            case ChunkType.MCP_TOOL_PENDING:
            case ChunkType.MCP_TOOL_IN_PROGRESS:
              dispatch(updateRefinementMessage({ id: msgId, isMcpToolRunning: true }))
              break
            case ChunkType.MCP_TOOL_COMPLETE:
              dispatch(updateRefinementMessage({ id: msgId, mcpTools: chunk.responses, isMcpToolRunning: false }))
              break
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
              dispatch(updateRefinementMessage({ id: msgId, skillActivations: skillActivationsRef.current }))
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
              dispatch(updateRefinementMessage({ id: msgId, contextActions: contextActionsRef.current }))
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
              dispatch(updateRefinementMessage({ id: msgId, artifactLifecycle: artifactLifecycleRef.current }))
              break
            case ChunkType.BLOCK_COMPLETE:
            case ChunkType.LLM_RESPONSE_COMPLETE:
              dispatch(setIsArtifactStreaming(false))
              dispatch(setIsCodeStreaming(false))
              dispatch(updateStreamingArtifactContent(null))
              break
            case ChunkType.ERROR:
              dispatch(setIsArtifactStreaming(false))
              dispatch(setIsCodeStreaming(false))
              dispatch(updateStreamingArtifactContent(null))
              throw new Error(chunk.error?.message || 'Unknown error')
            default:
              break
          }
        }

        const emitLifecycle = (stage: 'started' | 'completed' | 'failed', summary: string) => {
          handleChunk({
            type: ChunkType.ARTIFACT_LIFECYCLE,
            stage,
            summary
          })
        }

        emitLifecycle(
          'started',
          `Artifact refinement started (agent: ${ARTIFACT_STUDIO_AGENT_ID}, session: ${runtimeSession.sessionId}, model: ${runtimeSession.modelId || 'agent-default'}, context: ${resolvedContextStrategy}, skills: ${resolvedProjectContext?.skills?.mode || 'inherit'})`
        )

        await runPMPOWorkflow({
          request: prompt,
          maxCorrectiveLoops: 1,
          onPhaseEvent: (event) => {
            pmpoPhaseEventsRef.current = [...pmpoPhaseEventsRef.current, event]
            dispatch(
              updateRefinementMessage({
                id: assistantMessageIdRef.current,
                pmpoPhases: pmpoPhaseEventsRef.current
              })
            )
          },
          execute: async () => {
            responseContentRef.current = ''
            thinkingContentRef.current = ''
            await streamArtifactStudioSessionMessage({
              apiServer,
              agentId: runtimeSession.agentId,
              sessionId: runtimeSession.sessionId,
              content: userPrompt,
              onChunk: (chunk) => handleChunk(chunk),
              onSessionUpdate: (sessionId) => {
                if (!sessionId || sessionId === runtimeSessionIdRef.current) {
                  return
                }
                runtimeSessionIdRef.current = sessionId
                dispatch(setActiveStudioSessionId(sessionId))
              }
            })
            return {
              summary: 'Artifact execution stream completed'
            }
          },
          reflect: () => {
            const studioResult = extractStudioCode(responseContentRef.current)
            const finalContent = studioResult?.code || extractArtifactContent(responseContentRef.current)
            if (!finalContent) {
              return {
                pass: false,
                summary: 'No artifact output generated in execute phase.'
              }
            }

            if (artifact.type === 'xhtml') {
              const validation = validateXhtmlContent(finalContent)
              if (!validation.isValid) {
                return {
                  pass: false,
                  summary: `XHTML validation failed: ${validation.issues[0] || 'Invalid XHTML'}`
                }
              }
            }

            return {
              pass: true,
              summary: studioResult
                ? 'Reflection checks passed (studio protocol)'
                : 'Reflection checks passed (legacy fallback protocol)'
            }
          }
        })

        // Final processing after streaming completes
        // Try new <cs-studio-code> extraction first, fall back to legacy <cs-artifact>
        let finalContent: string | null = null
        let textContent: string = ''

        if (hasStudioCodeTag(responseContentRef.current)) {
          const studioResult = extractStudioCode(responseContentRef.current)
          if (studioResult) {
            finalContent = studioResult.code
            textContent = studioResult.chatText
          }
        }

        // Fallback to legacy <cs-artifact> parsing
        if (!finalContent) {
          const legacyResult = separateTextAndArtifact(responseContentRef.current)
          textContent = legacyResult.textContent
          finalContent = extractArtifactContent(responseContentRef.current)
        }

        emitLifecycle('completed', 'Artifact refinement completed')

        // Mark message as complete
        dispatch(
          updateRefinementMessage({
            id: assistantMessageIdRef.current,
            content: textContent || (finalContent ? '_Artifact has been updated._' : ''),
            isStreaming: false,
            isThinking: false,
            isSearching: false,
            isKnowledgeSearching: false,
            isMcpToolRunning: false,
            skillActivations: skillActivationsRef.current,
            contextActions: contextActionsRef.current,
            artifactLifecycle: artifactLifecycleRef.current,
            pmpoPhases: pmpoPhaseEventsRef.current,
            contextStrategy: resolvedContextStrategy,
            skillStrategy,
            intent,
            selection: selection || undefined,
            diagnostics
          })
        )

        // Clear streaming state
        dispatch(updateStreamingArtifactContent(null))
        dispatch(setIsCodeStreaming(false))

        if (finalContent && finalContent !== artifact.content) {
          const validation = artifact.type === 'xhtml' ? validateXhtmlContent(finalContent) : undefined

          // Save current version before updating
          await dispatch(
            saveVersion({
              artifact,
              newContent: finalContent,
              refinementPrompt: prompt,
              intent,
              diagnostics,
              summary: textContent.trim() || `${intent} refinement`
            })
          )

          // Update artifact content
          dispatch(updateContent(finalContent))

          if (validation) {
            dispatch(
              updateRefinementMessage({
                id: assistantMessageIdRef.current,
                content: validation.isValid
                  ? textContent || '_Artifact has been updated._'
                  : `${textContent}\n\nXHTML validation issues:\n- ${validation.issues.join('\n- ')}`
              })
            )
          }

          // Notify completion
          onComplete?.(finalContent)
        }

        // Clean up parser
        studioParserRef.current?.reset()
      } catch (error) {
        logger.error('Refinement error', error as Error)
        dispatch(setIsArtifactStreaming(false))
        dispatch(setIsCodeStreaming(false))
        dispatch(updateStreamingArtifactContent(null))
        studioParserRef.current?.reset()
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
            artifactLifecycle: artifactLifecycleRef.current,
            pmpoPhases: pmpoPhaseEventsRef.current,
            contextStrategy: resolvedProjectContext?.contextManagement?.type || contextStrategyType,
            skillStrategy: 'inherit',
            intent,
            selection: selection || undefined,
            diagnostics
          })
        )
        onError?.(error as Error)
      } finally {
        dispatch(setIsRefining(false))
        dispatch(setIsArtifactStreaming(false))
        dispatch(setIsCodeStreaming(false))
      }
    },
    [
      artifact,
      isRefining,
      contextMessages,
      parentModelId,
      resolvedProjectContext,
      defaultModel,
      apiServer,
      activeStudioSessionId,
      contextStrategyType,
      dispatch,
      onStart,
      onComplete,
      onError
    ]
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
