import { Input, Tag, Typography } from 'antd'
import type { FC } from 'react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

const { Text } = Typography
const { TextArea } = Input

interface SkillBodyEditorProps {
  value: string
  onChange: (value: string) => void
}

const SkillBodyEditor: FC<SkillBodyEditorProps> = ({ value, onChange }) => {
  const { t } = useTranslation()

  const lineCount = useMemo(() => (value ? value.split('\n').length : 0), [value])
  const isOverLimit = lineCount > 500

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <Text strong style={{ fontSize: 12 }}>
          {t('settings.tool.skills.creator.body', 'Instructions (SKILL.md body)')}
        </Text>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {isOverLimit && <Tag color="warning">Over 500 lines</Tag>}
          <Text type="secondary" style={{ fontSize: 10 }}>
            {lineCount} lines
          </Text>
        </div>
      </div>
      <TextArea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`# My Skill\n\n## Instructions\n\nDescribe how the agent should use this skill...\n\n## Examples\n\n- Example input/output pairs\n\n## Edge Cases\n\n- Handle these situations...`}
        style={{
          flex: 1,
          minHeight: 300,
          fontFamily: 'monospace',
          fontSize: 13,
          resize: 'vertical'
        }}
        autoSize={{ minRows: 12 }}
      />
      {isOverLimit && (
        <Text type="warning" style={{ fontSize: 11, marginTop: 4 }}>
          The Agent Skills spec recommends keeping SKILL.md under 500 lines. Consider moving detailed content to
          references/ files.
        </Text>
      )}
    </div>
  )
}

export default SkillBodyEditor
