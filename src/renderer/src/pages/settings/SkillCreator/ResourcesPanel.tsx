import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { SkillAssetEntry, SkillReference, SkillScript } from '@types'
import { Button, Input, Select, Tabs } from 'antd'
import { Typography } from 'antd'
import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

const { Text } = Typography

interface ResourcesPanelProps {
  scripts: SkillScript[]
  references: SkillReference[]
  assets: SkillAssetEntry[]
  onScriptsChange: (scripts: SkillScript[]) => void
  onReferencesChange: (references: SkillReference[]) => void
  onAssetsChange: (assets: SkillAssetEntry[]) => void
}

const LANGUAGE_OPTIONS = [
  { value: 'python', label: 'Python' },
  { value: 'bash', label: 'Bash' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'ruby', label: 'Ruby' }
]

const ResourcesPanel: FC<ResourcesPanelProps> = ({
  scripts,
  references,
  assets,
  onScriptsChange,
  onReferencesChange,
  onAssetsChange
}) => {
  const { t } = useTranslation()

  const addScript = () => {
    onScriptsChange([
      ...scripts,
      {
        name: `script_${scripts.length + 1}.py`,
        path: `scripts/script_${scripts.length + 1}.py`,
        language: 'python',
        description: ''
      }
    ])
  }

  const updateScript = (index: number, updates: Partial<SkillScript>) => {
    const updated = [...scripts]
    updated[index] = { ...updated[index], ...updates }
    // Update path when name changes
    if (updates.name) {
      updated[index].path = `scripts/${updates.name}`
    }
    onScriptsChange(updated)
  }

  const removeScript = (index: number) => {
    onScriptsChange(scripts.filter((_, i) => i !== index))
  }

  const addReference = () => {
    onReferencesChange([
      ...references,
      {
        name: `reference_${references.length + 1}.md`,
        path: `references/reference_${references.length + 1}.md`,
        description: ''
      }
    ])
  }

  const updateReference = (index: number, updates: Partial<SkillReference>) => {
    const updated = [...references]
    updated[index] = { ...updated[index], ...updates }
    if (updates.name) {
      updated[index].path = `references/${updates.name}`
    }
    onReferencesChange(updated)
  }

  const removeReference = (index: number) => {
    onReferencesChange(references.filter((_, i) => i !== index))
  }

  const addAsset = () => {
    onAssetsChange([
      ...assets,
      {
        name: `asset_${assets.length + 1}`,
        path: `assets/asset_${assets.length + 1}`,
        type: 'application/octet-stream'
      }
    ])
  }

  const removeAsset = (index: number) => {
    onAssetsChange(assets.filter((_, i) => i !== index))
  }

  return (
    <Tabs
      size="small"
      items={[
        {
          key: 'scripts',
          label: `Scripts (${scripts.length})`,
          children: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Executable code in scripts/ directory. For tasks needing deterministic reliability.
              </Text>
              {scripts.map((script, i) => (
                <div
                  key={i}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    padding: 8
                  }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                    <Input
                      size="small"
                      value={script.name}
                      onChange={(e) => updateScript(i, { name: e.target.value })}
                      placeholder="filename.py"
                      style={{ flex: 1 }}
                    />
                    <Select
                      size="small"
                      value={script.language}
                      onChange={(val) => updateScript(i, { language: val })}
                      options={LANGUAGE_OPTIONS}
                      style={{ width: 120 }}
                    />
                    <Button size="small" icon={<DeleteOutlined />} danger onClick={() => removeScript(i)} />
                  </div>
                  <Input
                    size="small"
                    value={script.description}
                    onChange={(e) => updateScript(i, { description: e.target.value })}
                    placeholder="What this script does..."
                    style={{ marginBottom: 4 }}
                  />
                </div>
              ))}
              <Button size="small" icon={<PlusOutlined />} onClick={addScript}>
                {t('settings.skills.creator.addScript', 'Add Script')}
              </Button>
            </div>
          )
        },
        {
          key: 'references',
          label: `References (${references.length})`,
          children: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Documentation in references/ loaded on demand. Keeps SKILL.md lean.
              </Text>
              {references.map((ref, i) => (
                <div
                  key={i}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    padding: 8
                  }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                    <Input
                      size="small"
                      value={ref.name}
                      onChange={(e) => updateReference(i, { name: e.target.value })}
                      placeholder="reference.md"
                      style={{ flex: 1 }}
                    />
                    <Button size="small" icon={<DeleteOutlined />} danger onClick={() => removeReference(i)} />
                  </div>
                  <Input
                    size="small"
                    value={ref.description}
                    onChange={(e) => updateReference(i, { description: e.target.value })}
                    placeholder="When to load this reference..."
                  />
                </div>
              ))}
              <Button size="small" icon={<PlusOutlined />} onClick={addReference}>
                {t('settings.skills.creator.addReference', 'Add Reference')}
              </Button>
            </div>
          )
        },
        {
          key: 'assets',
          label: `Assets (${assets.length})`,
          children: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Static resources in assets/ (templates, images, data files). Used in output, not loaded into context.
              </Text>
              {assets.map((asset, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    padding: '4px 8px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6
                  }}>
                  <Text style={{ flex: 1 }}>{asset.name}</Text>
                  <Text type="secondary" style={{ fontSize: 10 }}>
                    {asset.type}
                  </Text>
                  <Button size="small" icon={<DeleteOutlined />} danger onClick={() => removeAsset(i)} />
                </div>
              ))}
              <Button size="small" icon={<PlusOutlined />} onClick={addAsset}>
                {t('settings.skills.creator.addAsset', 'Add Asset')}
              </Button>
            </div>
          )
        }
      ]}
    />
  )
}

export default ResourcesPanel
