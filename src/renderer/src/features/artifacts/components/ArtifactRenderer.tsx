/**
 * Artifact Renderer Component
 *
 * Renders artifacts in a sandboxed iframe with:
 * - Shadow DOM isolation for styles
 * - PostMessage communication bridge
 * - Theme synchronization
 * - Error handling and display
 *
 * For React artifacts, uses Sandpack for:
 * - NPM dependency support
 * - Hot Module Reloading
 * - Professional error overlay
 */

import { useTheme } from '@renderer/context/ThemeProvider'
import { useAppSelector } from '@renderer/store'
import { selectArtifactReactSettings } from '@renderer/store/settings'
import type { FC } from 'react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'

import type { Artifact, ArtifactBridgeMessage, ArtifactError, RenderOptions } from '../types'
import { buildDocument } from '../utils/documentBuilder'
import SandpackReactRenderer from './SandpackReactRenderer'

interface ArtifactRendererProps {
  /** The artifact to render */
  artifact: Artifact
  /** HTMX server port for interactive artifacts */
  htmxServerPort?: number | null
  /** Whether the artifact is interactive */
  interactive?: boolean
  /** Custom width */
  width?: number | string
  /** Custom height */
  height?: number | string
  /** Callback when artifact is ready */
  onReady?: () => void
  /** Callback when an error occurs */
  onError?: (error: ArtifactError) => void
  /** Callback when artifact resizes */
  onResize?: (dimensions: { width: number; height: number }) => void
  /** Callback for console messages */
  onConsole?: (level: string, args: string[]) => void
  /** Callback for HTMX events */
  onHtmxEvent?: (event: string, payload: Record<string, unknown>) => void
  /** Custom class name */
  className?: string
  /** Whether to use Sandpack for React artifacts (default: true) */
  useSandpack?: boolean
  /** Whether to show code editor in Sandpack mode */
  showEditor?: boolean
  /** Whether to show console in Sandpack mode */
  showConsole?: boolean
}

/**
 * Artifact Renderer Component
 *
 * Renders an artifact in a sandboxed iframe with full isolation
 */
const ArtifactRenderer: FC<ArtifactRendererProps> = ({
  artifact,
  htmxServerPort,
  interactive = true,
  width = '100%',
  height = '100%',
  onReady,
  onError,
  onResize,
  onConsole,
  onHtmxEvent,
  className,
  useSandpack: useSandpackProp,
  showEditor: showEditorProp,
  showConsole: showConsoleProp
}) => {
  const { theme } = useTheme()
  const reactSettings = useAppSelector(selectArtifactReactSettings)

  // Use props if provided, otherwise fall back to settings
  const useSandpack = useSandpackProp ?? reactSettings?.useSandpack ?? true
  const showEditor = showEditorProp ?? reactSettings?.showEditor ?? false
  const showConsole = showConsoleProp ?? reactSettings?.showConsole ?? false
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<ArtifactError | null>(null)
  const [, setDimensions] = useState({ width: 0, height: 0 })

  // Build render options
  const renderOptions: RenderOptions = {
    theme: artifact.metadata.theme === 'auto' ? (theme as 'light' | 'dark') : artifact.metadata.theme,
    interactive,
    htmxServerPort: htmxServerPort ?? undefined,
    width: typeof width === 'number' ? width : undefined,
    height: typeof height === 'number' ? height : undefined
  }

  // Generate srcDoc
  const srcDoc = buildDocument(artifact, renderOptions)

  // Handle messages from iframe
  const handleMessage = useCallback(
    (event: MessageEvent<ArtifactBridgeMessage>) => {
      // Validate message source
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

        case 'console':
          if (payload && typeof payload.level === 'string' && Array.isArray(payload.args)) {
            onConsole?.(payload.level as string, payload.args as string[])
          }
          break

        case 'htmx:request':
        case 'htmx:response':
        case 'htmx:error':
          onHtmxEvent?.(type, payload || {})
          break

        default:
          // Handle unknown message types
          break
      }
    },
    [artifact.id, onReady, onError, onResize, onConsole, onHtmxEvent]
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
  }, [artifact.id, artifact.content])

  // Refresh the iframe
  const refresh = useCallback(() => {
    setIsReady(false)
    setError(null)
    if (iframeRef.current) {
      // Force refresh by resetting srcDoc
      const currentSrcDoc = iframeRef.current.srcdoc
      iframeRef.current.srcdoc = ''
      requestAnimationFrame(() => {
        if (iframeRef.current) {
          iframeRef.current.srcdoc = currentSrcDoc
        }
      })
    }
  }, [])

  // Use Sandpack for React artifacts when enabled
  const shouldUseSandpack = useSandpack && artifact.type === 'react'

  // Render Sandpack for React artifacts
  if (shouldUseSandpack) {
    return (
      <SandpackReactRenderer
        artifact={artifact}
        showEditor={showEditor}
        showConsole={showConsole}
        width={width}
        height={height}
        className={className}
      />
    )
  }

  // Render iframe for all other artifact types (HTML, HTMX, SVG, Mermaid, Markdown, Code)
  return (
    <Container className={className} style={{ width, height }}>
      {!isReady && !error && (
        <LoadingOverlay>
          <LoadingSpinner />
          <LoadingText>Loading artifact...</LoadingText>
        </LoadingOverlay>
      )}

      {error && (
        <ErrorOverlay>
          <ErrorTitle>Error rendering artifact</ErrorTitle>
          <ErrorMessage>{error.message}</ErrorMessage>
          {error.line && (
            <ErrorDetails>
              Line {error.line}
              {error.column ? `, Column ${error.column}` : ''}
            </ErrorDetails>
          )}
          {error.stack && <ErrorStack>{error.stack}</ErrorStack>}
          <RetryButton onClick={refresh}>Retry</RetryButton>
        </ErrorOverlay>
      )}

      <StyledIframe
        ref={iframeRef}
        srcDoc={srcDoc}
        sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
        title={artifact.title}
        $isReady={isReady}
        $hasError={!!error}
      />
    </Container>
  )
}

// Styled components
const Container = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
`

const StyledIframe = styled.iframe<{ $isReady: boolean; $hasError: boolean }>`
  width: 100%;
  height: 100%;
  border: none;
  display: block;
  opacity: ${(props) => (props.$isReady && !props.$hasError ? 1 : 0)};
  transition: opacity 0.2s ease-in-out;
`

const LoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--color-background);
  z-index: 1;
`

const LoadingSpinner = styled.div`
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`

const LoadingText = styled.div`
  margin-top: 12px;
  font-size: 14px;
  color: var(--color-text-soft);
`

const ErrorOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--color-background);
  padding: 24px;
  z-index: 2;
  overflow: auto;
`

const ErrorTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: var(--color-error, #ef4444);
  margin-bottom: 8px;
`

const ErrorMessage = styled.div`
  font-size: 14px;
  color: var(--color-text);
  text-align: center;
  max-width: 400px;
  word-break: break-word;
`

const ErrorDetails = styled.div`
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-text-soft);
`

const ErrorStack = styled.pre`
  margin-top: 12px;
  padding: 12px;
  font-size: 11px;
  font-family: monospace;
  background: var(--color-background-soft);
  border-radius: 6px;
  color: var(--color-text-soft);
  max-width: 100%;
  max-height: 150px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
`

const RetryButton = styled.button`
  margin-top: 16px;
  padding: 8px 16px;
  font-size: 14px;
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: var(--color-primary-soft);
  }
`

export default memo(ArtifactRenderer)
