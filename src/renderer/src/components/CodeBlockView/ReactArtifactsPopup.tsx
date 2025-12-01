import SandpackReactRenderer from '@renderer/features/artifacts/components/SandpackReactRenderer'
import { type Artifact, ArtifactStatus } from '@renderer/features/artifacts/types'
import { useAppSelector } from '@renderer/store'
import { selectArtifactReactSettings } from '@renderer/store/settings'
import { Button, Modal, Segmented } from 'antd'
import { Code2, Columns, Eye, Terminal } from 'lucide-react'
import type { FC } from 'react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

type ViewMode = 'preview' | 'code' | 'split'

interface Props {
  open: boolean
  title: string
  code: string
  onSave?: (code: string) => void
  onClose: () => void
}

const ReactArtifactsPopup: FC<Props> = ({ open, title, code, onSave, onClose }) => {
  const { t } = useTranslation()
  const reactSettings = useAppSelector(selectArtifactReactSettings)
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [showConsole, setShowConsole] = useState(false)

  // Create an artifact object for SandpackReactRenderer
  const artifact: Artifact = useMemo(
    () => ({
      id: `react-preview-${Date.now()}`,
      identifier: `react-preview-${Date.now()}`,
      type: 'react' as const,
      title,
      content: code,
      version: 1,
      conversationId: '',
      messageId: '',
      saved: false,
      tags: [],
      status: ArtifactStatus.COMPLETE,
      metadata: {
        theme: 'auto' as const,
        dependencies: [],
        customStyles: '',
        tailwind: true
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }),
    [title, code]
  )

  const handleSave = () => {
    if (onSave) {
      onSave(code)
    }
    onClose()
  }

  const viewModeOptions = [
    { value: 'preview', icon: <Eye size={14} />, label: t('artifacts.view.preview', 'Preview') },
    { value: 'code', icon: <Code2 size={14} />, label: t('artifacts.view.code', 'Code') },
    { value: 'split', icon: <Columns size={14} />, label: t('artifacts.view.split', 'Split') }
  ]

  return (
    <StyledModal
      title={null}
      open={open}
      onCancel={onClose}
      footer={null}
      width="90vw"
      style={{ top: 20, padding: 0 }}
      styles={{ body: { padding: 0, height: 'calc(90vh - 40px)', display: 'flex', flexDirection: 'column' } }}
      destroyOnHidden>
      {/* Custom Header */}
      <ModalHeader>
        <HeaderLeft>
          <ModalTitle>{title}</ModalTitle>
        </HeaderLeft>
        <HeaderCenter>
          <Segmented
            value={viewMode}
            onChange={(value) => setViewMode(value as ViewMode)}
            options={viewModeOptions.map((opt) => ({
              value: opt.value,
              label: (
                <SegmentedLabel>
                  {opt.icon}
                  <span>{opt.label}</span>
                </SegmentedLabel>
              )
            }))}
          />
        </HeaderCenter>
        <HeaderRight>
          <Button
            type={showConsole ? 'primary' : 'text'}
            icon={<Terminal size={14} />}
            onClick={() => setShowConsole(!showConsole)}
            size="small">
            {t('artifacts.console', 'Console')}
          </Button>
          {onSave && (
            <Button type="primary" onClick={handleSave} size="small">
              {t('common.save', 'Save')}
            </Button>
          )}
          <Button onClick={onClose} size="small">
            {t('common.close', 'Close')}
          </Button>
        </HeaderRight>
      </ModalHeader>

      {/* Content Area */}
      <ModalContent>
        {reactSettings?.useSandpack !== false ? (
          <SandpackReactRenderer
            artifact={artifact}
            showEditor={viewMode === 'code' || viewMode === 'split'}
            showPreview={viewMode === 'preview' || viewMode === 'split'}
            showConsole={showConsole}
            width="100%"
            height="100%"
          />
        ) : (
          <NoSandpackMessage>
            <h3>Sandpack Runtime Required</h3>
            <p>To preview React components, please enable Sandpack Runtime in the artifact settings.</p>
            <p>Go to Settings → Artifacts → React Artifact Settings → Use Sandpack Runtime</p>
          </NoSandpackMessage>
        )}
      </ModalContent>
    </StyledModal>
  )
}

const StyledModal = styled(Modal)`
  .ant-modal-content {
    padding: 0;
    height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .ant-modal-body {
    flex: 1;
    overflow: hidden;
  }

  .ant-modal-close {
    display: none;
  }
`

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
  gap: 16px;

  .ant-btn {
    color: var(--color-text-1);

    &:hover {
      color: var(--color-primary);
      border-color: var(--color-primary);
    }

    &.ant-btn-primary {
      color: white;
    }

    &.ant-btn-text {
      border-color: transparent;
    }
  }

  .ant-segmented {
    background: var(--color-background-mute);

    .ant-segmented-item {
      color: var(--color-text-2);

      &.ant-segmented-item-selected {
        color: var(--color-text-1);
      }
    }
  }
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
`

const HeaderCenter = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: flex-end;
`

const ModalTitle = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-1);
`

const SegmentedLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 4px;
`

const ModalContent = styled.div`
  flex: 1;
  overflow: hidden;
  background: var(--color-background);
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0; /* Important for flex children to shrink */
`

const NoSandpackMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: var(--color-text-2);

  h3 {
    color: var(--color-text-1);
    margin-bottom: 16px;
  }

  p {
    margin: 8px 0;
    max-width: 500px;
  }
`

export default ReactArtifactsPopup
