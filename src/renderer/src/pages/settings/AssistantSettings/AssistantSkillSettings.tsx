import { loggerService } from '@logger'
import { HStack } from '@renderer/components/Layout'
import type { Assistant, AssistantSettings, Skill } from '@renderer/types'
import type { SkillAvailabilityMode, SkillScopeConfig } from '@renderer/types/skillScope'
import { Divider, Select } from 'antd'
import { Cpu } from 'lucide-react'
import type { FC } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

const logger = loggerService.withContext('AssistantSkillSettings')

interface Props {
  assistant: Assistant
  updateAssistant: (assistant: Assistant) => void
  updateAssistantSettings: (settings: Partial<AssistantSettings>) => void
}

const STRATEGY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '__inherit__', label: 'Inherit Global' },
  { value: 'none', label: 'None (Inject All)' },
  { value: 'keyword', label: 'Keyword' },
  { value: 'embedding', label: 'Embedding (API)' },
  { value: 'local-embedding', label: 'Local Embedding' },
  { value: 'llm', label: 'LLM Classification' },
  { value: 'hybrid', label: 'Hybrid' }
]

const MODE_OPTIONS: Array<{ value: SkillAvailabilityMode; label: string }> = [
  { value: 'all', label: 'All Skills' },
  { value: 'selected', label: 'Selected Skills' },
  { value: 'none', label: 'No Skills' }
]

const DEFAULT_SCOPE: SkillScopeConfig = {
  mode: 'all'
}

const AssistantSkillSettings: FC<Props> = ({ assistant, updateAssistantSettings }) => {
  const { t } = useTranslation()
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [loadingSkills, setLoadingSkills] = useState(false)

  const hasCustomScope = assistant.settings?.skillScope !== undefined
  const [useGlobalDefault, setUseGlobalDefault] = useState(!hasCustomScope)

  useEffect(() => {
    setUseGlobalDefault(!hasCustomScope)
  }, [hasCustomScope])

  useEffect(() => {
    const fetchSkills = async () => {
      setLoadingSkills(true)
      try {
        const skills = await window.api.skill.getList()
        setAllSkills(skills || [])
      } catch (error) {
        logger.error('Failed to fetch skills for assistant settings', error as Error)
      } finally {
        setLoadingSkills(false)
      }
    }

    fetchSkills()
  }, [])

  const effectiveScope = useMemo<SkillScopeConfig>(() => {
    if (assistant.settings?.skillScope) {
      return assistant.settings.skillScope
    }
    return DEFAULT_SCOPE
  }, [assistant.settings?.skillScope])

  const updateScope = useCallback(
    (next: SkillScopeConfig | undefined) => {
      updateAssistantSettings({ skillScope: next })
    },
    [updateAssistantSettings]
  )

  const handleUseGlobalChange = useCallback(
    (value: boolean) => {
      setUseGlobalDefault(value)
      if (value) {
        updateScope(undefined)
      } else {
        updateScope(assistant.settings?.skillScope ?? DEFAULT_SCOPE)
      }
    },
    [assistant.settings?.skillScope, updateScope]
  )

  const handleModeChange = useCallback(
    (mode: SkillAvailabilityMode) => {
      const base = assistant.settings?.skillScope ?? DEFAULT_SCOPE
      updateScope({
        ...base,
        mode,
        selectedSkillIds: mode === 'selected' ? (base.selectedSkillIds ?? []) : undefined
      })
    },
    [assistant.settings?.skillScope, updateScope]
  )

  const handleSelectedSkillChange = useCallback(
    (selectedSkillIds: string[]) => {
      const base = assistant.settings?.skillScope ?? DEFAULT_SCOPE
      updateScope({
        ...base,
        mode: 'selected',
        selectedSkillIds
      })
    },
    [assistant.settings?.skillScope, updateScope]
  )

  const handleStrategyChange = useCallback(
    (value: string) => {
      const base = assistant.settings?.skillScope ?? DEFAULT_SCOPE
      updateScope({
        ...base,
        strategy: value === '__inherit__' ? undefined : (value as SkillScopeConfig['strategy'])
      })
    },
    [assistant.settings?.skillScope, updateScope]
  )

  return (
    <Container>
      <Header>
        <HStack alignItems="center" gap={10}>
          <Cpu size={20} color="var(--color-primary)" />
          <Title>{t('assistants.settings.skills.title', { defaultValue: 'Skills' })}</Title>
        </HStack>
      </Header>

      <Description>
        {t('assistants.settings.skills.description', {
          defaultValue:
            'Control skill availability and intent classification strategy for this assistant. Conversation-level settings can still override this.'
        })}
      </Description>

      <Divider style={{ margin: '16px 0' }} />

      <Section>
        <RowLabel>{t('assistants.settings.skills.use_global', { defaultValue: 'Use Global Default' })}</RowLabel>
        <Select
          value={useGlobalDefault ? 'yes' : 'no'}
          options={[
            { value: 'yes', label: t('common.enabled', { defaultValue: 'Enabled' }) },
            { value: 'no', label: t('common.disabled', { defaultValue: 'Disabled' }) }
          ]}
          onChange={(value) => handleUseGlobalChange(value === 'yes')}
        />
      </Section>

      {!useGlobalDefault && (
        <>
          <Section>
            <RowLabel>{t('assistants.settings.skills.mode', { defaultValue: 'Availability' })}</RowLabel>
            <Select value={effectiveScope.mode} options={MODE_OPTIONS} onChange={handleModeChange} />
          </Section>

          {effectiveScope.mode === 'selected' && (
            <Section>
              <RowLabel>{t('assistants.settings.skills.selected', { defaultValue: 'Selected Skills' })}</RowLabel>
              <Select
                mode="multiple"
                loading={loadingSkills}
                value={effectiveScope.selectedSkillIds ?? []}
                onChange={handleSelectedSkillChange}
                options={allSkills.map((skill) => ({
                  value: skill.id,
                  label: skill.name
                }))}
                placeholder={t('assistants.settings.skills.selected_placeholder', {
                  defaultValue: 'Choose skills available to this assistant'
                })}
              />
            </Section>
          )}

          <Section>
            <RowLabel>{t('assistants.settings.skills.strategy', { defaultValue: 'Intent Strategy' })}</RowLabel>
            <Select
              value={effectiveScope.strategy ?? '__inherit__'}
              options={STRATEGY_OPTIONS}
              onChange={handleStrategyChange}
            />
          </Section>

          <InfoBox>
            <InfoText>
              {t('assistants.settings.skills.custom_info', {
                defaultValue:
                  'Custom skill policy overrides global defaults for this assistant. Conversation settings can still override assistant scope.'
              })}
            </InfoText>
          </InfoBox>
        </>
      )}
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 5px;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`

const Title = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
`

const Description = styled.p`
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.5;
`

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
`

const RowLabel = styled.div`
  font-size: 13px;
  color: var(--color-text);
  font-weight: 500;
`

const InfoBox = styled.div`
  margin-top: 4px;
  padding: 12px;
  background: var(--color-background-soft);
  border-radius: 8px;
  border: 1px solid var(--color-border);
`

const InfoText = styled.p`
  margin: 0;
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.5;
`

export default AssistantSkillSettings
