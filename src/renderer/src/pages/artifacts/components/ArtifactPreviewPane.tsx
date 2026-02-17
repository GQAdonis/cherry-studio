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

import { CodeOutlined, CopyOutlined, EyeOutlined, GlobalOutlined, LoadingOutlined } from '@ant-design/icons'
import { loggerService } from '@logger'
import type { Artifact } from '@renderer/features/artifacts'
import VersionTimeline from '@renderer/features/artifacts/components/VersionTimeline'
import { useCompilationErrorHandler } from '@renderer/features/artifacts/hooks/useCompilationErrorHandler'
import { buildPreviewDocument } from '@renderer/features/artifacts/utils/documentBuilder'
import { useAppDispatch, useAppSelector } from '@renderer/store'
import {
  selectCompilationError,
  selectCompilationStatus,
  selectIsArtifactStreaming,
  selectIsCodeStreaming,
  selectStreamingArtifactContent,
  updateContent
} from '@renderer/store/artifacts'
import { message, Spin, Tooltip } from 'antd'
import type { FC } from 'react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

const logger = loggerService.withContext('ArtifactPreviewPane')

import ArtifactRenderer from '@renderer/features/artifacts/components/ArtifactRenderer'

import ArtifactMonacoEditor from './ArtifactMonacoEditor'

interface ArtifactPreviewPaneProps {
  artifact: Artifact
  viewMode: 'preview' | 'code'
  onViewModeChange?: (mode: 'preview' | 'code') => void
  onSendAutoFix?: (message: string) => void
}

