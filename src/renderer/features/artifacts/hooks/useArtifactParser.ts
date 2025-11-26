/**
 * useArtifactParser Hook
 *
 * Memoized parsing of message content for artifacts.
 * Efficiently handles streaming content and re-parses only when needed.
 */

import { useMemo, useRef } from 'react'

import type { ParseResult } from '../types'
import { hasIncompleteArtifact, parseArtifacts } from '../utils/artifactParser'

interface UseArtifactParserOptions {
  /** Whether the content is still streaming */
  isStreaming?: boolean
  /** Debounce delay for re-parsing during streaming (ms) */
  debounceMs?: number
}

interface UseArtifactParserResult {
  /** Parse result with artifacts and segments */
  parseResult: ParseResult
  /** Whether any artifacts were found */
  hasArtifacts: boolean
  /** Whether there's an incomplete artifact being streamed */
  isIncomplete: boolean
  /** Number of artifacts found */
  artifactCount: number
}

/**
 * Hook for parsing artifacts from message content
 *
 * @param content - The message content to parse
 * @param options - Parser options
 * @returns Parsed artifact result
 */
export function useArtifactParser(
  content: string,
  options: UseArtifactParserOptions = {}
): UseArtifactParserResult {
  const { isStreaming = false } = options

  // Cache the last stable parse result to avoid flickering during streaming
  const lastStableResultRef = useRef<ParseResult | null>(null)

  // Check if content has incomplete artifact
  const isIncomplete = useMemo(() => hasIncompleteArtifact(content), [content])

  // Parse artifacts
  const parseResult = useMemo(() => {
    // If streaming and incomplete, return last stable result or empty
    if (isStreaming && isIncomplete && lastStableResultRef.current) {
      return lastStableResultRef.current
    }

    const result = parseArtifacts(content)

    // Only update stable result if not incomplete
    if (!isIncomplete) {
      lastStableResultRef.current = result
    }

    return result
  }, [content, isStreaming, isIncomplete])

  return {
    parseResult,
    hasArtifacts: parseResult.hasArtifacts,
    isIncomplete,
    artifactCount: parseResult.artifacts.length
  }
}

export default useArtifactParser

