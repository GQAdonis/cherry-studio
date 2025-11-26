/**
 * Artifact Workspace Component
 *
 * Main workspace area for artifact viewing and editing with:
 * - Toolbar with view mode tabs (Preview | Code | Split)
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
import { Button, message, Segmented, Space, Tooltip } from 'antd'
import type { FC } from 'react'
import { memo, useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import {
  redo,
  saveArtifactToLibrary,
  selectCanRedo,
  selectCanUndo,
  setViewMode,
  undo,
  updateContent
} from '@renderer/store/artifacts'

import type { Artifact, ViewMode } from '../types'
import { getArtifactExtension } from '../types'

import ArtifactCodeEditor from './ArtifactCodeEditor'
import ArtifactRenderer from './ArtifactRenderer'

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
  const { theme, toggleTheme } = useTheme()

  const canUndo = useAppSelector(selectCanUndo)
  const canRedo = useAppSelector(selectCanRedo)

  const [refreshKey, setRefreshKey] = useState(0)
  const codeEditorRef = useRef<{ getValue: () => string } | null>(null)

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
      />
    </PreviewPane>
  )

  // Render code editor pane
  const renderCodeEditor = () => (
    <CodePane>
      <ArtifactCodeEditor
        ref={codeEditorRef}
        artifact={artifact}
        onChange={handleCodeChange}
        readOnly={false}
      />
    </CodePane>
  )

  return (
    <Container>
      {/* Toolbar */}
      <Toolbar>
        <ToolbarLeft>
          <Segmented
            options={viewModeOptions}
            value={viewMode}
            onChange={handleViewModeChange}
            size="small"
          />
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

// Styled components
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