const ArtifactPreviewPane: FC<ArtifactPreviewPaneProps> = ({ artifact, viewMode, onViewModeChange, onSendAutoFix }) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const [refreshKey, setRefreshKey] = useState(0)

  // Check if artifact content is currently being streamed
  const isArtifactStreaming = useAppSelector(selectIsArtifactStreaming)
  const isCodeStreaming = useAppSelector(selectIsCodeStreaming)
  const compilationStatus = useAppSelector(selectCompilationStatus)
  const compilationError = useAppSelector(selectCompilationError)

  // Get streaming artifact content for real-time code view updates
  const streamingArtifactContent = useAppSelector(selectStreamingArtifactContent)

  // Internal view mode tabs (Code | Preview)
  const [activeViewMode, setActiveViewMode] = useState<'preview' | 'code'>(viewMode)

  // Track edited code and unsaved changes
  const [editedContent, setEditedContent] = useState(artifact.content)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const { handleCompilationError, handleCompilationSuccess, autoFixAttemptCount, maxAttemptsReached } =
    useCompilationErrorHandler({
      onSendAutoFix,
      autoFixEnabled: !!onSendAutoFix
    })

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

  useEffect(() => {
    setActiveViewMode(viewMode)
  }, [viewMode])

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

  // Handle opening artifact in external browser
  const handleOpenExternal = useCallback(async () => {
    try {
      const htmlContent = buildPreviewDocument(
        editedContent,
        artifact.type,
        artifact.metadata?.theme === 'dark' ? 'dark' : 'light'
      )
      const path = await window.api.file.createTempFile('artifacts-preview.html')
      await window.api.file.write(path, htmlContent)
      const filePath = `file://${path}`

      if (window.api.shell?.openExternal) {
        window.api.shell.openExternal(filePath)
      } else {
        logger.error('shell.openExternal not available')
        window.toast.error(t('chat.artifacts.preview.openExternal.error.content'))
      }
    } catch (error) {
      logger.error('Failed to open artifact in browser:', error as Error)
      window.toast.error(t('chat.artifacts.preview.openExternal.error.content'))
    }
  }, [editedContent, artifact.type, artifact.metadata, t])

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(displayContent)
      message.success(t('common.copied'))
    } catch (_error) {
      message.error(t('common.copy_failed'))
    }
  }, [displayContent, t])

  const handleModeSelect = useCallback(
    (mode: 'preview' | 'code') => {
      setActiveViewMode(mode)
      onViewModeChange?.(mode)
    },
    [onViewModeChange]
  )

  const renderArtifact = useMemo(
    () => ({
      ...artifact,
      content: editedContent
    }),
    [artifact, editedContent]
  )

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
        <ArtifactRenderer
          key={refreshKey}
          artifact={renderArtifact}
          width="100%"
          height="100%"
          onReady={handleCompilationSuccess}
          onError={(error) =>
            handleCompilationError({
              message: error.message,
              line: error.line,
              column: error.column
            })
          }
          onHtmxEvent={(event, payload) => {
            if (event !== 'htmx:error') {
              return
            }
            const rawMessage = typeof payload?.error === 'string' ? payload.error : 'HTMX rendering error'
            handleCompilationError({ message: rawMessage })
          }}
        />
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

  // Render tabbed interface
  const renderTabbedView = () => (
    <TabbedContainer>
      <TabBar>
        <TabButton $active={activeViewMode === 'code'} onClick={() => handleModeSelect('code')}>
          <CodeOutlined />
          <span>{t('artifacts.code')}</span>
          {hasUnsavedChanges && <UnsavedDot />}
        </TabButton>
        <TabButton $active={activeViewMode === 'preview'} onClick={() => handleModeSelect('preview')}>
          <EyeOutlined />
          <span>{t('artifacts.preview')}</span>
        </TabButton>
        <TimelineWrap>
          <VersionTimeline />
        </TimelineWrap>
        <TabActions>
          <Tooltip title={t('chat.artifacts.button.openExternal')}>
            <ToolbarIconButton onClick={handleOpenExternal}>
              <GlobalOutlined />
            </ToolbarIconButton>
          </Tooltip>
          <Tooltip title={t('common.copy')}>
            <ToolbarIconButton onClick={handleCopyCode}>
              <CopyOutlined />
            </ToolbarIconButton>
          </Tooltip>
          {hasUnsavedChanges && (
            <SaveButton onClick={handleSaveChanges}>
              Save <kbd>⌘S</kbd>
            </SaveButton>
          )}
        </TabActions>
      </TabBar>
      {compilationStatus !== 'idle' && !isCodeStreaming && (
        <CompilationStatusBar $status={compilationStatus}>
          {compilationStatus === 'compiling' && <LoadingOutlined spin />}
          {compilationStatus === 'success' && <span>{t('artifacts.preview_ready', 'Preview updated')}</span>}
          {compilationStatus === 'error' && (
            <span>
              {compilationError || t('artifacts.preview_error', 'Preview failed to compile')}
              {onSendAutoFix ? ` (${autoFixAttemptCount}${maxAttemptsReached ? ', max retries reached' : ''})` : ''}
            </span>
          )}
        </CompilationStatusBar>
      )}
      <TabContent>
        {activeViewMode === 'preview' && renderPreview()}
        {activeViewMode === 'code' && renderEditor()}
      </TabContent>
    </TabbedContainer>
  )

  return renderTabbedView()
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

const TimelineWrap = styled.div`
  display: flex;
  align-items: center;
  margin-left: 12px;
`

const TabActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
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

const ToolbarIconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  background: transparent;
  color: var(--color-text-2);
  transition: all 0.15s ease;
  &:hover {
    background: var(--color-background-mute);
    color: var(--color-primary);
  }

  .anticon {
    font-size: 16px;
  }
`

const SaveButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
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

const CompilationStatusBar = styled.div<{ $status: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12px;
  border-bottom: 1px solid var(--color-border);
  color: ${(props) => (props.$status === 'error' ? 'var(--color-error)' : 'var(--color-text-2)')};
  background: ${(props) =>
    props.$status === 'error' ? 'var(--color-error-soft, rgba(239, 68, 68, 0.1))' : 'var(--color-background-soft)'};
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

const EditorContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: auto;
  min-height: 0; /* Critical for flex children to shrink below content size */
  min-width: 0;

  /* Ensure the code editor can scroll */
  & > div:last-child {
    flex: 1;
    min-height: 0;
    min-width: 0;
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
