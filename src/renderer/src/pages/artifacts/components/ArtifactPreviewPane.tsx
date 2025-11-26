/**
 * Artifact Preview Pane Component
 *
 * Right pane with tabbed interface for preview and code views.
 * Features:
 * - Tabbed Preview/Code view with internal state
 * - Editable code with unsaved changes indicator
 * - Live preview updates when switching tabs
 * - Full web access in iframe for external resources
 * - Streaming indicator when artifact is being generated
 */

import { CodeOutlined, EyeOutlined, LoadingOutlined } from '@ant-design/icons'
import type { Artifact } from '@renderer/features/artifacts'
import { buildPreviewDocument } from '@renderer/features/artifacts/utils/documentBuilder'
import { useAppDispatch, useAppSelector } from '@renderer/store'
import {
  selectIsArtifactStreaming,
  selectStreamingArtifactContent,
  updateContent
} from '@renderer/store/artifacts'
import { Spin } from 'antd'
import type { FC } from 'react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import ArtifactMonacoEditor from './ArtifactMonacoEditor'

interface ArtifactPreviewPaneProps {
  artifact: Artifact
  viewMode: 'preview' | 'code' | 'split'
}

const ArtifactPreviewPane: FC<ArtifactPreviewPaneProps> = ({ artifact, viewMode }) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Check if artifact content is currently being streamed
  const isArtifactStreaming = useAppSelector(selectIsArtifactStreaming)

  // Get streaming artifact content for real-time code view updates
  const streamingArtifactContent = useAppSelector(selectStreamingArtifactContent)

  // Internal tab state for within-pane switching
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview')

  // Track edited code and unsaved changes
  const [editedContent, setEditedContent] = useState(artifact.content)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Determine what content to display in the editor
  // Priority: streaming content > edited content > artifact content
  const displayContent = useMemo(() => {
    // If streaming, show the streaming content (read-only)
    if (isArtifactStreaming && streamingArtifactContent) {
      return streamingArtifactContent
    }
    // Otherwise show the edited content
    return editedContent
  }, [isArtifactStreaming, streamingArtifactContent, editedContent])

  // Sync edited content when artifact changes externally (e.g., from AI refinement completion)
  useEffect(() => {
    if (artifact.content !== editedContent && !hasUnsavedChanges) {
      setEditedContent(artifact.content)
    }
  }, [artifact.content, editedContent, hasUnsavedChanges])

  // Also update edited content when streaming completes (new content from AI)
  useEffect(() => {
    if (!isArtifactStreaming && !streamingArtifactContent && artifact.content !== editedContent && !hasUnsavedChanges) {
      setEditedContent(artifact.content)
    }
  }, [isArtifactStreaming, streamingArtifactContent, artifact.content, editedContent, hasUnsavedChanges])

  // Generate iframe srcDoc using the edited content
  const srcDoc = useMemo(() => {
    const resolvedTheme = artifact.metadata?.theme === 'dark' ? 'dark' : 'light'
    // Use editedContent for live preview
    return buildPreviewDocument(editedContent, artifact.type, resolvedTheme)
  }, [editedContent, artifact.type, artifact.metadata])

  // Handle content change from editor
  const handleContentChange = useCallback((newContent: string) => {
    setEditedContent(newContent)
    setHasUnsavedChanges(true)
  }, [])

  // Save changes to Redux store
  const handleSaveChanges = useCallback(() => {
    dispatch(updateContent(editedContent))
    setHasUnsavedChanges(false)
  }, [dispatch, editedContent])

  // Handle Cmd/Ctrl+S in editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (hasUnsavedChanges) {
          handleSaveChanges()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasUnsavedChanges, handleSaveChanges])

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      setRefreshKey((prev) => prev + 1)
    }

    window.addEventListener('artifact:refresh', handleRefresh)
    return () => {
      window.removeEventListener('artifact:refresh', handleRefresh)
    }
  }, [])

  // Render preview iframe with streaming indicator
  const renderPreview = () => {
    // Show streaming indicator when artifact content is being generated
    if (isArtifactStreaming) {
      return (
        <PreviewContainer>
          <StreamingOverlay>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
            <StreamingText>{t('artifacts.generating', 'Generating artifact...')}</StreamingText>
          </StreamingOverlay>
        </PreviewContainer>
      )
    }

    return (
      <PreviewContainer>
        <IframeWrapper>
          <StyledIframe
            key={refreshKey}
            ref={iframeRef}
            srcDoc={srcDoc}
            // Note: allow-same-origin is needed for Tailwind CDN and some HTMX features
            // The security warning is acknowledged but necessary for full functionality
            sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals allow-downloads"
            title={artifact.title}
          />
        </IframeWrapper>
      </PreviewContainer>
    )
  }

  // Render code editor - shows streaming content in real-time when available
  const renderEditor = () => (
    <EditorContainer>
      {isArtifactStreaming && (
        <StreamingBanner>
          <LoadingOutlined spin />
          <span>{t('artifacts.generating', 'Generating artifact...')}</span>
        </StreamingBanner>
      )}
      <ArtifactMonacoEditor
        artifact={{ ...artifact, content: displayContent }}
        onChange={handleContentChange}
        // Disable editing during streaming
        readOnly={isArtifactStreaming}
        // Enable streaming mode for better performance during updates
        streaming={isArtifactStreaming}
      />
    </EditorContainer>
  )

  // Render tabbed interface for non-split modes
  const renderTabbedView = () => (
    <TabbedContainer>
      <TabBar>
        <TabButton $active={activeTab === 'preview'} onClick={() => setActiveTab('preview')}>
          <EyeOutlined />
          <span>Preview</span>
        </TabButton>
        <TabButton $active={activeTab === 'code'} onClick={() => setActiveTab('code')}>
          <CodeOutlined />
          <span>Code</span>
          {hasUnsavedChanges && <UnsavedDot />}
        </TabButton>
        {hasUnsavedChanges && (
          <SaveButton onClick={handleSaveChanges}>
            Save <kbd>⌘S</kbd>
          </SaveButton>
        )}
      </TabBar>
      <TabContent>{activeTab === 'preview' ? renderPreview() : renderEditor()}</TabContent>
    </TabbedContainer>
  )

  // Render based on view mode
  switch (viewMode) {
    case 'preview':
      // Show tabs with preview as default
      return renderTabbedView()
    case 'code':
      // Show tabs with code as default
      if (activeTab === 'preview') setActiveTab('code')
      return renderTabbedView()
    case 'split':
      return (
        <SplitContainer>
          <SplitPane>{renderEditor()}</SplitPane>
          <SplitDivider />
          <SplitPane>{renderPreview()}</SplitPane>
        </SplitContainer>
      )
    default:
      return renderTabbedView()
  }
}

