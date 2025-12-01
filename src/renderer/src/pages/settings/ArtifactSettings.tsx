/**
 * Artifact Settings Page
 *
 * Settings for configuring artifact support:
 * - Enable/disable artifact support
 * - Default artifact types to generate
 * - Auto-open artifacts on creation
 * - Artifact storage limit
 * - React/Sandpack configuration
 */

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useTheme } from '@renderer/context/ThemeProvider'
import { useAppDispatch, useAppSelector } from '@renderer/store'
import {
  removeArtifactReactDependency,
  selectArtifactSettings,
  setArtifactAutoOpen,
  setArtifactEnabled,
  setArtifactReactCustomBundlerUrl,
  setArtifactReactDependency,
  setArtifactReactShowConsole,
  setArtifactReactShowEditor,
  setArtifactReactUseSandpack,
  setArtifactStorageLimit,
  setArtifactTypes
} from '@renderer/store/settings'
import { Button, Checkbox, Input, InputNumber, Space, Switch, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { FC } from 'react'
import { useCallback, useMemo, useState } from 'react'
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

// Default dependencies that are pre-configured
const DEFAULT_DEPENDENCY_CATEGORIES = {
  'UI Components': ['@radix-ui/react-icons', 'lucide-react', 'class-variance-authority', 'clsx', 'tailwind-merge'],
  'Data & API': ['@supabase/supabase-js', 'axios'],
  'Diagrams & Visualization': ['@xyflow/react', 'recharts'],
  'State & Forms': ['zustand', 'react-hook-form', '@hookform/resolvers', 'zod'],
  Utilities: ['date-fns', 'lodash-es', 'uuid']
}

interface DependencyRow {
  key: string
  name: string
  version: string
  category?: string
}

const ArtifactSettings: FC = () => {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const settings = useAppSelector(selectArtifactSettings)

  // Default values if settings is undefined
  const safeSettings = settings || {
    enabled: true,
    autoOpen: false,
    enabledTypes: ['htmx', 'html', 'react', 'svg', 'mermaid', 'markdown', 'code'],
    storageLimit: 100,
    react: {
      useSandpack: true,
      showEditor: false,
      showConsole: false,
      customBundlerUrl: '',
      dependencies: {}
    }
  }

  // State for adding new dependency
  const [newDepName, setNewDepName] = useState('')
  const [newDepVersion, setNewDepVersion] = useState('latest')

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

  // React/Sandpack handlers
  const handleUseSandpackChange = (useSandpack: boolean) => {
    dispatch(setArtifactReactUseSandpack(useSandpack))
  }

  const handleShowEditorChange = (showEditor: boolean) => {
    dispatch(setArtifactReactShowEditor(showEditor))
  }

  const handleShowConsoleChange = (showConsole: boolean) => {
    dispatch(setArtifactReactShowConsole(showConsole))
  }

  const handleCustomBundlerUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setArtifactReactCustomBundlerUrl(e.target.value))
  }

  const handleAddDependency = useCallback(() => {
    if (newDepName.trim()) {
      dispatch(setArtifactReactDependency({ name: newDepName.trim(), version: newDepVersion || 'latest' }))
      setNewDepName('')
      setNewDepVersion('latest')
    }
  }, [dispatch, newDepName, newDepVersion])

  const handleRemoveDependency = useCallback(
    (name: string) => {
      dispatch(removeArtifactReactDependency(name))
    },
    [dispatch]
  )

  // Convert dependencies to table data
  const dependencyData: DependencyRow[] = useMemo(() => {
    const deps = safeSettings.react?.dependencies || {}
    return Object.entries(deps).map(([name, version]) => {
      // Find category for this dependency
      let category: string | undefined
      for (const [cat, packages] of Object.entries(DEFAULT_DEPENDENCY_CATEGORIES)) {
        if (packages.includes(name)) {
          category = cat
          break
        }
      }
      return { key: name, name, version, category }
    })
  }, [safeSettings.react?.dependencies])

  // Table columns
  const columns: ColumnsType<DependencyRow> = [
    {
      title: t('settings.artifacts.react.dep_name', 'Package'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: DependencyRow) => (
        <Space>
          <code>{name}</code>
          {record.category && <Tag color="blue">{record.category}</Tag>}
        </Space>
      )
    },
    {
      title: t('settings.artifacts.react.dep_version', 'Version'),
      dataIndex: 'version',
      key: 'version',
      width: 100,
      render: (version: string) => <Tag>{version}</Tag>
    },
    {
      title: t('settings.artifacts.react.dep_actions', 'Actions'),
      key: 'actions',
      width: 80,
      render: (_: unknown, record: DependencyRow) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveDependency(record.name)}
          disabled={!safeSettings.enabled || !safeSettings.react?.useSandpack}
        />
      )
    }
  ]

  const isReactEnabled = safeSettings.enabled && safeSettings.enabledTypes.includes('react')
  const isSandpackEnabled = isReactEnabled && safeSettings.react?.useSandpack

  return (
    <SettingContainer theme={theme}>
      <SettingGroup theme={theme}>
        <SettingTitle>{t('settings.artifacts.title', 'Artifacts')}</SettingTitle>
        <SettingDivider />

        <SettingRow>
          <SettingRowTitle>{t('settings.artifacts.enable', 'Enable Artifact Support')}</SettingRowTitle>
          <Switch checked={safeSettings.enabled} onChange={handleEnabledChange} />
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
          <Switch checked={safeSettings.autoOpen} onChange={handleAutoOpenChange} disabled={!safeSettings.enabled} />
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
            value={safeSettings.enabledTypes}
            onChange={(values) => handleTypesChange(values as string[])}
            disabled={!safeSettings.enabled}>
            {ARTIFACT_TYPE_OPTIONS.map((option) => (
              <CheckboxItem key={option.value}>
                <Checkbox value={option.value} disabled={option.disabled || !safeSettings.enabled}>
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

      {/* React/Sandpack Settings */}
      <SettingGroup theme={theme}>
        <SettingTitle>{t('settings.artifacts.react.title', 'React Artifact Settings')}</SettingTitle>
        <SettingDivider />

        <SettingRow>
          <SettingRowTitle>{t('settings.artifacts.react.use_sandpack', 'Use Sandpack Runtime')}</SettingRowTitle>
          <Switch
            checked={safeSettings.react?.useSandpack ?? true}
            onChange={handleUseSandpackChange}
            disabled={!isReactEnabled}
          />
        </SettingRow>
        <SettingHelpText>
          {t(
            'settings.artifacts.react.use_sandpack_help',
            'Use CodeSandbox Sandpack for React artifacts. Enables NPM dependencies, hot reload, and better error handling. Disable for simple Babel-only transpilation.'
          )}
        </SettingHelpText>

        <SettingDivider />

        <SettingRow>
          <SettingRowTitle>{t('settings.artifacts.react.show_editor', 'Show Code Editor')}</SettingRowTitle>
          <Switch
            checked={safeSettings.react?.showEditor ?? false}
            onChange={handleShowEditorChange}
            disabled={!isSandpackEnabled}
          />
        </SettingRow>
        <SettingHelpText>
          {t(
            'settings.artifacts.react.show_editor_help',
            'Show the code editor panel alongside the preview in Sandpack mode.'
          )}
        </SettingHelpText>

        <SettingDivider />

        <SettingRow>
          <SettingRowTitle>{t('settings.artifacts.react.show_console', 'Show Console')}</SettingRowTitle>
          <Switch
            checked={safeSettings.react?.showConsole ?? false}
            onChange={handleShowConsoleChange}
            disabled={!isSandpackEnabled}
          />
        </SettingRow>
        <SettingHelpText>
          {t(
            'settings.artifacts.react.show_console_help',
            'Show the console output panel for debugging React artifacts.'
          )}
        </SettingHelpText>

        <SettingDivider />

        <SettingRow>
          <SettingRowTitle>{t('settings.artifacts.react.custom_bundler_url', 'Custom Bundler URL')}</SettingRowTitle>
        </SettingRow>
        <Input
          placeholder="https://your-sandpack-bundler.example.com"
          value={safeSettings.react?.customBundlerUrl || ''}
          onChange={handleCustomBundlerUrlChange}
          disabled={!isSandpackEnabled}
          style={{ marginTop: 8, marginBottom: 8 }}
        />
        <SettingHelpText>
          {t(
            'settings.artifacts.react.custom_bundler_url_help',
            'Optional: URL for a self-hosted Sandpack bundler. Leave empty to use the default CodeSandbox bundler.'
          )}
        </SettingHelpText>
      </SettingGroup>

      {/* Dependencies */}
      <SettingGroup theme={theme}>
        <SettingTitle>{t('settings.artifacts.react.dependencies_title', 'Available Dependencies')}</SettingTitle>
        <SettingDivider />

        <SettingHelpText style={{ marginBottom: 12 }}>
          {t(
            'settings.artifacts.react.dependencies_help',
            'NPM packages available for import in React artifacts. These are pre-loaded in Sandpack for instant use.'
          )}
        </SettingHelpText>

        <AddDependencyRow>
          <Input
            placeholder={t('settings.artifacts.react.dep_name_placeholder', 'Package name (e.g., framer-motion)')}
            value={newDepName}
            onChange={(e) => setNewDepName(e.target.value)}
            disabled={!isSandpackEnabled}
            style={{ flex: 1 }}
            onPressEnter={handleAddDependency}
          />
          <Input
            placeholder="latest"
            value={newDepVersion}
            onChange={(e) => setNewDepVersion(e.target.value)}
            disabled={!isSandpackEnabled}
            style={{ width: 100 }}
            onPressEnter={handleAddDependency}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddDependency}
            disabled={!isSandpackEnabled || !newDepName.trim()}>
            {t('settings.artifacts.react.add_dep', 'Add')}
          </Button>
        </AddDependencyRow>

        <Table
          columns={columns}
          dataSource={dependencyData}
          pagination={false}
          size="small"
          style={{ marginTop: 12 }}
          locale={{ emptyText: t('settings.artifacts.react.no_deps', 'No dependencies configured') }}
        />
      </SettingGroup>

      <SettingGroup theme={theme}>
        <SettingTitle>{t('settings.artifacts.storage_title', 'Storage')}</SettingTitle>
        <SettingDivider />

        <SettingRow>
          <SettingRowTitle>{t('settings.artifacts.storage_limit', 'Artifact Storage Limit')}</SettingRowTitle>
          <InputNumber
            min={10}
            max={1000}
            value={safeSettings.storageLimit}
            onChange={handleStorageLimitChange}
            disabled={!safeSettings.enabled}
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

const AddDependencyRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`

export default ArtifactSettings
