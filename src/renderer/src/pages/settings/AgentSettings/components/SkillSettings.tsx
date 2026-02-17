import { loggerService } from '@logger'
import type { UpdateAgentBaseForm } from '@renderer/types'
import { AgentConfigurationSchema } from '@renderer/types'
import type { SkillAvailabilityMode, SkillScopeConfig } from '@renderer/types/skillScope'
import { Select } from 'antd'
import { Cpu } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { type AgentOrSessionSettingsProps, SettingsContainer, SettingsItem, SettingsTitle } from '../shared'

const logger = loggerService.withContext('AgentSkillSettings')

const MODE_OPTIONS: Array<{ value: SkillAvailabilityMode; label: string }> = [
  { value: 'inherit', label: 'Inherit Global' },
  { value: 'all', label: 'All Skills' },
  { value: 'selected', label: 'Selected Skills' },
  { value: 'none', label: 'No Skills' }
]

const STRATEGY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '__inherit__', label: 'Inherit Global' },
  { value: 'none', label: 'None (Inject All)' },
  { value: 'keyword', label: 'Keyword' },
  { value: 'embedding', label: 'Embedding (API)' },
  { value: 'local-embedding', label: 'Local Embedding' },
  { value: 'llm', label: 'LLM Classification' },
  { value: 'hybrid', label: 'Hybrid' }
]

const DEFAULT_SCOPE: SkillScopeConfig = {
  mode: 'inherit'
}

const SkillSettings: React.FC<AgentOrSessionSettingsProps> = ({ agentBase, update }) => {
  const { t } = useTranslation()
  const [availableSkills, setAvailableSkills] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const skills = await window.api.skill.getList()
        setAvailableSkills((skills || []).map((skill) => ({ id: skill.id, name: skill.name })))
      } catch (error) {
        logger.error('Failed to fetch skills for agent settings', error as Error)
      }
    }
    fetchSkills()
  }, [])

  const scope = useMemo<SkillScopeConfig>(() => {
    if (!agentBase) return DEFAULT_SCOPE
    const config = (agentBase.configuration ?? {}) as Record<string, unknown>
    const skillScope = config.skillScope as SkillScopeConfig | undefined
    return skillScope ?? DEFAULT_SCOPE
  }, [agentBase])

  const persistSkillScope = useCallback(
    (nextScope: SkillScopeConfig) => {
      if (!agentBase) return
      const nextConfig = AgentConfigurationSchema.parse({
        ...agentBase.configuration,
        skillScope: nextScope
      })
      update({ id: agentBase.id, configuration: nextConfig } satisfies UpdateAgentBaseForm, {
        showSuccessToast: false
      })
    },
    [agentBase, update]
  )

  const onModeChange = useCallback(
    (mode: SkillAvailabilityMode) => {
      persistSkillScope({
        ...scope,
        mode,
        selectedSkillIds: mode === 'selected' ? (scope.selectedSkillIds ?? []) : undefined
      })
    },
    [persistSkillScope, scope]
  )

  const onSelectedSkillChange = useCallback(
    (selectedSkillIds: string[]) => {
      persistSkillScope({
        ...scope,
        mode: 'selected',
        selectedSkillIds
      })
    },
    [persistSkillScope, scope]
  )

  const onStrategyChange = useCallback(
    (value: string) => {
      persistSkillScope({
        ...scope,
        strategy: value === '__inherit__' ? undefined : (value as SkillScopeConfig['strategy'])
      })
    },
    [persistSkillScope, scope]
  )

  if (!agentBase) {
    return null
  }

  return (
    <SettingsContainer>
      <SettingsItem>
        <SettingsTitle contentAfter={<Cpu size={16} className="text-foreground-400" />}>
          {t('agent.settings.skills.title', 'Skills')}
        </SettingsTitle>
        <div className="mt-2 flex flex-col gap-2">
          <span className="text-foreground-500 text-xs">
            {t(
              'agent.settings.skills.description',
              'Configure skill availability and intent strategy for this agent/session scope.'
            )}
          </span>
        </div>
      </SettingsItem>

      <SettingsItem>
        <SettingsTitle>{t('agent.settings.skills.mode', 'Availability')}</SettingsTitle>
        <Select value={scope.mode} options={MODE_OPTIONS} onChange={onModeChange} />
      </SettingsItem>

      {scope.mode === 'selected' && (
        <SettingsItem>
          <SettingsTitle>{t('agent.settings.skills.selected', 'Selected Skills')}</SettingsTitle>
          <Select
            mode="multiple"
            value={scope.selectedSkillIds ?? []}
            onChange={onSelectedSkillChange}
            options={availableSkills.map((skill) => ({ value: skill.id, label: skill.name }))}
            placeholder={t('agent.settings.skills.selectedPlaceholder', 'Choose skills for this scope')}
          />
        </SettingsItem>
      )}

      <SettingsItem divider={false}>
        <SettingsTitle>{t('agent.settings.skills.strategy', 'Intent Strategy')}</SettingsTitle>
        <Select value={scope.strategy ?? '__inherit__'} options={STRATEGY_OPTIONS} onChange={onStrategyChange} />
      </SettingsItem>
    </SettingsContainer>
  )
}

export default SkillSettings
