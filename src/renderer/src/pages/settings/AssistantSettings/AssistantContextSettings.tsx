import ContextStrategySelector from '@renderer/components/ContextStrategySelector'
import { HStack } from '@renderer/components/Layout'
import { useSettings } from '@renderer/hooks/useSettings'
import type { Assistant, AssistantSettings } from '@renderer/types'
import type { ContextStrategyConfig } from '@renderer/types/contextStrategy'
import { DEFAULT_CONTEXT_STRATEGY_CONFIG } from '@renderer/types/contextStrategy'
import { Divider } from 'antd'
import { Layers } from 'lucide-react'
import type { FC } from 'react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

interface Props {
  assistant: Assistant
  updateAssistant: (assistant: Assistant) => void
  updateAssistantSettings: (settings: Partial<AssistantSettings>) => void
}

/**
 * Assistant Context Settings Tab
 *
 * Allows users to configure context management strategy per assistant,
 * with the option to inherit from global settings.
 */
const AssistantContextSettings: FC<Props> = ({ assistant, updateAssistantSettings }) => {
  const { t } = useTranslation()
  const { contextStrategy: globalContextStrategy } = useSettings()

  // Check if assistant has its own context strategy or uses global
  const hasCustomStrategy = assistant.settings?.contextStrategy !== undefined
  const [useGlobalDefault, setUseGlobalDefault] = useState(!hasCustomStrategy)

  // Get the effective strategy - either assistant's custom or global
  const effectiveStrategy = hasCustomStrategy
    ? assistant.settings?.contextStrategy || DEFAULT_CONTEXT_STRATEGY_CONFIG
    : globalContextStrategy || DEFAULT_CONTEXT_STRATEGY_CONFIG

  const handleUseGlobalChange = useCallback(
    (useGlobal: boolean) => {
      setUseGlobalDefault(useGlobal)
      if (useGlobal) {
        // Remove custom strategy, will inherit from global
        updateAssistantSettings({ contextStrategy: undefined })
      } else {
        // Set to current global strategy as starting point
        updateAssistantSettings({ contextStrategy: globalContextStrategy || DEFAULT_CONTEXT_STRATEGY_CONFIG })
      }
    },
    [globalContextStrategy, updateAssistantSettings]
  )

  const handleStrategyChange = useCallback(
    (config: ContextStrategyConfig) => {
      updateAssistantSettings({ contextStrategy: config })
    },
    [updateAssistantSettings]
  )

  return (
    <Container>
      <Header>
        <HStack alignItems="center" gap={10}>
          <Layers size={20} color="var(--color-primary)" />
          <Title>{t('assistants.settings.context.title', { defaultValue: 'Context Management' })}</Title>
        </HStack>
      </Header>

      <Description>
        {t('assistants.settings.context.description', {
          defaultValue:
            'Configure how this assistant manages conversation context when approaching model limits. You can use the global default or customize settings for this assistant.'
        })}
      </Description>

      <Divider style={{ margin: '16px 0' }} />

      <ContextStrategySelector
        value={effectiveStrategy}
        onChange={handleStrategyChange}
        showInheritOption
        inheritedStrategyType={globalContextStrategy?.type}
        inheritLabel={t('assistants.settings.context.use_global', { defaultValue: 'Use Global Default' })}
        useInherited={useGlobalDefault}
        onInheritedChange={handleUseGlobalChange}
      />

      {!useGlobalDefault && (
        <InfoBox>
          <InfoText>
            {t('assistants.settings.context.custom_info', {
              defaultValue:
                'Custom context strategy will override the global setting for all conversations with this assistant.'
            })}
          </InfoText>
        </InfoBox>
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

const InfoBox = styled.div`
  margin-top: 16px;
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

export default AssistantContextSettings
