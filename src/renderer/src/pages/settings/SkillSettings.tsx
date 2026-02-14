import { CopyOutlined, DatabaseOutlined, FolderOutlined, GlobalOutlined, PlusOutlined } from '@ant-design/icons'
import type {
  Skill,
  SkillMatchingConfig,
  SkillMatchingStrategy,
  SkillStorageProviderConfig,
  SkillStorageType
} from '@types'
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  message,
  Modal,
  Select,
  Slider,
  Switch,
  Tag,
  Tooltip,
  Typography
} from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import {
  SettingContainer,
  SettingDescription,
  SettingDivider,
  SettingGroup,
  SettingRow,
  SettingRowTitle,
  SettingTitle
} from '.'

const { Title, Text, Paragraph } = Typography

const DEFAULT_MATCHING_CONFIG: SkillMatchingConfig = {
  strategy: 'none',
  threshold: 0.5,
  maxMatched: 3,
  minSkillsForMatching: 3
}

const STRATEGY_OPTIONS: { value: SkillMatchingStrategy; label: string; description: string }[] = [
  { value: 'none', label: 'None (Inject All)', description: 'Inject all enabled skills into every request' },
  {
    value: 'keyword',
    label: 'Keyword',
    description: 'Fast regex + TF-IDF matching. No API calls, zero latency.'
  },
  {
    value: 'embedding',
    label: 'Embedding (API)',
    description: 'Semantic matching via embedding API (OpenAI, Ollama, etc.)'
  },
  {
    value: 'local-embedding',
    label: 'Local Embedding',
    description: 'Offline semantic matching using local ONNX model (~23MB)'
  },
  {
    value: 'llm',
    label: 'LLM Classification',
    description: 'Most accurate. Uses LLM structured output for classification.'
  },
  {
    value: 'hybrid',
    label: 'Hybrid (Recommended)',
    description: 'Embedding for fast matches, LLM fallback for ambiguous queries.'
  }
]

const STORAGE_TYPE_OPTIONS: { value: SkillStorageType; label: string; icon: React.ReactNode }[] = [
  { value: 'filesystem', label: 'Filesystem Directory', icon: <FolderOutlined /> },
  { value: 'sqlite', label: 'Local Database (SQLite)', icon: <DatabaseOutlined /> },
  { value: 'postgres', label: 'PostgreSQL / Supabase', icon: <DatabaseOutlined /> },
  { value: 'ipfs', label: 'IPFS', icon: <GlobalOutlined /> }
]

