/**
 * Artifact Monaco Editor Component
 *
 * Code editor for viewing and editing artifact source code.
 * Uses CodeMirror under the hood (project's standard editor).
 *
 * TODO: Consider migrating to Monaco editor for better
 * feature parity with VS Code / Sandpack if needed.
 */

import CodeEditor from '@renderer/components/CodeEditor'
import type { Artifact } from '@renderer/features/artifacts'
import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'
import styled from 'styled-components'

interface ArtifactMonacoEditorProps {
  artifact: Artifact
  onChange?: (content: string) => void
  readOnly?: boolean
  /** Enable streaming mode for better performance during real-time updates */
  streaming?: boolean
}

/**
 * Get language identifier for the editor based on artifact type
 */
function getLanguageFromArtifactType(type: Artifact['type'], language?: string): string {
  if (language) return language

  switch (type) {
    case 'html':
    case 'htmx':
      return 'html'
    case 'react':
      return 'jsx'
    case 'svg':
      return 'xml'
    case 'mermaid':
      return 'mermaid'
    case 'markdown':
      return 'markdown'
    case 'code':
      return 'javascript'
    default:
      return 'html'
  }
}

const ArtifactMonacoEditor: FC<ArtifactMonacoEditorProps> = ({
  artifact,
  onChange,
  readOnly = false,
  streaming = false
}) => {
  const language = useMemo(
    () => getLanguageFromArtifactType(artifact.type, artifact.metadata?.language),
    [artifact.type, artifact.metadata?.language]
  )

  const handleChange = useCallback(
    (newContent: string) => {
      onChange?.(newContent)
    },
    [onChange]
  )

  const handleSave = useCallback(
    (content: string) => {
      onChange?.(content)
    },
    [onChange]
  )

  return (
    <EditorWrapper $streaming={streaming}>
      <CodeEditor
        value={artifact.content}
        language={language}
        onChange={handleChange}
        onSave={handleSave}
        readOnly={readOnly}
        editable={!readOnly}
        expanded={true}
        wrapped={true}
        options={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: !streaming, // Disable during streaming for performance
          autocompletion: !streaming, // Disable during streaming
          keymap: true,
          stream: streaming // Enable streaming mode
        }}
        fontSize={13}
        minHeight="400px"
      />
    </EditorWrapper>
  )
}

// Styled components
const EditorWrapper = styled.div<{ $streaming?: boolean }>`
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .code-editor {
    height: 100% !important;
    max-height: 100%;
    overflow: hidden;
  }

  .cm-editor {
    height: 100%;
    max-height: 100%;
    font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace;
    ${(props) => props.$streaming && 'opacity: 0.9;'}
  }

  .cm-scroller {
    overflow: auto !important;
    height: 100%;
  }

  .cm-content {
    padding: 16px 0;
    min-height: auto;
  }

  .cm-gutters {
    background: var(--color-background-soft);
    border-right: 1px solid var(--color-border);
  }

  .cm-activeLineGutter {
    background: var(--color-background-mute);
  }
`

export default memo(ArtifactMonacoEditor)
