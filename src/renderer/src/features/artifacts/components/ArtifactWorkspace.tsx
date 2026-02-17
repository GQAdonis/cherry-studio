/**
 * Artifact Workspace Component
 *
 * Main workspace area for artifact viewing and editing with:
 * - Toolbar with view mode tabs (Preview | Code | Split)
 * - Version timeline navigation
 * - Compilation status indicator
 * - Theme toggle, refresh, copy, save buttons
 * - Main area with ArtifactRenderer or code editor based on view mode
 */

import {
  CodeOutlined,
  CopyOutlined,
  DownloadOutlined,
  EyeOutlined,
  RedoOutlined,
  ReloadOutlined,
  SaveOutlined,
  SplitCellsOutlined,
  UndoOutlined
} from '@ant-design/icons'
import { useTheme } from '@renderer/context/ThemeProvider'
import { useAppDispatch, useAppSelector } from '@renderer/store'
import {
  redo,
  saveArtifactToLibrary,
  selectCanRedo,
  selectCanUndo,
  selectCompilationError,
  selectCompilationStatus,
  selectIsCodeStreaming,
  setViewMode,
  undo,
  updateContent
} from '@renderer/store/artifacts'
import { message, Segmented, Space, Tooltip } from 'antd'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import type { FC } from 'react'
import { memo, useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled, { keyframes } from 'styled-components'

import { useCompilationErrorHandler } from '../hooks/useCompilationErrorHandler'
import type { Artifact, ViewMode } from '../types'
import { getArtifactExtension } from '../types'
import ArtifactCodeEditor from './ArtifactCodeEditor'
import ArtifactRenderer from './ArtifactRenderer'
import VersionTimeline from './VersionTimeline'

interface ArtifactWorkspaceProps {
  /** The artifact to display */
  artifact: Artifact
  /** Current view mode */
  viewMode: ViewMode
  /** HTMX server port */
  htmxServerPort?: number | null
}

/**
 * Artifact Workspace Component
 */
const ArtifactWorkspace: FC<ArtifactWorkspaceProps> = ({ artifact, viewMode, htmxServerPort }) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  useTheme() // Theme context access (future use for theme toggle)

  const canUndo = useAppSelector(selectCanUndo)
  const canRedo = useAppSelector(selectCanRedo)
  const compilationStatus = useAppSelector(selectCompilationStatus)
  const compilationError = useAppSelector(selectCompilationError)
  const isCodeStreaming = useAppSelector(selectIsCodeStreaming)

  const [refreshKey, setRefreshKey] = useState(0)
  const codeEditorRef = useRef<{ getValue: () => string } | null>(null)

  // Compilation error auto-fix handler
  // Note: onSendAutoFix will be wired up when the refinement hook is accessible here
  const { handleCompilationError, handleCompilationSuccess } = useCompilationErrorHandler()

  // Handle view mode change
  const handleViewModeChange = useCallback(
    (value: string | number) => {
      dispatch(setViewMode(value as ViewMode))
    },
    [dispatch]
  )

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  // Handle copy
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(artifact.content)
      message.success(t('common.copied'))
    } catch (err) {
      message.error(t('common.copy_failed'))
    }
  }, [artifact.content, t])

  // Handle save
  const handleSave = useCallback(() => {
    dispatch(saveArtifactToLibrary(artifact))
    message.success(t('artifacts.saved'))
  }, [dispatch, artifact, t])

  // Handle download
  const handleDownload = useCallback(() => {
    const extension = getArtifactExtension(artifact.type, artifact.metadata.language)
    const filename = `${artifact.identifier}.${extension}`
    const blob = new Blob([artifact.content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    message.success(t('common.downloaded'))
  }, [artifact, t])

  // Handle undo
  const handleUndo = useCallback(() => {
    dispatch(undo())
  }, [dispatch])

  // Handle redo
  const handleRedo = useCallback(() => {
    dispatch(redo())
  }, [dispatch])

  // Handle code change from editor
  const handleCodeChange = useCallback(
    (newContent: string) => {
      dispatch(updateContent(newContent))
    },
    [dispatch]
  )

  // View mode options
  const viewModeOptions = [
    {
      label: (
        <span>
          <EyeOutlined /> {t('artifacts.preview')}
        </span>
      ),
      value: 'preview'
    },
    {
      label: (
        <span>
          <CodeOutlined /> {t('artifacts.code')}
        </span>
      ),
      value: 'code'
    },
    {
      label: (
        <span>
          <SplitCellsOutlined /> {t('artifacts.split')}
        </span>
      ),
      value: 'split'
    }
  ]

  // Render preview pane
  const renderPreview = () => (
    <PreviewPane>
      <ArtifactRenderer
        key={refreshKey}
        artifact={artifact}
        htmxServerPort={htmxServerPort}
        interactive={true}
        width="100%"
        height="100%"
        onReady={handleCompilationSuccess}
        onError={(error) => handleCompilationError({ message: error.message, line: error.line, column: error.column })}
      />
    </PreviewPane>
  )

  // Render code editor pane
  const renderCodeEditor = () => (
    <CodePane>
      <ArtifactCodeEditor ref={codeEditorRef} artifact={artifact} onChange={handleCodeChange} readOnly={false} />
    </CodePane>
  )

  return (
    <Container>
      {/* Toolbar */}
      <Toolbar>
        <ToolbarLeft>
          <Segmented options={viewModeOptions} value={viewMode} onChange={handleViewModeChange} size="small" />
        </ToolbarLeft>

        <ToolbarRight>
          <Space size={4}>
            <Tooltip title={t('common.undo')}>
              <ToolbarButton onClick={handleUndo} disabled={!canUndo}>
                <UndoOutlined />
              </ToolbarButton>
            </Tooltip>
            <Tooltip title={t('common.redo')}>
              <ToolbarButton onClick={handleRedo} disabled={!canRedo}>
                <RedoOutlined />
              </ToolbarButton>
            </Tooltip>

            <ToolbarDivider />

            {/* Version Timeline */}
            <VersionTimeline />

            <ToolbarDivider />

            <Tooltip title={t('common.refresh')}>
              <ToolbarButton onClick={handleRefresh}>
                <ReloadOutlined />
              </ToolbarButton>
            </Tooltip>
            <Tooltip title={t('common.copy')}>
              <ToolbarButton onClick={handleCopy}>
                <CopyOutlined />
              </ToolbarButton>
            </Tooltip>
            <Tooltip title={t('common.download')}>
              <ToolbarButton onClick={handleDownload}>
                <DownloadOutlined />
              </ToolbarButton>
            </Tooltip>
            <Tooltip title={t('common.save')}>
              <ToolbarButton onClick={handleSave}>
                <SaveOutlined />
              </ToolbarButton>
            </Tooltip>
          </Space>
        </ToolbarRight>
      </Toolbar>

      {/* Compilation Status Bar */}
      {compilationStatus !== 'idle' && !isCodeStreaming && (
        <CompilationStatusBar $status={compilationStatus}>
          {compilationStatus === 'compiling' && (
            <>
              <SpinningLoader size={14} />
              <span>Compiling…</span>
            </>
          )}
          {compilationStatus === 'success' && (
            <>
              <CheckCircle2 size={14} />
              <span>Compiled successfully</span>
            </>
          )}
          {compilationStatus === 'error' && (
            <>
              <AlertCircle size={14} />
              <span>{compilationError || 'Compilation error'}</span>
            </>
          )}
        </CompilationStatusBar>
      )}

      {/* Main Content Area */}
      <ContentArea>
        {viewMode === 'preview' && renderPreview()}
        {viewMode === 'code' && renderCodeEditor()}
        {viewMode === 'split' && (
          <SplitView>
            <SplitPane>{renderCodeEditor()}</SplitPane>
            <SplitDivider />
            <SplitPane>{renderPreview()}</SplitPane>
          </SplitView>
        )}
      </ContentArea>
    </Container>
  )
}

// ── Animations ──────────────────────────────────────────────────────────────

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

const SpinningLoader = styled(Loader2)`
  animation: ${spin} 1s linear infinite;
`

// ── Styled Components ───────────────────────────────────────────────────────

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-background);
`

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  background: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
`

