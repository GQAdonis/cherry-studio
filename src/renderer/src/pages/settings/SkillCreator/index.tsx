import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import type { SkillAssetEntry, SkillReference, SkillScript, SkillStorageProviderConfig } from '@types'
import { Button, message, Modal, Select, Tag, Typography } from 'antd'
import { type FC, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import FrontmatterForm from './FrontmatterForm'
import ResourcesPanel from './ResourcesPanel'
import SkillBodyEditor from './SkillBodyEditor'

const { Text, Title } = Typography

interface SkillFormData {
  name: string
  description: string
  instructions: string
  license?: string
  compatibility?: string
  allowedTools?: string[]
  tools?: string[]
  examples?: string[]
  tags?: string[]
  triggerPatterns?: string[]
  scripts: SkillScript[]
  references: SkillReference[]
  assets: SkillAssetEntry[]
}

const INITIAL_FORM: SkillFormData = {
  name: '',
  description: '',
  instructions: '',
  license: '',
  compatibility: '',
  allowedTools: [],
  tools: [],
  examples: [],
  tags: [],
  triggerPatterns: [],
  scripts: [],
  references: [],
  assets: []
}

interface ValidationResult {
  valid: boolean
  errors: Array<{ field: string; message: string }>
  warnings: Array<{ field: string; message: string }>
}

const SkillCreator: FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [formData, setFormData] = useState<SkillFormData>(INITIAL_FORM)
  const [validation, setValidation] = useState<ValidationResult>({ valid: true, errors: [], warnings: [] })
  const [providers, setProviders] = useState<SkillStorageProviderConfig[]>([])
  const [saveModalVisible, setSaveModalVisible] = useState(false)
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Fetch providers for save destination
  const fetchProviders = useCallback(async () => {
    try {
      const list = await (window.api as any).invoke('skill-storage:get-providers')
      const active = (list ?? []).filter((p: SkillStorageProviderConfig) => p.enabled)
      setProviders(active)
      if (active.length > 0 && !selectedProviderId) {
        setSelectedProviderId(active[0].id)
      }
    } catch {
      // Ignore
    }
  }, [selectedProviderId])

  useEffect(() => {
    fetchProviders()
  }, [fetchProviders])

  const updateFormData = useCallback((updates: Partial<SkillFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }, [])

  // Live validation
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!formData.name && !formData.description) return
      try {
        const result = await (window.api as any).invoke('skill-creator:validate', {
          id: formData.name,
          name: formData.name,
          description: formData.description,
          instructions: formData.instructions,
          compatibility: formData.compatibility,
          metadata: undefined
        })
        setValidation(result)
      } catch {
        // Ignore
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [formData.name, formData.description, formData.instructions, formData.compatibility])

  // Generate SKILL.md preview
  const skillMdPreview = useMemo(() => {
    const fm: string[] = ['---']
    fm.push(`name: ${formData.name || 'my-skill'}`)
    fm.push(`description: ${formData.description || 'Description here'}`)
    if (formData.license) fm.push(`license: ${formData.license}`)
    if (formData.compatibility) fm.push(`compatibility: ${formData.compatibility}`)
    if (formData.allowedTools?.length) fm.push(`allowed-tools: ${formData.allowedTools.join(' ')}`)
    if (formData.tags?.length) {
      fm.push('tags:')
      formData.tags.forEach((tag) => fm.push(`  - ${tag}`))
    }
    if (formData.examples?.length) {
      fm.push('examples:')
      formData.examples.forEach((ex) => fm.push(`  - "${ex}"`))
    }
    fm.push('---')
    fm.push('')
    fm.push(formData.instructions || '# Instructions here')
    return fm.join('\n')
  }, [formData])

  const handleSave = async () => {
    if (!selectedProviderId) {
      message.error('Please select a storage provider')
      return
    }

    // Validate first
    try {
      const result = await (window.api as any).invoke('skill-creator:validate', {
        id: formData.name,
        name: formData.name,
        description: formData.description,
        instructions: formData.instructions,
        compatibility: formData.compatibility
      })

      if (!result.valid) {
        message.error(`Validation failed: ${result.errors.map((e: any) => e.message).join(', ')}`)
        return
      }
    } catch {
      // Continue even if validation IPC fails
    }

    setSaving(true)
    try {
      const skillRecord = {
        id: formData.name,
        name: formData.name,
        description: formData.description,
        instructions: formData.instructions,
        tools: formData.tools,
        examples: formData.examples,
        tags: formData.tags,
        triggerPatterns: formData.triggerPatterns,
        license: formData.license || undefined,
        compatibility: formData.compatibility || undefined,
        allowedTools: formData.allowedTools,
        scripts: formData.scripts.length ? formData.scripts : undefined,
        references: formData.references.length ? formData.references : undefined,
        assets: formData.assets.length ? formData.assets : undefined
      }

      await (window.api as any).invoke('skill-creator:save-to-provider', selectedProviderId, skillRecord)
      message.success(`Skill "${formData.name}" saved successfully!`)
      setSaveModalVisible(false)
      navigate('/settings/skills')
    } catch (error) {
      message.error('Failed to save skill: ' + ((error as Error).message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const handleLoadTemplate = async () => {
    try {
      const template = await (window.api as any).invoke('skill-creator:init-template', formData.name || 'new-skill')
      updateFormData({
        name: template.name,
        description: template.description,
        instructions: template.instructions
      })
      message.success('Template loaded')
    } catch {
      message.error('Failed to load template')
    }
  }

  return (
    <Container>
      {/* Header */}
      <Header>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/settings/skills')} />
          <Title level={4} style={{ margin: 0 }}>
            {t('settings.tool.skills.creator.title', 'Create New Skill')}
          </Title>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!validation.valid && (
            <Tag color="error">
              {validation.errors.length} error{validation.errors.length !== 1 ? 's' : ''}
            </Tag>
          )}
          {validation.warnings.length > 0 && (
            <Tag color="warning">
              {validation.warnings.length} warning{validation.warnings.length !== 1 ? 's' : ''}
            </Tag>
          )}
          <Button onClick={handleLoadTemplate}>
            {t('settings.tool.skills.creator.loadTemplate', 'Load Template')}
          </Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={() => setSaveModalVisible(true)}>
            {t('settings.tool.skills.creator.save', 'Save Skill')}
          </Button>
        </div>
      </Header>

      {/* Main Content - Two Panel Layout */}
      <Content>
        {/* Left Panel - Frontmatter + Body Editor */}
        <LeftPanel>
          <PanelSection>
            <Title level={5} style={{ marginTop: 0 }}>
              {t('settings.tool.skills.creator.frontmatter', 'Frontmatter')}
            </Title>
            <FrontmatterForm formData={formData} onChange={updateFormData} validationErrors={validation.errors} />
          </PanelSection>

          <PanelSection style={{ flex: 1 }}>
            <SkillBodyEditor value={formData.instructions} onChange={(val) => updateFormData({ instructions: val })} />
          </PanelSection>
        </LeftPanel>

        {/* Right Panel - Resources + Preview */}
        <RightPanel>
          <PanelSection>
            <Title level={5} style={{ marginTop: 0 }}>
              {t('settings.tool.skills.creator.resources', 'Bundled Resources')}
            </Title>
            <ResourcesPanel
              scripts={formData.scripts}
              references={formData.references}
              assets={formData.assets}
              onScriptsChange={(s) => updateFormData({ scripts: s })}
              onReferencesChange={(r) => updateFormData({ references: r })}
              onAssetsChange={(a) => updateFormData({ assets: a })}
            />
          </PanelSection>

          <PanelSection style={{ flex: 1 }}>
            <Title level={5} style={{ marginTop: 0 }}>
              {t('settings.tool.skills.creator.preview', 'SKILL.md Preview')}
            </Title>
            <pre
              style={{
                fontSize: 11,
                padding: 12,
                background: 'var(--color-background-soft)',
                borderRadius: 6,
                maxHeight: 400,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)'
              }}>
              {skillMdPreview}
            </pre>
          </PanelSection>
        </RightPanel>
      </Content>

      {/* Save Modal - Provider Picker */}
      <Modal
        title={t('settings.tool.skills.creator.saveToProvider', 'Save to Storage Provider')}
        open={saveModalVisible}
        onCancel={() => setSaveModalVisible(false)}
        onOk={handleSave}
        confirmLoading={saving}
        okText={t('common.save', 'Save')}>
        <div style={{ marginBottom: 16 }}>
          <Text>{t('settings.tool.skills.creator.selectProvider', 'Choose where to save this skill:')}</Text>
        </div>
        <Select
          value={selectedProviderId}
          onChange={setSelectedProviderId}
          style={{ width: '100%' }}
          options={providers.map((p) => ({
            value: p.id,
            label: `${p.name} (${p.type})`
          }))}
        />
        {validation.warnings.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Text type="warning" style={{ fontSize: 12 }}>
              Warnings:
            </Text>
            {validation.warnings.map((w, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--color-warning)' }}>
                - {w.field}: {w.message}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </Container>
  )
}

// ── Styled Components ──────────────────────────────────────────────────

const Container = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  overflow: hidden;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 18px;
  border-bottom: 1px solid var(--color-border);
`

const Content = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`

const LeftPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  border-right: 1px solid var(--color-border);
  padding: 16px;
  gap: 16px;

  &::-webkit-scrollbar {
    display: none;
  }
`

const RightPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 16px;
  gap: 16px;

  &::-webkit-scrollbar {
    display: none;
  }
`

const PanelSection = styled.div`
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  background: var(--color-background);
`

export default SkillCreator
