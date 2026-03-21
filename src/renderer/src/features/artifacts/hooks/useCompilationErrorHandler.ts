/**
 * Compilation Error Handler Hook
 *
 * Manages the auto-fix workflow when the preview iframe reports a compilation error.
 * This hook:
 * 1. Receives compilation errors from `ArtifactRenderer`
 * 2. Formats error context for the agent
 * 3. Auto-sends the error back to the agent for correction
 * 4. Tracks auto-fix attempts (max 3 per turn to prevent loops)
 */

import { useAppDispatch, useAppSelector } from '@renderer/store'
import {
  incrementAutoFixAttempts,
  selectAutoFixAttempts,
  selectIsCodeStreaming,
  setCompilationError,
  setCompilationStatus
} from '@renderer/store/artifacts'
import { useCallback, useRef } from 'react'

import { buildCompilationErrorMessage } from '../agent/artifactStudioPrompt'

/** Maximum auto-fix attempts per refinement turn */
const MAX_AUTO_FIX_ATTEMPTS = 3

interface UseCompilationErrorHandlerOptions {
  /** Callback to send a follow-up message to the agent */
  onSendAutoFix?: (
    message: string,
    options?: {
      intent: 'fix'
      diagnostics: Array<{
        source: 'compiler'
        severity: 'error'
        message: string
        line?: number
        column?: number
        codeContext?: string
        timestamp: string
      }>
    }
  ) => void
  /** Whether auto-fix is enabled (default: true) */
  autoFixEnabled?: boolean
}

interface CompilationErrorHandlerResult {
  /** Handle a compilation error from the preview iframe */
  handleCompilationError: (error: { message: string; line?: number; column?: number; codeContext?: string }) => void
  /** Handle successful compilation */
  handleCompilationSuccess: () => void
  /** Whether we're currently auto-fixing */
  isAutoFixing: boolean
  /** Current auto-fix attempt number */
  autoFixAttemptCount: number
  /** Whether max auto-fix attempts have been reached */
  maxAttemptsReached: boolean
}

/**
 * Hook for handling compilation errors with auto-fix capability.
 *
 * Usage in ArtifactWorkspace:
 * ```tsx
 * const { handleCompilationError, handleCompilationSuccess } = useCompilationErrorHandler({
 *   onSendAutoFix: (msg) => sendRefinementMessage(msg)
 * })
 *
 * <ArtifactRenderer
 *   onError={handleCompilationError}
 *   onReady={handleCompilationSuccess}
 * />
 * ```
 */
export function useCompilationErrorHandler(
  options: UseCompilationErrorHandlerOptions = {}
): CompilationErrorHandlerResult {
  const { onSendAutoFix, autoFixEnabled = true } = options

  const dispatch = useAppDispatch()
  const autoFixAttempts = useAppSelector(selectAutoFixAttempts)
  const isCodeStreaming = useAppSelector(selectIsCodeStreaming)
  const isAutoFixingRef = useRef(false)

  const maxAttemptsReached = autoFixAttempts >= MAX_AUTO_FIX_ATTEMPTS

  const handleCompilationError = useCallback(
    (error: { message: string; line?: number; column?: number; codeContext?: string }) => {
      // Don't handle errors while code is still streaming — wait for completion
      if (isCodeStreaming) return

      // Update Redux state
      dispatch(setCompilationStatus('error'))
      dispatch(setCompilationError(error.message))

      // Auto-fix if enabled and within attempt limit
      if (autoFixEnabled && !maxAttemptsReached && onSendAutoFix && !isAutoFixingRef.current) {
        isAutoFixingRef.current = true
        dispatch(incrementAutoFixAttempts())

        const errorMessage = buildCompilationErrorMessage(error.message, error.line, error.codeContext)

        // Small delay to let the error state render before sending the fix message
        setTimeout(() => {
          onSendAutoFix(errorMessage, {
            intent: 'fix',
            diagnostics: [
              {
                source: 'compiler',
                severity: 'error',
                message: error.message,
                line: error.line,
                column: error.column,
                codeContext: error.codeContext,
                timestamp: new Date().toISOString()
              }
            ]
          })
          isAutoFixingRef.current = false
        }, 500)
      }
    },
    [dispatch, autoFixEnabled, maxAttemptsReached, onSendAutoFix, isCodeStreaming]
  )

  const handleCompilationSuccess = useCallback(() => {
    dispatch(setCompilationStatus('success'))
    dispatch(setCompilationError(null))
    isAutoFixingRef.current = false
  }, [dispatch])

  return {
    handleCompilationError,
    handleCompilationSuccess,
    isAutoFixing: isAutoFixingRef.current,
    autoFixAttemptCount: autoFixAttempts,
    maxAttemptsReached
  }
}

export default useCompilationErrorHandler
