import { Input, Select, Typography } from 'antd'
import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

const { Text } = Typography
const { TextArea } = Input

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
}

interface FrontmatterFormProps {
  formData: SkillFormData
  onChange: (updates: Partial<SkillFormData>) => void
  validationErrors: Array<{ field: string; message: string }>
}

const NAME_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/

const FrontmatterForm: FC<FrontmatterFormProps> = ({ formData, onChange, validationErrors }) => {
  const { t } = useTranslation()

  const nameError = validationErrors.find((e) => e.field === 'name')
  const descError = validationErrors.find((e) => e.field === 'description')

  const nameValid = formData.name && NAME_REGEX.test(formData.name) && formData.name.length <= 64

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <Text strong style={{ fontSize: 12 }}>
          {t('settings.tool.skills.creator.name', 'Skill Name')} *
        </Text>
        <Input
          value={formData.name}
          onChange={(e) => onChange({ name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
          placeholder="my-skill-name"
          status={nameError ? 'error' : nameValid ? '' : 'warning'}
          maxLength={64}
          style={{ marginTop: 4 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
          <Text type="secondary" style={{ fontSize: 10 }}>
            {nameError?.message || 'Lowercase letters, numbers, hyphens only'}
          </Text>
          <Text type="secondary" style={{ fontSize: 10 }}>
            {formData.name?.length || 0}/64
          </Text>
        </div>
      </div>

      <div>
        <Text strong style={{ fontSize: 12 }}>
          {t('settings.tool.skills.creator.description', 'Description')} *
        </Text>
        <TextArea
          value={formData.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Describe what this skill does and when to use it..."
          rows={3}
          maxLength={1024}
          status={descError ? 'error' : undefined}
          style={{ marginTop: 4 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
          <Text type="secondary" style={{ fontSize: 10 }}>
            {descError?.message || 'Include both WHAT and WHEN to use'}
          </Text>
          <Text type="secondary" style={{ fontSize: 10 }}>
            {formData.description?.length || 0}/1024
          </Text>
        </div>
      </div>

      <div>
        <Text strong style={{ fontSize: 12 }}>
          {t('settings.tool.skills.creator.license', 'License')}
        </Text>
        <Input
          value={formData.license}
          onChange={(e) => onChange({ license: e.target.value })}
          placeholder="Apache-2.0 (optional)"
          style={{ marginTop: 4 }}
        />
      </div>

      <div>
        <Text strong style={{ fontSize: 12 }}>
          {t('settings.tool.skills.creator.compatibility', 'Compatibility')}
        </Text>
        <Input
          value={formData.compatibility}
          onChange={(e) => onChange({ compatibility: e.target.value })}
          placeholder="Environment requirements (optional, max 500 chars)"
          maxLength={500}
          style={{ marginTop: 4 }}
        />
      </div>

      <div>
        <Text strong style={{ fontSize: 12 }}>
          {t('settings.tool.skills.creator.allowedTools', 'Allowed Tools')}
        </Text>
        <Select
          mode="tags"
          value={formData.allowedTools || []}
          onChange={(val) => onChange({ allowedTools: val })}
          placeholder="Type tool names and press Enter"
          style={{ width: '100%', marginTop: 4 }}
          tokenSeparators={[' ', ',']}
        />
        <Text type="secondary" style={{ fontSize: 10 }}>
          Pre-approved tools this skill may use (experimental)
        </Text>
      </div>

      <div>
        <Text strong style={{ fontSize: 12 }}>
          {t('settings.tool.skills.creator.tags', 'Tags')}
        </Text>
        <Select
          mode="tags"
          value={formData.tags || []}
          onChange={(val) => onChange({ tags: val })}
          placeholder="Add category tags"
          style={{ width: '100%', marginTop: 4 }}
          tokenSeparators={[',']}
        />
      </div>

      <div>
        <Text strong style={{ fontSize: 12 }}>
          {t('settings.tool.skills.creator.examples', 'Example Triggers')}
        </Text>
        <Select
          mode="tags"
          value={formData.examples || []}
          onChange={(val) => onChange({ examples: val })}
          placeholder="Add example user queries that should trigger this skill"
          style={{ width: '100%', marginTop: 4 }}
          tokenSeparators={[]}
        />
        <Text type="secondary" style={{ fontSize: 10 }}>
          Example utterances for semantic routing
        </Text>
      </div>
    </div>
  )
}

export default FrontmatterForm