export default function SkillSettings() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(false)
  const [matchingConfig, setMatchingConfig] = useState<SkillMatchingConfig>(DEFAULT_MATCHING_CONFIG)
  const [initializingMatcher, setInitializingMatcher] = useState(false)

  // Storage providers
  const [providers, setProviders] = useState<SkillStorageProviderConfig[]>([])
  const [providerModalVisible, setProviderModalVisible] = useState(false)
  const [editingProvider, setEditingProvider] = useState<SkillStorageProviderConfig | null>(null)
  const [providerForm] = Form.useForm()
  const [testingConnection, setTestingConnection] = useState(false)
  const [filterProviderId, setFilterProviderId] = useState<string | null>(null)

  const fetchSkills = useCallback(async () => {
    setLoading(true)
    try {
      const list = await (window.api as any).invoke('skill:get-list')
      setSkills(list)
    } catch (error) {
      message.error('Failed to load skills')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMatchingConfig = useCallback(async () => {
    try {
      const config = await (window.api as any).invoke('skill:get-matching-config')
      if (config) {
        setMatchingConfig({ ...DEFAULT_MATCHING_CONFIG, ...config })
      }
    } catch {
      // Use defaults
    }
  }, [])

  const fetchProviders = useCallback(async () => {
    try {
      const list = await (window.api as any).invoke('skill-storage:get-providers')
      setProviders(list ?? [])
    } catch {
      // Ignore
    }
  }, [])

  useEffect(() => {
    fetchSkills()
    fetchMatchingConfig()
    fetchProviders()
  }, [fetchSkills, fetchMatchingConfig, fetchProviders])

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await (window.api as any).invoke('skill:toggle', id, enabled)
      setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, enabled } : s)))
      message.success(enabled ? 'Skill enabled' : 'Skill disabled')
    } catch (error) {
      message.error('Failed to toggle skill')
    }
  }

  const handleRefresh = async () => {
    await fetchSkills()
    message.success('Skills refreshed')
  }

  const updateMatchingConfig = async (updates: Partial<SkillMatchingConfig>) => {
    const updated = { ...matchingConfig, ...updates }
    setMatchingConfig(updated)
    try {
      await (window.api as any).invoke('skill:set-matching-config', updates)
    } catch {
      message.error('Failed to save matching configuration')
    }
  }

  const handleInitializeMatching = async () => {
    setInitializingMatcher(true)
    try {
      await (window.api as any).invoke('skill:initialize-matching')
      message.success('Skill matching provider initialized')
    } catch (error) {
      message.error('Failed to initialize matching provider')
    } finally {
      setInitializingMatcher(false)
    }
  }

  const handleCopyInstructions = (skill: Skill) => {
    navigator.clipboard.writeText(skill.instructions)
    message.success(`Copied "${skill.name}" instructions to clipboard`)
  }

  // ── Storage Provider Management ──────────────────────────────────────

  const openProviderModal = (provider?: SkillStorageProviderConfig) => {
    setEditingProvider(provider ?? null)
    if (provider) {
      providerForm.setFieldsValue({
        name: provider.name,
        type: provider.type,
        enabled: provider.enabled,
        'filesystem.directoryPath': provider.filesystem?.directoryPath,
        'ipfs.gatewayUrl': provider.ipfs?.gatewayUrl,
        'ipfs.apiUrl': provider.ipfs?.apiUrl,
        'ipfs.pinningKey': provider.ipfs?.pinningKey,
        'postgres.mode': provider.postgres?.mode,
        'postgres.dsn': provider.postgres?.dsn,
        'postgres.supabaseUrl': provider.postgres?.supabaseUrl,
        'postgres.supabaseAnonKey': provider.postgres?.supabaseAnonKey,
        'postgres.supabaseServiceKey': provider.postgres?.supabaseServiceKey
      })
    } else {
      providerForm.resetFields()
      providerForm.setFieldsValue({ type: 'filesystem', enabled: true })
    }
    setProviderModalVisible(true)
  }

  const handleSaveProvider = async () => {
    try {
      const values = await providerForm.validateFields()
      const type = values.type as SkillStorageType

      const config: Omit<SkillStorageProviderConfig, 'id'> & { id?: string } = {
        name: values.name,
        type,
        enabled: values.enabled ?? true
      }

      if (type === 'filesystem') {
        config.filesystem = { directoryPath: values['filesystem.directoryPath'] }
      } else if (type === 'ipfs') {
        config.ipfs = {
          gatewayUrl: values['ipfs.gatewayUrl'],
          apiUrl: values['ipfs.apiUrl'],
          pinningKey: values['ipfs.pinningKey']
        }
      } else if (type === 'postgres') {
        config.postgres = {
          mode: values['postgres.mode'],
          dsn: values['postgres.dsn'],
          supabaseUrl: values['postgres.supabaseUrl'],
          supabaseAnonKey: values['postgres.supabaseAnonKey'],
          supabaseServiceKey: values['postgres.supabaseServiceKey']
        }
      } else if (type === 'sqlite') {
        config.sqlite = { useDefault: true }
      }

      if (editingProvider) {
        await (window.api as any).invoke('skill-storage:update-provider', editingProvider.id, config)
        message.success('Provider updated')
      } else {
        await (window.api as any).invoke('skill-storage:add-provider', config)
        message.success('Provider added')
      }

      setProviderModalVisible(false)
      await fetchProviders()
      await fetchSkills()
    } catch (error) {
      message.error('Failed to save provider')
    }
  }

  const handleRemoveProvider = async (id: string) => {
    try {
      await (window.api as any).invoke('skill-storage:remove-provider', id)
      message.success('Provider removed')
      await fetchProviders()
      await fetchSkills()
    } catch (error) {
      message.error((error as Error).message || 'Failed to remove provider')
    }
  }

  const handleTestConnection = async () => {
    setTestingConnection(true)
    try {
      const values = await providerForm.validateFields()
      const type = values.type as SkillStorageType
      const config: SkillStorageProviderConfig = {
        id: 'test',
        name: values.name,
        type,
        enabled: true,
        filesystem: type === 'filesystem' ? { directoryPath: values['filesystem.directoryPath'] } : undefined,
        ipfs:
          type === 'ipfs'
            ? {
                gatewayUrl: values['ipfs.gatewayUrl'],
                apiUrl: values['ipfs.apiUrl'],
                pinningKey: values['ipfs.pinningKey']
              }
            : undefined,
        postgres:
          type === 'postgres'
            ? {
                mode: values['postgres.mode'],
                dsn: values['postgres.dsn'],
                supabaseUrl: values['postgres.supabaseUrl'],
                supabaseAnonKey: values['postgres.supabaseAnonKey'],
                supabaseServiceKey: values['postgres.supabaseServiceKey']
              }
            : undefined,
        sqlite: type === 'sqlite' ? { useDefault: true } : undefined
      }

      await (window.api as any).invoke('skill-storage:test-connection', config)
      message.success('Connection successful!')
    } catch (error) {
      message.error('Connection failed: ' + ((error as Error).message || 'Unknown error'))
    } finally {
      setTestingConnection(false)
    }
  }

  const handleSelectDirectory = async () => {
    const dir = await (window.api as any).invoke('skill-storage:select-directory')
    if (dir) {
      providerForm.setFieldsValue({ 'filesystem.directoryPath': dir })
    }
  }

  const currentType = Form.useWatch('type', providerForm)

  const enabledCount = skills.filter((s) => s.enabled).length
  const filteredSkills = filterProviderId ? skills.filter((s) => s.providerId === filterProviderId) : skills

  return (
    <SettingContainer>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <SettingTitle>{t('settings.tool.skills.title', 'Skills Library')}</SettingTitle>
          <SettingDescription>
            {t('settings.tool.skills.description', 'Manage local skills to extend agent capabilities')}
          </SettingDescription>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/settings/skills/create')}>
            {t('settings.tool.skills.createSkill', 'Create Skill')}
          </Button>
          <Button onClick={handleRefresh} loading={loading}>
            {t('common.refresh', 'Refresh')}
          </Button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 0 24px' }}>
        {/* Storage Providers Section */}
        <SettingGroup style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Title level={5} style={{ margin: 0 }}>
              {t('settings.tool.skills.storage.title', 'Storage Providers')}
            </Title>
            <Button size="small" icon={<PlusOutlined />} onClick={() => openProviderModal()}>
              {t('settings.tool.skills.storage.addProvider', 'Add Provider')}
            </Button>
          </div>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
            {t(
              'settings.tool.skills.storage.description',
              'Configure where skills are stored. Skills can be spread across multiple providers for sharing and backup.'
            )}
          </Text>

          {providers.length === 0 ? (
            <Empty
              description={t('settings.tool.skills.storage.noProviders', 'No storage providers configured')}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {providers.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-background)'
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {STORAGE_TYPE_OPTIONS.find((o) => o.value === p.type)?.icon}
                    <Text strong>{p.name}</Text>
                    <Tag color={p.enabled ? 'success' : 'default'}>{p.enabled ? 'Active' : 'Disabled'}</Tag>
                    <Tag>{p.type}</Tag>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Button type="text" size="small" onClick={() => openProviderModal(p)}>
                      {t('common.edit', 'Edit')}
                    </Button>
                    {p.id !== 'local-skills-default' && (
                      <Button type="text" size="small" danger onClick={() => handleRemoveProvider(p.id)}>
                        {t('common.delete', 'Delete')}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SettingGroup>

        {/* Skill Matching Configuration */}
        <SettingGroup style={{ marginBottom: 20 }}>
          <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
            {t('settings.tool.skills.matching.title', 'Skill Matching')}
          </Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 12 }}>
            {t(
              'settings.tool.skills.matching.description',
              'Configure how skills are matched to user queries. Intelligent matching reduces token usage by only injecting relevant skills.'
            )}
          </Text>

          <SettingRow style={{ marginBottom: 16 }}>
            <SettingRowTitle>{t('settings.tool.skills.matching.strategy', 'Strategy')}</SettingRowTitle>
            <Select
              value={matchingConfig.strategy}
              onChange={(value) => updateMatchingConfig({ strategy: value })}
              style={{ width: 220 }}
              options={STRATEGY_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label
              }))}
            />
          </SettingRow>

          {matchingConfig.strategy !== 'none' && (
            <>
              <Text type="secondary" style={{ display: 'block', fontSize: 11, marginBottom: 12 }}>
                {STRATEGY_OPTIONS.find((o) => o.value === matchingConfig.strategy)?.description}
              </Text>

              <SettingRow style={{ marginBottom: 12 }}>
                <SettingRowTitle>
                  {t('settings.tool.skills.matching.threshold', 'Confidence Threshold')}
                </SettingRowTitle>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: 220 }}>
                  <Slider
                    min={0.1}
                    max={0.95}
                    step={0.05}
                    value={matchingConfig.threshold}
                    onChange={(value) => updateMatchingConfig({ threshold: value })}
                    style={{ flex: 1 }}
                  />
                  <Text style={{ minWidth: 36, textAlign: 'right', fontSize: 12 }}>
                    {matchingConfig.threshold.toFixed(2)}
                  </Text>
                </div>
              </SettingRow>

              <SettingRow style={{ marginBottom: 12 }}>
                <SettingRowTitle>{t('settings.tool.skills.matching.maxMatched', 'Max Matched Skills')}</SettingRowTitle>
                <InputNumber
                  min={1}
                  max={10}
                  value={matchingConfig.maxMatched}
                  onChange={(value) => value !== null && updateMatchingConfig({ maxMatched: value })}
                  style={{ width: 80 }}
                />
              </SettingRow>

              <SettingRow style={{ marginBottom: 12 }}>
                <SettingRowTitle>
                  {t('settings.tool.skills.matching.minSkillsForMatching', 'Min Skills for Matching')}
                </SettingRowTitle>
                <InputNumber
                  min={1}
                  max={20}
                  value={matchingConfig.minSkillsForMatching}
                  onChange={(value) => value !== null && updateMatchingConfig({ minSkillsForMatching: value })}
                  style={{ width: 80 }}
                />
              </SettingRow>

              <div style={{ marginTop: 16 }}>
                <Button type="primary" onClick={handleInitializeMatching} loading={initializingMatcher}>
                  {t('settings.tool.skills.matching.initialize', 'Initialize / Rebuild Index')}
                </Button>
                <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 4 }}>
                  {t(
                    'settings.tool.skills.matching.initializeHint',
                    'Required after changing strategy or when skills are updated. Pre-computes embeddings for fast matching.'
                  )}
                </Text>
              </div>
            </>
          )}
        </SettingGroup>

        {/* Skills Status & Filter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            {enabledCount > 0 && (
              <Tag color="blue">
                {enabledCount} {enabledCount === 1 ? 'skill' : 'skills'} enabled
              </Tag>
            )}
            {matchingConfig.strategy !== 'none' && enabledCount >= matchingConfig.minSkillsForMatching && (
              <Tag color="green">Matching active</Tag>
            )}
          </div>
          {providers.length > 1 && (
            <Select
              allowClear
              placeholder={t('settings.tool.skills.filterByProvider', 'Filter by provider')}
              style={{ width: 180 }}
              value={filterProviderId}
              onChange={(val) => setFilterProviderId(val ?? null)}
              options={[...providers.map((p) => ({ value: p.id, label: p.name }))]}
            />
          )}
        </div>

        <SettingDivider />

        {/* Skills List */}
        <List
          grid={{ gutter: 16, column: 1 }}
          dataSource={filteredSkills}
          loading={loading}
          locale={{ emptyText: <Empty description={t('settings.tool.skills.empty', 'No skills found')} /> }}
          renderItem={(skill) => (
            <List.Item>
              <Card
                hoverable
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'inherit' }}>{skill.name}</span>
                    {skill.enabled && <Tag color="success">Active</Tag>}
                    {skill.providerName && (
                      <Tag color="processing" style={{ fontSize: 10 }}>
                        {skill.providerName}
                      </Tag>
                    )}
                  </div>
                }
                extra={
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Tooltip title="Copy instructions to clipboard">
                      <Button
                        type="text"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => handleCopyInstructions(skill)}
                      />
                    </Tooltip>
                    <Switch
                      checked={skill.enabled}
                      onChange={(checked) => handleToggle(skill.id, checked)}
                      checkedChildren="On"
                      unCheckedChildren="Off"
                    />
                  </div>
                }>
                {skill.path && (
                  <div style={{ marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      {skill.path}
                    </Text>
                  </div>
                )}
                <Paragraph
                  ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}
                  style={{ color: 'var(--color-text)' }}>
                  {skill.description || 'No description provided.'}
                </Paragraph>

                {skill.instructions && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong style={{ fontSize: 12, color: 'var(--color-text)' }}>
                        Instructions:
                      </Text>
                    </div>
                    <pre
                      style={{
                        fontSize: 11,
                        padding: 8,
                        background: 'var(--color-background-soft)',
                        borderRadius: 4,
                        maxHeight: 150,
                        overflow: 'auto',
                        marginTop: 4,
                        color: 'var(--color-text)',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}>
                      {skill.instructions}
                    </pre>
                  </div>
                )}

                {skill.tools && skill.tools.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <Text strong style={{ fontSize: 12, color: 'var(--color-text)' }}>
                      Tools:{' '}
                    </Text>
                    {skill.tools.map((tool) => (
                      <Tag key={tool} style={{ fontSize: 10 }}>
                        {tool}
                      </Tag>
                    ))}
                  </div>
                )}

                {skill.allowedTools && skill.allowedTools.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Text strong style={{ fontSize: 12, color: 'var(--color-text)' }}>
                      Allowed Tools:{' '}
                    </Text>
                    {skill.allowedTools.map((tool) => (
                      <Tag key={tool} color="purple" style={{ fontSize: 10 }}>
                        {tool}
                      </Tag>
                    ))}
                  </div>
                )}

                {skill.tags && skill.tags.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Text strong style={{ fontSize: 12, color: 'var(--color-text)' }}>
                      Tags:{' '}
                    </Text>
                    {skill.tags.map((tag) => (
                      <Tag key={tag} color="processing" style={{ fontSize: 10 }}>
                        {tag}
                      </Tag>
                    ))}
                  </div>
                )}

                {skill.examples && skill.examples.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Text strong style={{ fontSize: 12, color: 'var(--color-text)' }}>
                      Examples:{' '}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                      {skill.examples.slice(0, 3).join(' | ')}
                      {skill.examples.length > 3 && ` (+${skill.examples.length - 3} more)`}
                    </Text>
                  </div>
                )}
              </Card>
            </List.Item>
          )}
        />
      </div>

      {/* Provider Add/Edit Modal */}
      <Modal
        title={
          editingProvider
            ? t('settings.tool.skills.storage.editProvider', 'Edit Provider')
            : t('settings.tool.skills.storage.addProvider', 'Add Provider')
        }
        open={providerModalVisible}
        onCancel={() => setProviderModalVisible(false)}
        onOk={handleSaveProvider}
        width={520}
        footer={[
          <Button key="test" onClick={handleTestConnection} loading={testingConnection}>
            {t('settings.tool.skills.storage.testConnection', 'Test Connection')}
          </Button>,
          <Button key="cancel" onClick={() => setProviderModalVisible(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>,
          <Button key="save" type="primary" onClick={handleSaveProvider}>
            {t('common.save', 'Save')}
          </Button>
        ]}>
        <Form form={providerForm} layout="vertical">
          <Form.Item
            name="name"
            label={t('settings.tool.skills.storage.providerName', 'Name')}
            rules={[{ required: true }]}>
            <Input placeholder="My Skills Storage" />
          </Form.Item>

          <Form.Item
            name="type"
            label={t('settings.tool.skills.storage.providerType', 'Type')}
            rules={[{ required: true }]}>
            <Select options={STORAGE_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
          </Form.Item>

          <Form.Item
            name="enabled"
            label={t('settings.tool.skills.storage.enabled', 'Enabled')}
            valuePropName="checked">
            <Switch />
          </Form.Item>

          {/* Filesystem config */}
          {currentType === 'filesystem' && (
            <Form.Item
              name="filesystem.directoryPath"
              label={t('settings.tool.skills.storage.directoryPath', 'Directory Path')}
              rules={[{ required: true }]}>
              <Input
                placeholder="/path/to/skills"
                addonAfter={
                  <Button type="text" size="small" onClick={handleSelectDirectory}>
                    {t('settings.tool.skills.storage.browse', 'Browse')}
                  </Button>
                }
              />
            </Form.Item>
          )}

          {/* IPFS config */}
          {currentType === 'ipfs' && (
            <>
              <Form.Item
                name="ipfs.gatewayUrl"
                label={t('settings.tool.skills.storage.ipfsGateway', 'Gateway URL')}
                rules={[{ required: true }]}>
                <Input placeholder="http://localhost:8080" />
              </Form.Item>
              <Form.Item
                name="ipfs.apiUrl"
                label={t('settings.tool.skills.storage.ipfsApi', 'API URL')}
                rules={[{ required: true }]}>
                <Input placeholder="http://localhost:5001" />
              </Form.Item>
              <Form.Item name="ipfs.pinningKey" label={t('settings.tool.skills.storage.ipfsPinningKey', 'Pinning Key')}>
                <Input.Password placeholder="Optional" />
              </Form.Item>
            </>
          )}

          {/* Postgres config */}
          {currentType === 'postgres' && (
            <>
              <Form.Item
                name="postgres.mode"
                label={t('settings.tool.skills.storage.postgresMode', 'Connection Mode')}
                rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'dsn', label: 'Connection String (DSN)' },
                    { value: 'supabase', label: 'Supabase' }
                  ]}
                />
              </Form.Item>

              <Form.Item noStyle shouldUpdate={(prev, cur) => prev['postgres.mode'] !== cur['postgres.mode']}>
                {({ getFieldValue }) =>
                  getFieldValue('postgres.mode') === 'dsn' ? (
                    <Form.Item
                      name="postgres.dsn"
                      label={t('settings.tool.skills.storage.postgresDsn', 'Connection String')}
                      rules={[{ required: true }]}>
                      <Input.Password placeholder="postgresql://user:pass@host:5432/db" />
                    </Form.Item>
                  ) : (
                    <>
                      <Form.Item
                        name="postgres.supabaseUrl"
                        label={t('settings.tool.skills.storage.supabaseUrl', 'Supabase URL')}
                        rules={[{ required: true }]}>
                        <Input placeholder="https://xxx.supabase.co" />
                      </Form.Item>
                      <Form.Item
                        name="postgres.supabaseAnonKey"
                        label={t('settings.tool.skills.storage.supabaseAnonKey', 'Anon Key')}
                        rules={[{ required: true }]}>
                        <Input.Password placeholder="eyJ..." />
                      </Form.Item>
                      <Form.Item
                        name="postgres.supabaseServiceKey"
                        label={t('settings.tool.skills.storage.supabaseServiceKey', 'Service Key (for migrations)')}>
                        <Input.Password placeholder="eyJ... (optional, for running migrations)" />
                      </Form.Item>
                    </>
                  )
                }
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </SettingContainer>
  )
}
