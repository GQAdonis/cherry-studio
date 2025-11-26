/**
 * Artifact Header Component
 *
 * Header with title, view mode tabs, and action buttons
 */

import {
  CloseOutlined,
  CodeOutlined,
  CopyOutlined,
  DownloadOutlined,
  EyeOutlined,
  ReloadOutlined,
  SaveOutlined,
  SplitCellsOutlined
} from '@ant-design/icons'
import { Navbar, NavbarCenter } from '@renderer/components/app/Navbar'
import { useTheme } from '@renderer/context/ThemeProvider'
import type { Artifact } from '@renderer/features/artifacts'
import { Button, message, Segmented, Space, Tooltip } from 'antd'
import { Moon, Sun } from 'lucide-react'
import type { FC } from 'react'
import { memo, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import SaveArtifactModal from './SaveArtifactModal'

interface ArtifactHeaderProps {
  title: string
  viewMode: 'preview' | 'code' | 'split'
  onViewModeChange: (mode: 'preview' | 'code' | 'split') => void
  onClose: () => void
  artifact: Artifact
}

const ArtifactHeader: FC<ArtifactHeaderProps> = ({ title, viewMode, onViewModeChange, onClose, artifact }) => {
  const { t } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const [showSaveModal, setShowSaveModal] = useState(false)

  const viewModeOptions = [
    {
      label: (
        <ViewModeLabel>
          <EyeOutlined />
          <span>{t('artifacts.preview')}</span>
        </ViewModeLabel>
      ),
      value: 'preview'
    },
    {
      label: (
        <ViewModeLabel>
          <CodeOutlined />
          <span>{t('artifacts.code')}</span>
        </ViewModeLabel>
      ),
      value: 'code'
    },
    {
      label: (
        <ViewModeLabel>
          <SplitCellsOutlined />
          <span>{t('artifacts.split')}</span>
        </ViewModeLabel>
      ),
      value: 'split'
    }
  ]

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(artifact.content)
      message.success(t('common.copied'))
    } catch (_err) {
      message.error(t('common.copy_failed'))
    }
  }, [artifact.content, t])

  const handleSave = useCallback(() => {
    // Open the save modal for first-time save or when user wants to update metadata
    // If artifact is already saved, we could directly save, but modal provides better UX
    setShowSaveModal(true)
  }, [])

  const handleSaveComplete = useCallback(() => {
    message.success(t('artifacts.saved'))
  }, [t])

  const handleDownload = useCallback(() => {
    const blob = new Blob([artifact.content], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${artifact.title || 'artifact'}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    message.success(t('common.download_success', 'Downloaded successfully'))
  }, [artifact, t])

  const handleRefresh = useCallback(() => {
    // Trigger a refresh of the preview
    window.dispatchEvent(new CustomEvent('artifact:refresh'))
  }, [])

  return (
    <>
      <Navbar>
        <HeaderContent>
          <LeftSection>
            <NavbarCenter style={{ borderRight: 'none', paddingRight: 16 }}>
              <TitleText>{title}</TitleText>
            </NavbarCenter>
          </LeftSection>

          <CenterSection>
            <Segmented
              options={viewModeOptions}
              value={viewMode}
              onChange={(value) => onViewModeChange(value as 'preview' | 'code' | 'split')}
              size="small"
            />
          </CenterSection>

          <RightSection>
            <Space size={4}>
              <Tooltip title={theme === 'dark' ? t('common.light_mode') : t('common.dark_mode')}>
                <ActionButton onClick={toggleTheme}>
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </ActionButton>
              </Tooltip>
              <Tooltip title={t('common.refresh')}>
                <ActionButton onClick={handleRefresh}>
                  <ReloadOutlined />
                </ActionButton>
              </Tooltip>
              <Tooltip title={t('common.copy')}>
                <ActionButton onClick={handleCopy}>
                  <CopyOutlined />
                </ActionButton>
              </Tooltip>
              <Tooltip title={t('common.download')}>
                <ActionButton onClick={handleDownload}>
                  <DownloadOutlined />
                </ActionButton>
              </Tooltip>
              <Tooltip title={t('artifacts.save_to_library')}>
                <SaveButton onClick={handleSave}>
                  <SaveOutlined />
                  <span>{t('common.save')}</span>
                </SaveButton>
              </Tooltip>
              <Divider />
              <Tooltip title={t('common.close')}>
                <Button type="text" icon={<CloseOutlined />} onClick={onClose} size="small" />
              </Tooltip>
            </Space>
          </RightSection>
        </HeaderContent>
      </Navbar>

      <SaveArtifactModal
        artifact={artifact}
        open={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSaved={handleSaveComplete}
      />
    </>
  )
}

// Styled components
const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 16px;
`

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
`

const CenterSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`

const RightSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex: 1;
`

const TitleText = styled.span`
  font-weight: 500;
  font-size: 14px;
  color: var(--color-text);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ViewModeLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
`

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-2);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--color-background-mute);
    color: var(--color-text);
  }

  .anticon {
    font-size: 14px;
  }
`

const SaveButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 28px;
  padding: 0 12px;
  border: none;
  background: var(--color-primary);
  color: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
  font-weight: 500;

  &:hover {
    background: var(--color-primary-soft);
  }

  .anticon {
    font-size: 14px;
  }
`

const Divider = styled.div`
  width: 1px;
  height: 20px;
  background: var(--color-border);
  margin: 0 8px;
`

export default memo(ArtifactHeader)
