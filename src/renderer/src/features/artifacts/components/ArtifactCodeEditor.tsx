/**
 * Artifact Code Editor Component
 *
 * Wrapper around CodeMirror/CodeEditor for editing artifact content with:
 * - Syntax highlighting based on artifact type
 * - Read-only or editable modes
 * - Sync changes back to store
 */

import CodeEditor from '@renderer/components/CodeEditor'
import { useAppSelector } from '@renderer/store'
import { selectIsCodeStreaming, selectStreamingArtifactContent } from '@renderer/store/artifacts'
import { memo, useCallback, useImperativeHandle, useMemo, useRef } from 'react'
import styled, { css, keyframes } from 'styled-components'

import type { Artifact, ArtifactType } from '../types'

interface ArtifactCodeEditorProps {
  /** The artifact to edit */
  artifact: Artifact
  /** Callback when content changes */
  onChange?: (content: string) => void
  /** Whether the editor is read-only */
  readOnly?: boolean
  /** Custom class name */
  className?: string
}

interface ArtifactCodeEditorRef {
  /** Get the current editor value */
  getValue: () => string
}

/**
 * Map artifact type to CodeMirror language
 */
function getLanguageFromArtifactType(type: ArtifactType, language?: string): string {
  // If explicit language is provided, use it
  if (language) {
    return language.toLowerCase()
  }

  // Map artifact type to language
  switch (type) {
    case 'html':
    case 'xhtml':
    case 'htmx':
      return 'html'
    case 'react':
      return 'tsx'
    case 'svg':
      return 'xml'
    case 'mermaid':
      return 'mermaid'
    case 'markdown':
      return 'markdown'
    case 'code':
      return 'typescript' // Default to TypeScript for generic code
    default:
      return 'text'
  }
}

/**
 * Artifact Code Editor Component
 */
const ArtifactCodeEditor = ({
  ref,
  artifact,
  onChange,
  readOnly = false,
  className
}: ArtifactCodeEditorProps & { ref?: React.RefObject<ArtifactCodeEditorRef | null> }) => {
  const editorRef = useRef<{ save?: () => void } | null>(null)
  const contentRef = useRef(artifact.content)

  // Subscribe to streaming state from Redux
  const isCodeStreaming = useAppSelector(selectIsCodeStreaming)
  const streamingContent = useAppSelector(selectStreamingArtifactContent)

  // Display streaming content during code streaming, fallback to artifact content
  const displayContent = isCodeStreaming && streamingContent ? streamingContent : artifact.content

  // Lock editor to read-only during streaming
  const effectiveReadOnly = readOnly || isCodeStreaming

  // Get the language for syntax highlighting
  const language = useMemo(
    () => getLanguageFromArtifactType(artifact.type, artifact.metadata.language),
    [artifact.type, artifact.metadata.language]
  )

  // Handle content change
  const handleChange = useCallback(
    (newContent: string) => {
      contentRef.current = newContent
      onChange?.(newContent)
    },
    [onChange]
  )

  // Handle save (Ctrl+S / Cmd+S)
  const handleSave = useCallback(
    (content: string) => {
      onChange?.(content)
    },
    [onChange]
  )

  // Expose getValue method via ref
  useImperativeHandle(
    ref,
    () => ({
      getValue: () => contentRef.current
    }),
    []
  )

  return (
    <EditorContainer className={className} $isStreaming={isCodeStreaming}>
      {isCodeStreaming && (
        <StreamingIndicator>
          <StreamingDot />
          <span>Streaming code…</span>
        </StreamingIndicator>
      )}
      <CodeEditor
        ref={editorRef}
        value={displayContent}
        language={language}
        onChange={handleChange}
        onSave={handleSave}
        readOnly={effectiveReadOnly}
        expanded={true}
        wrapped={true}
        options={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: !isCodeStreaming,
          autocompletion: !isCodeStreaming
        }}
      />
    </EditorContainer>
  )
}

ArtifactCodeEditor.displayName = 'ArtifactCodeEditor'

// ── Animations ──────────────────────────────────────────────────────────────

const pulseAnimation = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
`

const dotPulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.6; }
`

// ── Styled Components ───────────────────────────────────────────────────────

const EditorContainer = styled.div<{ $isStreaming?: boolean }>`
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;

  .code-editor {
    height: 100%;

    .cm-editor {
      height: 100%;
    }

    .cm-scroller {
      overflow: auto;
    }
  }

  ${(props) =>
    props.$isStreaming &&
    css`
      .cm-editor {
        opacity: 0.95;
        animation: ${pulseAnimation} 2s ease-in-out infinite;
      }

      .cm-cursor {
        display: none !important;
      }
    `}
`

const StreamingIndicator = styled.div`
  position: absolute;
  top: 8px;
  right: 12px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--color-primary-soft, rgba(99, 102, 241, 0.12));
  color: var(--color-primary, #6366f1);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.02em;
  pointer-events: none;
`

const StreamingDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: ${dotPulse} 1.2s ease-in-out infinite;
`

export default memo(ArtifactCodeEditor)