const ToolbarLeft = styled.div`
  display: flex;
  align-items: center;
`

const ToolbarRight = styled.div`
  display: flex;
  align-items: center;
`

const ToolbarButton = styled.button<{ disabled?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  background: transparent;
  color: ${(props) => (props.disabled ? 'var(--color-text-muted)' : 'var(--color-text-soft)')};
  border-radius: 6px;
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: var(--color-background-mute);
    color: var(--color-text);
  }

  .anticon {
    font-size: 16px;
  }
`

const ToolbarDivider = styled.div`
  width: 1px;
  height: 20px;
  margin: 0 8px;
  background: var(--color-border);
`

const CompilationStatusBar = styled.div<{ $status: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 16px;
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
  transition: all 0.2s ease;

  ${(props) => {
    switch (props.$status) {
      case 'compiling':
        return `
          background: var(--color-info-soft, rgba(59, 130, 246, 0.08));
          color: var(--color-info, #3b82f6);
          border-bottom: 1px solid var(--color-info-border, rgba(59, 130, 246, 0.15));
        `
      case 'success':
        return `
          background: var(--color-success-soft, rgba(34, 197, 94, 0.08));
          color: var(--color-success, #22c55e);
          border-bottom: 1px solid var(--color-success-border, rgba(34, 197, 94, 0.15));
        `
      case 'error':
        return `
          background: var(--color-error-soft, rgba(239, 68, 68, 0.08));
          color: var(--color-error, #ef4444);
          border-bottom: 1px solid var(--color-error-border, rgba(239, 68, 68, 0.15));
        `
      default:
        return ''
    }
  }}
`

const ContentArea = styled.div`
  flex: 1;
  overflow: hidden;
  position: relative;
`

const PreviewPane = styled.div`
  width: 100%;
  height: 100%;
  overflow: auto;
  background: var(--color-background);
`

const CodePane = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden;
`

const SplitView = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
`

const SplitPane = styled.div`
  flex: 1;
  min-width: 0;
  overflow: hidden;
`

const SplitDivider = styled.div`
  width: 4px;
  background: var(--color-border);
  cursor: col-resize;
  transition: background 0.2s;

  &:hover {
    background: var(--color-primary);
  }
`

export default memo(ArtifactWorkspace)
