/**
 * useArtifactRenderer Hook
 *
 * Manages artifact iframe lifecycle and communication.
 * Handles ready/error events and provides methods for interaction.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import type { Artifact, ArtifactBridgeMessage, ArtifactError, RenderOptions } from '../types'
import { buildDocument } from '../utils/documentBuilder'

interface UseArtifactRendererOptions {
  /** The artifact to render */
  artifact: Artifact
  /** Render options */
  options?: Partial<RenderOptions>
  /** Callback when artifact is ready */
  onReady?: () => void
  /** Callback when an error occurs */
  onError?: (error: ArtifactError) => void
  /** Callback when artifact resizes */
  onResize?: (dimensions: { width: number; height: number }) => void
}

interface UseArtifactRendererResult {
  /** Ref to attach to the iframe */
  iframeRef: React.RefObject<HTMLIFrameElement | null>
  /** Generated srcDoc for the iframe */
  srcDoc: string
  /** Whether the artifact is ready */
  isReady: boolean
  /** Current error if any */
  error: ArtifactError | null
  /** Artifact dimensions */
  dimensions: { width: number; height: number }
  /** Refresh the artifact */
  refresh: () => void
  /** Send a command to the artifact */
  sendCommand: (command: string, data?: Record<string, unknown>) => void
}

/**
 * Hook for managing artifact rendering in an iframe
 *
 * @param options - Renderer options
 * @returns Renderer state and methods
 */
export function useArtifactRenderer(options: UseArtifactRendererOptions): UseArtifactRendererResult {
  const { artifact, options: renderOptions = {}, onReady, onError, onResize } = options

  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<ArtifactError | null>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [refreshKey, setRefreshKey] = useState(0)

  // Build render options with defaults
  const fullRenderOptions: RenderOptions = {
    theme: artifact.metadata.theme === 'auto' ? 'light' : artifact.metadata.theme,
    interactive: true,
    ...renderOptions
  }

  // Generate srcDoc
  const srcDoc = buildDocument(artifact, fullRenderOptions)

  // Handle messages from iframe
  const handleMessage = useCallback(
    (event: MessageEvent<ArtifactBridgeMessage>) => {
      if (event.source !== iframeRef.current?.contentWindow) return
      if (!event.data || typeof event.data !== 'object') return
      if (event.data.artifactId !== artifact.id) return

      const { type, payload, error: messageError } = event.data

      switch (type) {
        case 'ready':
          setIsReady(true)
          setError(null)
          onReady?.()
          break

        case 'error':
          const err: ArtifactError = {
            message: messageError?.message || 'Unknown error',
            line: messageError?.line,
            column: messageError?.column,
            stack: messageError?.stack
          }
          setError(err)
          onError?.(err)
          break

        case 'resize':
          if (payload && typeof payload.width === 'number' && typeof payload.height === 'number') {
            const newDimensions = {
              width: payload.width as number,
              height: payload.height as number
            }
            setDimensions(newDimensions)
            onResize?.(newDimensions)
          }
          break
      }
    },
    [artifact.id, onReady, onError, onResize]
  )

  // Set up message listener
  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [handleMessage])

  // Reset state when artifact changes
  useEffect(() => {
    setIsReady(false)
    setError(null)
  }, [artifact.id, artifact.content, refreshKey])

  // Refresh the artifact
  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  // Send command to iframe
  const sendCommand = useCallback((command: string, data?: Record<string, unknown>) => {
    if (!iframeRef.current?.contentWindow) return

    iframeRef.current.contentWindow.postMessage(
      {
        type: 'command',
        command,
        data
      },
      '*'
    )
  }, [])

  return {
    iframeRef,
    srcDoc,
    isReady,
    error,
    dimensions,
    refresh,
    sendCommand
  }
}

export default useArtifactRenderer
