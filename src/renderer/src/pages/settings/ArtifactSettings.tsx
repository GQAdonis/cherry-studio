/**
 * Artifact Settings Page
 *
 * Settings for configuring artifact support:
 * - Enable/disable artifact support
 * - Default artifact types to generate
 * - Auto-open artifacts on creation
 * - Artifact storage limit
 */

import { useTheme } from '@renderer/context/ThemeProvider'
import { useAppDispatch, useAppSelector } from '@renderer/store'
import {
  selectArtifactSettings,
  setArtifactAutoOpen,
  setArtifactEnabled,
  setArtifactStorageLimit,
  setArtifactTypes
} from '@renderer/store/settings'
import { Checkbox, InputNumber, Switch } from 'antd'
import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import {
  SettingContainer,
  SettingDivider,
  SettingGroup,
  SettingHelpText,
  SettingRow,
  SettingRowTitle,
  SettingTitle
} from '.'

const ARTIFACT_TYPE_OPTIONS = [
  { label: 'HTMX', value: 'htmx', disabled: true }, // HTMX is always on
  { label: 'HTML', value: 'html' },
  { label: 'React', value: 'react' },
  { label: 'SVG', value: 'svg' },
  { label: 'Mermaid', value: 'mermaid' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'Code', value: 'code' }
]

const ArtifactSettings: FC = () => {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const settings = useAppSelector(selectArtifactSettings)

  const handleEnabledChange = (enabled: boolean) => {
    dispatch(setArtifactEnabled(enabled))
  }

  const handleAutoOpenChange = (autoOpen: boolean) => {
    dispatch(setArtifactAutoOpen(autoOpen))
  }

  const handleTypesChange = (types: string[]) => {
    // Always include 'htmx' as it's required
    const updatedTypes = types.includes('htmx') ? types : ['htmx', ...types]
    dispatch(setArtifactTypes(updatedTypes))
  }

  const handleStorageLimitChange = (limit: number | null) => {
    if (limit !== null) {
      dispatch(setArtifactStorageLimit(limit))
    }
  }

  return (
    <SettingContainer theme={theme}>
      <SettingGroup theme={theme}>
        <SettingTitle>{t('settings.artifacts.title', 'Artifacts')}</SettingTitle>
        <SettingDivider />

        <SettingRow>
          <SettingRowTitle>{t('settings.artifacts.enable', 'Enable Artifact Support')}</SettingRowTitle>
          <Switch checked={settings.enabled} onChange={handleEnabledChange} />
        </SettingRow>
        <SettingHelpText>
          {t(
            'settings.artifacts.enable_help',
            'When enabled, AI-generated interactive content will be detected and rendered as artifacts.'
          )}
        </SettingHelpText>

        <SettingDivider />

        <SettingRow>
          <SettingRowTitle>{t('settings.artifacts.auto_open', 'Auto-open Artifacts')}</SettingRowTitle>
          <Switch checked={settings.autoOpen} onChange={handleAutoOpenChange} disabled={!settings.enabled} />
        </SettingRow>
        <SettingHelpText>
          {t(
            'settings.artifacts.auto_open_help',
            'Automatically open the artifact viewer when a new artifact is created.'
          )}
        </SettingHelpText>
      </SettingGroup>

      <SettingGroup theme={theme}>
        <SettingTitle>{t('settings.artifacts.types_title', 'Artifact Types')}</SettingTitle>
        <SettingDivider />

        <SettingRow>
          <SettingRowTitle>{t('settings.artifacts.enabled_types', 'Enabled Artifact Types')}</SettingRowTitle>
        </SettingRow>
        <TypesContainer>
          <Checkbox.Group
            value={settings.enabledTypes}
            onChange={(values) => handleTypesChange(values as string[])}
            disabled={!settings.enabled}>
            {ARTIFACT_TYPE_OPTIONS.map((option) => (
              <CheckboxItem key={option.value}>
                <Checkbox value={option.value} disabled={option.disabled || !settings.enabled}>
                  {option.label}
                  {option.disabled && <RequiredBadge>{t('settings.artifacts.required', 'Required')}</RequiredBadge>}
                </Checkbox>
              </CheckboxItem>
            ))}
          </Checkbox.Group>
        </TypesContainer>
        <SettingHelpText>
          {t(
            'settings.artifacts.types_help',
            'Select which types of artifacts should be generated. HTMX is always enabled.'
          )}
        </SettingHelpText>
      </SettingGroup>

      <SettingGroup theme={theme}>
        <SettingTitle>{t('settings.artifacts.storage_title', 'Storage')}</SettingTitle>
        <SettingDivider />

        <SettingRow>
          <SettingRowTitle>{t('settings.artifacts.storage_limit', 'Artifact Storage Limit')}</SettingRowTitle>
          <InputNumber
            min={10}
            max={1000}
            value={settings.storageLimit}
            onChange={handleStorageLimitChange}
            disabled={!settings.enabled}
            addonAfter={t('settings.artifacts.items', 'items')}
          />
        </SettingRow>
        <SettingHelpText>
          {t(
            'settings.artifacts.storage_limit_help',
            'Maximum number of artifacts to store in the library. Oldest artifacts will be removed when limit is exceeded.'
          )}
        </SettingHelpText>
      </SettingGroup>
    </SettingContainer>
  )
}

const TypesContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  margin-bottom: 8px;

  .ant-checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
`

const CheckboxItem = styled.div`
  display: flex;
  align-items: center;
`

const RequiredBadge = styled.span`
  margin-left: 8px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 500;
  color: var(--color-primary);
  background: var(--color-primary-bg);
  border-radius: 4px;
`

export default ArtifactSettings
