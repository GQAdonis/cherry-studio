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

import { DeleteOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons'
import { useTheme } from '@renderer/context/ThemeProvider'
import { ARTIFACT_STUDIO_AGENT_ID } from '@renderer/features/artifacts/services/ArtifactStudioRuntimeService'
import { AgentSettingsPopup } from '@renderer/pages/settings/AgentSettings'
import { useAppDispatch, useAppSelector } from '@renderer/store'
import {
  removeArtifactReactDependency,
  selectArtifactSettings,
  selectArtifactStudioSettings,
  setArtifactAutoOpen,
  setArtifactEnabled,
  setArtifactReactCustomBundlerUrl,
  setArtifactReactDependency,
  setArtifactReactShowConsole,
  setArtifactReactShowEditor,
  setArtifactReactUseSandpack,
  setArtifactRuntimeAllowCustomBundlerUrl,
  setArtifactRuntimeAllowDynamicDependencies,
  setArtifactRuntimeAllowExternalResources,
  setArtifactRuntimeProfile,
  setArtifactStorageLimit,
  setArtifactStudioDefaultContextManagement,
  setArtifactStudioDefaultKnowledge,
  setArtifactStudioDefaultLlm,
  setArtifactStudioDefaultSkills,
  setArtifactStudioOverridePolicy,
  setArtifactTypes
} from '@renderer/store/settings'
import { Button, Checkbox, Input, InputNumber, Segmented, Select, Space, Switch, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { FC } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import {
  SettingContainer,
  SettingDescription,
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
  { label: 'XHTML', value: 'xhtml' },
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
  const studioSettings = useAppSelector(selectArtifactStudioSettings)
  const providers = useAppSelector((state) => state.llm.providers)
  const appDefaultModel = useAppSelector((state) => state.llm.defaultModel)
  const knowledgeBases = useAppSelector((state) => state.knowledge.bases)

  // Default values if settings is undefined
  const safeSettings = settings || {
    enabled: true,
    autoOpen: false,
    enabledTypes: ['htmx', 'html', 'xhtml', 'react', 'svg', 'mermaid', 'markdown', 'code'],
    storageLimit: 100,
    runtime: {
      profile: 'standard',
      allowCustomBundlerUrl: true,
      allowDynamicDependencies: true,
      allowExternalResources: true
    },
    react: {
      useSandpack: true,
      showEditor: false,
      showConsole: false,
      customBundlerUrl: '',
      dependencies: {}
    },
    studio: {
      overridePolicy: {
        allowConversationOverride: true,
        allowProjectOverride: true
      },
      defaults: {
        llm: {
          modelId: undefined,
          temperature: 0.7,
          topP: 1,
          maxTokens: undefined,
          streamOutput: true
        },
        skills: {
          mode: 'inherit'
        },
        contextManagement: {
          type: 'sliding_window'
        },
        knowledge: {
          knowledgeBaseIds: [],
          autoCreateFromChatHistory: false
        }
      }
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

  const handleRuntimeProfileChange = (profile: string | number) => {
    dispatch(setArtifactRuntimeProfile(profile as 'basic' | 'standard' | 'advanced'))
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

  const isReactEnabled = safeSettings.enabled && safeSettings.enabledTypes.includes('react')
  const isSandpackEnabled = isReactEnabled && safeSettings.react?.useSandpack
  const runtimeProfile = safeSettings.runtime?.profile ?? 'standard'
  const allowCustomBundlerUrl = safeSettings.runtime?.allowCustomBundlerUrl ?? true
  const allowDynamicDependencies = safeSettings.runtime?.allowDynamicDependencies ?? true
  const allowExternalResources = safeSettings.runtime?.allowExternalResources ?? true
  const safeStudioSettings = studioSettings || safeSettings.studio
  const modelOptions = useMemo(
    () =>
      providers
        .filter((provider) => provider.enabled)
        .flatMap((provider) =>
          provider.models.map((model) => ({
            label: `${model.name || model.id} | ${provider.name}`,
            value: `${provider.id}::${model.id}`
          }))
        ),
    [providers]
  )
  const selectedModelValue = safeStudioSettings.defaults.llm.modelId
    ? `${safeStudioSettings.defaults.llm.providerId || ''}::${safeStudioSettings.defaults.llm.modelId}`
    : undefined
  const appDefaultModelValue =
    appDefaultModel?.provider && appDefaultModel?.id ? `${appDefaultModel.provider}::${appDefaultModel.id}` : undefined
  const appDefaultModelLabel =
    appDefaultModelValue && modelOptions.find((option) => option.value === appDefaultModelValue)?.label

  useEffect(() => {
    if (safeStudioSettings.defaults.llm.modelId) {
      return
    }

    const providerId = appDefaultModel?.provider
    const modelId = appDefaultModel?.id
    if (!providerId || !modelId) {
      return
    }

    const isSelectable = modelOptions.some((option) => option.value === `${providerId}::${modelId}`)
    if (!isSelectable) {
      return
    }

    dispatch(setArtifactStudioDefaultLlm({ providerId, modelId }))
  }, [appDefaultModel?.id, appDefaultModel?.provider, dispatch, modelOptions, safeStudioSettings.defaults.llm.modelId])

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
          disabled={!safeSettings.enabled || !safeSettings.react?.useSandpack || !allowDynamicDependencies}
        />
      )
    }
  ]

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

      <SettingGroup theme={theme}>
        <SettingTitle>{t('settings.artifacts.runtime.title', 'Runtime Profile')}</SettingTitle>
        <SettingDivider />

        <SettingRow>
          <SettingRowTitle>{t('settings.artifacts.runtime.profile', 'Capability Profile')}</SettingRowTitle>
        </SettingRow>
        <Segmented
          value={runtimeProfile}
          options={[
            { label: t('settings.artifacts.runtime.basic', 'Basic'), value: 'basic' },
            { label: t('settings.artifacts.runtime.standard', 'Standard'), value: 'standard' },
            { label: t('settings.artifacts.runtime.advanced', 'Advanced'), value: 'advanced' }
          ]}
          onChange={handleRuntimeProfileChange}
          disabled={!safeSettings.enabled}
          style={{ marginTop: 8 }}
        />
        <SettingHelpText>
          {t(
            'settings.artifacts.runtime.profile_help',
            'Basic locks runtime controls, Standard enables managed controls, and Advanced enables full runtime configuration.'
          )}
        </SettingHelpText>

        <SettingDivider />

        <SettingRow>
          <SettingRowTitle>
            {t('settings.artifacts.runtime.allow_dynamic_deps', 'Allow Dynamic Dependencies')}
          </SettingRowTitle>
          <Switch
            checked={allowDynamicDependencies}
            onChange={(checked) => dispatch(setArtifactRuntimeAllowDynamicDependencies(checked))}
            disabled={!safeSettings.enabled || runtimeProfile === 'basic'}
          />
        </SettingRow>
        <SettingRow>
          <SettingRowTitle>
            {t('settings.artifacts.runtime.allow_external_resources', 'Allow External Resources')}
          </SettingRowTitle>
          <Switch
            checked={allowExternalResources}
            onChange={(checked) => dispatch(setArtifactRuntimeAllowExternalResources(checked))}
            disabled={!safeSettings.enabled || runtimeProfile === 'basic'}
          />
        </SettingRow>
        <SettingRow>
          <SettingRowTitle>
            {t('settings.artifacts.runtime.allow_custom_bundler', 'Allow Custom Bundler URL')}
          </SettingRowTitle>
          <Switch
            checked={allowCustomBundlerUrl}
            onChange={(checked) => dispatch(setArtifactRuntimeAllowCustomBundlerUrl(checked))}
            disabled={!safeSettings.enabled || runtimeProfile !== 'advanced'}
          />
        </SettingRow>
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
          disabled={!isSandpackEnabled || runtimeProfile !== 'advanced' || !allowCustomBundlerUrl}
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
            disabled={!isSandpackEnabled || !allowDynamicDependencies}
            style={{ flex: 1 }}
            onPressEnter={handleAddDependency}
          />
          <Input
            placeholder="latest"
            value={newDepVersion}
            onChange={(e) => setNewDepVersion(e.target.value)}
            disabled={!isSandpackEnabled || !allowDynamicDependencies}
            style={{ width: 100 }}
            onPressEnter={handleAddDependency}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddDependency}
            disabled={!isSandpackEnabled || !allowDynamicDependencies || !newDepName.trim()}>
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
        <SettingTitle>{t('settings.artifacts.studio.title', 'Artifact Studio Governance')}</SettingTitle>
        <SettingDescription>
          {t(
            'settings.artifacts.studio.description',
            'Configure the built-in Artifact Studio agent defaults. These values seed new projects and runtime sessions.'
          )}
        </SettingDescription>
        <StudioHeaderActions>
          <Button
            icon={<SettingOutlined />}
            onClick={() => {
              void AgentSettingsPopup.show({ agentId: ARTIFACT_STUDIO_AGENT_ID, tab: 'essential' })
            }}>
            {t('settings.artifacts.studio.open_agent_settings', 'Open Artifact Agent Settings')}
          </Button>
        </StudioHeaderActions>
        <SettingDivider />
        <StudioSection>
          <StudioSectionTitle>{t('settings.artifacts.studio.override_policy', 'Override Policy')}</StudioSectionTitle>
          <StudioSectionDescription>
            {t(
              'settings.artifacts.studio.override_policy_desc',
              'Control whether conversation and project-level settings can override studio defaults.'
            )}
          </StudioSectionDescription>
          <StudioFields>
            <SettingRow>
              <SettingRowTitle>
                {t('settings.artifacts.studio.allow_conversation_override', 'Allow Conversation Overrides')}
              </SettingRowTitle>
              <Switch
                checked={safeStudioSettings.overridePolicy.allowConversationOverride}
                onChange={(checked) =>
                  dispatch(setArtifactStudioOverridePolicy({ allowConversationOverride: checked }))
                }
                disabled={!safeSettings.enabled}
              />
            </SettingRow>
            <SettingRow>
              <SettingRowTitle>
                {t('settings.artifacts.studio.allow_project_override', 'Allow Project Overrides')}
              </SettingRowTitle>
              <Switch
                checked={safeStudioSettings.overridePolicy.allowProjectOverride}
                onChange={(checked) => dispatch(setArtifactStudioOverridePolicy({ allowProjectOverride: checked }))}
                disabled={!safeSettings.enabled}
              />
            </SettingRow>
          </StudioFields>
        </StudioSection>

        <StudioSection>
          <StudioSectionTitle>
            {t('settings.artifacts.studio.model_and_generation', 'Model & Generation')}
          </StudioSectionTitle>
          <StudioSectionDescription>
            {t(
              'settings.artifacts.studio.model_and_generation_desc',
              'These defaults are used when the Artifact Studio agent or project context does not specify overrides.'
            )}
          </StudioSectionDescription>
          <StudioFields>
            <StudioField>
              <StudioFieldLabel>{t('settings.artifacts.studio.default_model', 'Default Model')}</StudioFieldLabel>
              <Select
                allowClear
                showSearch
                value={selectedModelValue}
                options={modelOptions}
                optionFilterProp="label"
                placeholder={t(
                  'settings.artifacts.studio.default_model_placeholder',
                  'Select a model for Artifact Studio'
                )}
                onChange={(value) => {
                  if (!value) {
                    dispatch(setArtifactStudioDefaultLlm({ modelId: undefined, providerId: undefined }))
                    return
                  }
                  const [providerId, modelId] = String(value).split('::')
                  dispatch(setArtifactStudioDefaultLlm({ modelId, providerId: providerId || undefined }))
                }}
                disabled={!safeSettings.enabled}
                style={{ width: '100%' }}
              />
              {!selectedModelValue && appDefaultModelLabel && (
                <SettingHelpText>
                  {t('settings.artifacts.studio.default_model_seeded_hint', 'Detected app default model')}:{' '}
                  {appDefaultModelLabel}
                </SettingHelpText>
              )}
            </StudioField>

            <StudioFieldGrid>
              <StudioField>
                <StudioFieldLabel>
                  {t('settings.artifacts.studio.default_temperature', 'Default Temperature')}
                </StudioFieldLabel>
                <InputNumber
                  min={0}
                  max={2}
                  step={0.1}
                  value={safeStudioSettings.defaults.llm.temperature}
                  onChange={(value) => dispatch(setArtifactStudioDefaultLlm({ temperature: value ?? undefined }))}
                  disabled={!safeSettings.enabled}
                  style={{ width: '100%' }}
                />
              </StudioField>
              <StudioField>
                <StudioFieldLabel>{t('settings.artifacts.studio.default_top_p', 'Default Top P')}</StudioFieldLabel>
                <InputNumber
                  min={0}
                  max={1}
                  step={0.05}
                  value={safeStudioSettings.defaults.llm.topP}
                  onChange={(value) => dispatch(setArtifactStudioDefaultLlm({ topP: value ?? undefined }))}
                  disabled={!safeSettings.enabled}
                  style={{ width: '100%' }}
                />
              </StudioField>
            </StudioFieldGrid>

            <StudioFieldGrid>
              <StudioField>
                <StudioFieldLabel>
                  {t('settings.artifacts.studio.default_max_tokens', 'Default Max Tokens')}
                </StudioFieldLabel>
                <InputNumber
                  min={1}
                  value={safeStudioSettings.defaults.llm.maxTokens}
                  onChange={(value) => dispatch(setArtifactStudioDefaultLlm({ maxTokens: value ?? undefined }))}
                  disabled={!safeSettings.enabled}
                  style={{ width: '100%' }}
                />
              </StudioField>
              <StudioToggleField>
                <SettingRowTitle>
                  {t('settings.artifacts.studio.default_stream_output', 'Default Stream Output')}
                </SettingRowTitle>
                <Switch
                  checked={safeStudioSettings.defaults.llm.streamOutput ?? true}
                  onChange={(checked) => dispatch(setArtifactStudioDefaultLlm({ streamOutput: checked }))}
                  disabled={!safeSettings.enabled}
                />
              </StudioToggleField>
            </StudioFieldGrid>
          </StudioFields>
        </StudioSection>

        <StudioSection>
          <StudioSectionTitle>{t('settings.artifacts.studio.skills_section', 'Skills')}</StudioSectionTitle>
          <StudioFields>
            <StudioFieldGrid>
              <StudioField>
                <StudioFieldLabel>
                  {t('settings.artifacts.studio.default_skill_mode', 'Default Skill Mode')}
                </StudioFieldLabel>
                <Select
                  value={safeStudioSettings.defaults.skills.mode}
                  onChange={(mode) =>
                    dispatch(
                      setArtifactStudioDefaultSkills({
                        ...safeStudioSettings.defaults.skills,
                        mode
                      })
                    )
                  }
                  options={[
                    { label: 'Inherit', value: 'inherit' },
                    { label: 'All', value: 'all' },
                    { label: 'Selected', value: 'selected' },
                    { label: 'None', value: 'none' }
                  ]}
                  disabled={!safeSettings.enabled}
                  style={{ width: '100%' }}
                />
              </StudioField>
              <StudioField>
                <StudioFieldLabel>
                  {t('settings.artifacts.studio.default_skill_strategy', 'Default Skill Strategy')}
                </StudioFieldLabel>
                <Select
                  allowClear
                  value={safeStudioSettings.defaults.skills.strategy}
                  onChange={(strategy) =>
                    dispatch(
                      setArtifactStudioDefaultSkills({
                        ...safeStudioSettings.defaults.skills,
                        strategy
                      })
                    )
                  }
                  options={[
                    { label: 'Hybrid', value: 'hybrid' },
                    { label: 'Keyword', value: 'keyword' },
                    { label: 'Embedding', value: 'embedding' },
                    { label: 'Local Embedding', value: 'local-embedding' },
                    { label: 'LLM', value: 'llm' },
                    { label: 'None', value: 'none' }
                  ]}
                  disabled={!safeSettings.enabled}
                  style={{ width: '100%' }}
                />
              </StudioField>
            </StudioFieldGrid>
          </StudioFields>
        </StudioSection>

        <StudioSection>
          <StudioSectionTitle>{t('settings.artifacts.studio.context_section', 'Context')}</StudioSectionTitle>
          <StudioFields>
            <StudioField>
              <StudioFieldLabel>
                {t('settings.artifacts.studio.default_context_strategy', 'Default Context Strategy')}
              </StudioFieldLabel>
              <Select
                value={safeStudioSettings.defaults.contextManagement.type}
                onChange={(type) =>
                  dispatch(
                    setArtifactStudioDefaultContextManagement({
                      ...safeStudioSettings.defaults.contextManagement,
                      type
                    })
                  )
                }
                options={[
                  { label: 'Sliding Window', value: 'sliding_window' },
                  { label: 'Summarize', value: 'summarize' },
                  { label: 'Hierarchical', value: 'hierarchical' },
                  { label: 'Truncate Middle', value: 'truncate_middle' },
                  { label: 'None', value: 'none' }
                ]}
                disabled={!safeSettings.enabled}
                style={{ width: '100%' }}
              />
            </StudioField>
          </StudioFields>
        </StudioSection>

        <StudioSection>
          <StudioSectionTitle>{t('settings.artifacts.studio.knowledge_section', 'Knowledge')}</StudioSectionTitle>
          <StudioFields>
            <StudioField>
              <StudioFieldLabel>
                {t('settings.artifacts.studio.default_knowledge_bases', 'Default Knowledge Bases')}
              </StudioFieldLabel>
              <Select
                mode="multiple"
                value={safeStudioSettings.defaults.knowledge.knowledgeBaseIds}
                options={knowledgeBases.map((base) => ({ label: base.name, value: base.id }))}
                onChange={(knowledgeBaseIds) => dispatch(setArtifactStudioDefaultKnowledge({ knowledgeBaseIds }))}
                disabled={!safeSettings.enabled}
                style={{ width: '100%' }}
              />
            </StudioField>
            <SettingRow>
              <SettingRowTitle>
                {t(
                  'settings.artifacts.studio.auto_create_knowledge_bridge',
                  'Auto-create knowledge bridge from source chat'
                )}
              </SettingRowTitle>
              <Switch
                checked={safeStudioSettings.defaults.knowledge.autoCreateFromChatHistory}
                onChange={(checked) =>
                  dispatch(setArtifactStudioDefaultKnowledge({ autoCreateFromChatHistory: checked }))
                }
                disabled={!safeSettings.enabled}
              />
            </SettingRow>
          </StudioFields>
        </StudioSection>
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

const StudioHeaderActions = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
`

const StudioSection = styled.div`
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 12px;
  background: var(--color-background);
`

const StudioSectionTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-1);
`

const StudioSectionDescription = styled.div`
  font-size: 12px;
  color: var(--color-text-2);
  margin-top: 6px;
`

const StudioFields = styled.div`
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const StudioField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const StudioFieldLabel = styled.div`
  font-size: 13px;
  color: var(--color-text-1);
  font-weight: 500;
`

const StudioFieldGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`

const StudioToggleField = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 9px 12px;
  min-height: 42px;
`

export default ArtifactSettings
