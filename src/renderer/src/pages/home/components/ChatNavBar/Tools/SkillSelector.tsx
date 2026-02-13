import { loggerService } from '@logger'
import type { Skill } from '@types'
import { Button, Empty, List, Popover, Switch, Tooltip } from 'antd'
import { GraduationCap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const logger = loggerService.withContext('SkillSelector')

export const SkillSelector = () => {
  const { t } = useTranslation()
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const fetchSkills = async () => {
    setLoading(true)
    try {
      const list = await (window.api as any).invoke('skill:get-list')
      setSkills(list)
    } catch (e) {
      if (e instanceof Error) {
        logger.error('Failed to fetch skills', e)
      } else {
        logger.error('Failed to fetch skills', { error: e })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) fetchSkills()
  }, [open])

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await (window.api as any).invoke('skill:toggle', id, enabled)
      setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, enabled } : s)))
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Failed to toggle skill', error)
      } else {
        logger.error('Failed to toggle skill', { error })
      }
    }
  }

  const content = (
    <div style={{ width: 300, maxHeight: 400, overflow: 'auto' }}>
      <List
        loading={loading}
        dataSource={skills}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No skills found" /> }}
        renderItem={(item) => (
          <List.Item
            key={item.id}
            actions={[
              <Switch key={item.id} size="small" checked={item.enabled} onChange={(v) => handleToggle(item.id, v)} />
            ]}>
            <List.Item.Meta
              title={<span style={{ fontSize: 13 }}>{item.name}</span>}
              description={<span style={{ fontSize: 11 }}>{item.description}</span>}
            />
          </List.Item>
        )}
      />
    </div>
  )

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      title={t('settings.skills.title', 'Skills')}
      placement="bottomRight">
      <Tooltip title={t('settings.skills.title', 'Skills')}>
        <Button
          type="text"
          icon={<GraduationCap size={16} />}
          className={skills.some((s) => s.enabled) ? 'text-primary' : ''}
        />
      </Tooltip>
    </Popover>
  )
}

export default SkillSelector