// Styled components
const TabbedContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
`

const TabBar = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: var(--color-background);
  border-bottom: 1px solid var(--color-border);
`

const TabButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  background: ${(props) => (props.$active ? 'var(--color-primary)' : 'transparent')};
  color: ${(props) => (props.$active ? 'white' : 'var(--color-text-2)')};

  &:hover {
    background: ${(props) => (props.$active ? 'var(--color-primary)' : 'var(--color-background-mute)')};
    color: ${(props) => (props.$active ? 'white' : 'var(--color-text)')};
  }

  .anticon {
    font-size: 14px;
  }
`

const UnsavedDot = styled.span`
  width: 6px;
  height: 6px;
  background: var(--color-warning);
  border-radius: 50%;
  margin-left: 4px;
`

const SaveButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  margin-left: auto;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  background: var(--color-success);
  color: white;
  transition: all 0.15s ease;

  &:hover {
    opacity: 0.9;
  }

  kbd {
    padding: 2px 4px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    font-size: 10px;
  }
`

const TabContent = styled.div`
  flex: 1;
  overflow: hidden;
  min-height: 0; /* Critical for flex children to shrink below content size */
  display: flex;
  flex-direction: column;
`

const SplitContainer = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
`

const SplitPane = styled.div`
  flex: 1;
  overflow: hidden;
`

const SplitDivider = styled.div`
  width: 1px;
  background: var(--color-border);
`

const PreviewContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--color-background-soft);
  overflow: hidden;
  position: relative;
`

const StreamingOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: var(--color-background-soft);
  z-index: 10;
`

const StreamingText = styled.div`
  font-size: 14px;
  color: var(--color-text-2);
  font-weight: 500;
`

const IframeWrapper = styled.div`
  flex: 1;
  padding: 16px;
  overflow: auto;
`

const StyledIframe = styled.iframe`
  width: 100%;
  height: 100%;
  min-height: 400px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: white;
`

const EditorContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0; /* Critical for flex children to shrink below content size */

  /* Ensure the code editor can scroll */
  & > div:last-child {
    flex: 1;
    min-height: 0;
  }
`

const StreamingBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 500;
  border-bottom: 1px solid var(--color-border);

  .anticon {
    font-size: 14px;
  }
`

export default memo(ArtifactPreviewPane)
