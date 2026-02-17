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
  FileZipOutlined,
  GlobalOutlined,
  ReloadOutlined,
  SaveOutlined
} from '@ant-design/icons'
import { loggerService } from '@logger'
import { Navbar, NavbarCenter } from '@renderer/components/app/Navbar'
import { useTheme } from '@renderer/context/ThemeProvider'
import type { Artifact } from '@renderer/features/artifacts'
import {
  buildArtifactPackagePayload,
  serializeArtifactPackage,
  validateArtifactForDelivery
} from '@renderer/features/artifacts/services'
import { resolveArtifactRuntimePolicy } from '@renderer/features/artifacts/utils/runtimeProfile'
import { useAppSelector } from '@renderer/store'
import { selectArtifactRuntimeSettings } from '@renderer/store/settings'
import { Button, message, Segmented, Space, Tooltip } from 'antd'
import { Moon, Sun } from 'lucide-react'
import type { FC } from 'react'
import { memo, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import SaveArtifactModal from './SaveArtifactModal'

const logger = loggerService.withContext('ArtifactHeader')

interface ArtifactHeaderProps {
  title: string
  viewMode: 'preview' | 'code'
  onViewModeChange: (mode: 'preview' | 'code') => void
  onClose: () => void
  artifact: Artifact
}

const ArtifactHeader: FC<ArtifactHeaderProps> = ({ title, viewMode, onViewModeChange, onClose, artifact }) => {
  const { t } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const runtimeSettings = useAppSelector(selectArtifactRuntimeSettings)
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
    const validation = validateArtifactForDelivery(artifact)
    if (!validation.isValid) {
      message.error(validation.issues[0] || 'Artifact validation failed')
      return
    }

    const blob = new Blob([artifact.content], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${artifact.title || 'artifact'}.${artifact.type === 'xhtml' ? 'xhtml' : 'html'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    message.success(t('common.download_success', 'Downloaded successfully'))
  }, [artifact, t])

  const handleDownloadPackage = useCallback(() => {
    const validation = validateArtifactForDelivery(artifact)
    if (!validation.isValid) {
      message.error(validation.issues[0] || 'Artifact validation failed')
      return
    }

    const runtimePolicy = resolveArtifactRuntimePolicy(runtimeSettings)
    const dependencyMap = (artifact.metadata.dependencies || []).reduce<Record<string, string>>((acc, dependency) => {
      const [name, version] = dependency.split('@').filter(Boolean)
      if (!name) {
        return acc
      }
      const normalizedName = dependency.startsWith('@') ? `@${name}` : name
      acc[normalizedName] = version || 'latest'
      return acc
    }, {})

    const payload = buildArtifactPackagePayload({
      artifact,
      runtimeProfile: runtimePolicy.profile,
      dependencies: dependencyMap
    })

    const blob = new Blob([serializeArtifactPackage(payload)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${artifact.title || 'artifact'}.csartifact.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    message.success(t('artifacts.package_downloaded', 'Artifact package downloaded'))
  }, [artifact, runtimeSettings, t])

  const handleRefresh = useCallback(() => {
    // Trigger a refresh of the preview
    window.dispatchEvent(new CustomEvent('artifact:refresh'))
  }, [])

  const handleOpenExternal = useCallback(async () => {
    try {
      const path = await window.api.file.createTempFile('artifacts-preview.html')
      await window.api.file.write(path, artifact.content)
      const filePath = `file://${path}`

      if (window.api.shell?.openExternal) {
        window.api.shell.openExternal(filePath)
      } else {
        logger.error('shell.openExternal not available')
        message.error(t('chat.artifacts.preview.openExternal.error.content'))
      }
    } catch (error) {
      logger.error('Failed to open artifact in browser:', error as Error)
      message.error(t('chat.artifacts.preview.openExternal.error.content'))
    }
  }, [artifact.content, t])

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
              onChange={(value) => onViewModeChange(value as 'preview' | 'code')}
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
              <Tooltip title={t('artifacts.download_package', 'Download package')}>
                <ActionButton onClick={handleDownloadPackage}>
                  <FileZipOutlined />
                </ActionButton>
              </Tooltip>
              <Tooltip title={t('chat.artifacts.button.openExternal')}>
                <ActionButton onClick={handleOpenExternal}>
                  <GlobalOutlined />
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
