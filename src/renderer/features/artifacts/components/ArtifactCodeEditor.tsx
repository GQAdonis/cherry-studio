/**
 * Artifact Code Editor Component
 *
 * Wrapper around CodeMirror/CodeEditor for editing artifact content with:
 * - Syntax highlighting based on artifact type
 * - Read-only or editable modes
 * - Sync changes back to store
 */

import CodeEditor from '@renderer/components/CodeEditor'
import type { FC } from 'react'
import { forwardRef, memo, useCallback, useImperativeHandle, useMemo, useRef } from 'react'
import styled from 'styled-components'

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
      return 'javascript' // Default to JS for generic code
    default:
      return 'text'
  }
}

/**
 * Artifact Code Editor Component
 */
const ArtifactCodeEditor = forwardRef<ArtifactCodeEditorRef, ArtifactCodeEditorProps>(
  ({ artifact, onChange, readOnly = false, className }, ref) => {
    const editorRef = useRef<{ save?: () => void } | null>(null)
    const contentRef = useRef(artifact.content)

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
      <EditorContainer className={className}>
        <CodeEditor
          ref={editorRef}
          value={artifact.content}
          language={language}
          onChange={handleChange}
          onSave={handleSave}
          readOnly={readOnly}
          expanded={true}
          wrapped={true}
          options={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            autocompletion: true
          }}
        />
      </EditorContainer>
    )
  }
)

ArtifactCodeEditor.displayName = 'ArtifactCodeEditor'

// Styled components
const EditorContainer = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden;

  .code-editor {
    height: 100%;

    .cm-editor {
      height: 100%;
    }

    .cm-scroller {
      overflow: auto;
    }
  }
`

export default memo(ArtifactCodeEditor)

