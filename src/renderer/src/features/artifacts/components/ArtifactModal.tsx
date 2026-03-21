/**
 * Artifact Modal Component
 *
 * Full-screen modal for viewing and editing artifacts with:
 * - Split layout: Chat panel (left) | Workspace (right)
 * - Keyboard shortcuts (Esc to close)
 * - Header with title and actions
 */

import { CloseOutlined } from '@ant-design/icons'
import { useAppDispatch, useAppSelector } from '@renderer/store'
import {
  closeModal,
  selectActiveArtifact,
  selectHtmxServerPort,
  selectIsModalOpen,
  selectViewMode
} from '@renderer/store/artifacts'
import { Drawer, Tooltip } from 'antd'
import type { FC } from 'react'
import { memo, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import { useArtifactHtmxServer } from '../hooks/useArtifactHtmxServer'
import ArtifactChatPanel from './ArtifactChatPanel'
import ArtifactWorkspace from './ArtifactWorkspace'

/**
 * Artifact Modal Component
 */
const ArtifactModal: FC = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const isOpen = useAppSelector(selectIsModalOpen)
  const activeArtifact = useAppSelector(selectActiveArtifact)
  const viewMode = useAppSelector(selectViewMode)
  const htmxServerPort = useAppSelector(selectHtmxServerPort)
  useArtifactHtmxServer(activeArtifact?.type === 'htmx')

  // Handle close
  const handleClose = useCallback(() => {
    dispatch(closeModal())
  }, [dispatch])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      // Escape to close
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleClose])

  // Don't render if no artifact
  if (!activeArtifact) return null

  return (
    <StyledDrawer
      open={isOpen}
      onClose={handleClose}
      placement="bottom"
      height="100%"
      closeIcon={null}
      mask={true}
      maskClosable={true}
      destroyOnClose={true}
      styles={{
        body: {
          padding: 0,
          overflow: 'hidden'
        },
        content: {
          background: 'var(--color-background)'
        }
      }}>
      <ModalContainer>
        {/* Header */}
        <ModalHeader>
          <HeaderLeft>
            <ArtifactTitle>{activeArtifact.title}</ArtifactTitle>
            <ArtifactMeta>
              <MetaBadge>{activeArtifact.type.toUpperCase()}</MetaBadge>
              <MetaText>v{activeArtifact.version}</MetaText>
              <MetaText>{activeArtifact.identifier}</MetaText>
            </ArtifactMeta>
          </HeaderLeft>
          <HeaderRight>
            <Tooltip title={t('common.close')} placement="bottom">
              <CloseButton onClick={handleClose}>
                <CloseOutlined />
              </CloseButton>
            </Tooltip>
          </HeaderRight>
        </ModalHeader>

        {/* Content - Split Layout */}
        <ModalContent>
          {/* Left Panel - Chat */}
          <ChatPanelContainer>
            <ArtifactChatPanel artifact={activeArtifact} />
          </ChatPanelContainer>

          {/* Resizer */}
          <PanelDivider />

          {/* Right Panel - Workspace */}
          <WorkspaceContainer>
            <ArtifactWorkspace artifact={activeArtifact} viewMode={viewMode} htmxServerPort={htmxServerPort} />
          </WorkspaceContainer>
        </ModalContent>
      </ModalContainer>
    </StyledDrawer>
  )
}

// Styled components
const StyledDrawer = styled(Drawer)`
  .ant-drawer-content-wrapper {
    box-shadow: none;
  }

  .ant-drawer-body {
    padding: 0;
  }
`

const ModalContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-background);
`

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 16px;
  background: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  -webkit-app-region: drag;
`

const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  -webkit-app-region: no-drag;
`

const ArtifactTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
`

const ArtifactMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const MetaBadge = styled.span`
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 500;
  color: var(--color-primary);
  background: var(--color-primary-bg, rgba(59, 130, 246, 0.1));
  border-radius: 4px;
`

const MetaText = styled.span`
  font-size: 12px;
  color: var(--color-text-soft);
`

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  -webkit-app-region: no-drag;
`

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-soft);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--color-background-mute);
    color: var(--color-text);
  }

  .anticon {
    font-size: 16px;
  }
`

const ModalContent = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`

const ChatPanelContainer = styled.div`
  width: 360px;
  min-width: 280px;
  max-width: 480px;
  height: 100%;
  background: var(--color-background-soft);
  border-right: 1px solid var(--color-border);
  flex-shrink: 0;
  overflow: hidden;
`

const PanelDivider = styled.div`
  width: 1px;
  background: var(--color-border);
  cursor: col-resize;
  transition: background 0.2s;

  &:hover {
    background: var(--color-primary);
  }
`

const WorkspaceContainer = styled.div`
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow: hidden;
`

export default memo(ArtifactModal)
