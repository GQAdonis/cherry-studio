import ContextStrategySelector from '@renderer/components/ContextStrategySelector'
import { HStack } from '@renderer/components/Layout'
import { useAssistant } from '@renderer/hooks/useAssistant'
import { useSettings } from '@renderer/hooks/useSettings'
import type { Assistant, Topic } from '@renderer/types'
import type { ContextStrategyConfig } from '@renderer/types/contextStrategy'
import { DEFAULT_CONTEXT_STRATEGY_CONFIG } from '@renderer/types/contextStrategy'
import { Popover, Tooltip } from 'antd'
import { Layers } from 'lucide-react'
import type { FC } from 'react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

interface ConversationContextButtonProps {
  assistant: Assistant
  topic: Topic
}

/**
 * Button component for managing context strategy at the conversation level.
 * Allows users to override assistant and global settings for individual conversations.
 */
const ConversationContextButton: FC<ConversationContextButtonProps> = ({ assistant, topic }) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { updateTopic } = useAssistant(assistant.id)
  const { contextStrategy: globalContextStrategy } = useSettings()

  // Determine if topic has custom strategy
  const hasCustomStrategy = topic.contextStrategy !== undefined

  // Get effective strategy following inheritance hierarchy:
  // 1. Topic-level (if set)
  // 2. Assistant-level (if set)
  // 3. Global (fallback)
  const effectiveStrategy =
    topic.contextStrategy ||
    assistant.settings?.contextStrategy ||
    globalContextStrategy ||
    DEFAULT_CONTEXT_STRATEGY_CONFIG

  // Determine if using assistant default (for inheritance toggle)
  const useAssistantDefault = !hasCustomStrategy

  const handleUseAssistantDefaultChange = useCallback(
    (useDefault: boolean) => {
      if (useDefault) {
        // Remove custom strategy, will inherit from assistant/global
        updateTopic({ ...topic, contextStrategy: undefined })
      } else {
        // Set to current effective strategy as starting point
        const inheritedStrategy =
          assistant.settings?.contextStrategy || globalContextStrategy || DEFAULT_CONTEXT_STRATEGY_CONFIG
        updateTopic({ ...topic, contextStrategy: inheritedStrategy })
      }
    },
    [assistant.settings?.contextStrategy, globalContextStrategy, topic, updateTopic]
  )

  const handleStrategyChange = useCallback(
    (config: ContextStrategyConfig) => {
      updateTopic({ ...topic, contextStrategy: config })
    },
    [topic, updateTopic]
  )

  // Get inherited strategy type for display
  const inheritedStrategyType = (assistant.settings?.contextStrategy || globalContextStrategy)?.type

  const tooltipTitle = hasCustomStrategy
    ? t('conversation.contextStrategy.customActive', { defaultValue: 'Custom context strategy active' })
    : t('conversation.contextStrategy.usingDefault', { defaultValue: 'Using assistant default' })

  const popoverContent = (
    <PopoverContainer>
      <PopoverHeader>
        <HStack alignItems="center" gap={10}>
          <Layers size={18} color="var(--color-primary)" />
          <PopoverTitle>
            {t('conversation.contextStrategy.title', { defaultValue: 'Conversation Context Strategy' })}
          </PopoverTitle>
        </HStack>
      </PopoverHeader>

      <PopoverDescription>
        {t('conversation.contextStrategy.description', {
          defaultValue:
            "Configure how this conversation manages context. You can use the assistant's default or customize for this conversation."
        })}
      </PopoverDescription>

      <ContextStrategySelector
        value={effectiveStrategy}
        onChange={handleStrategyChange}
        showInheritOption
        inheritedStrategyType={inheritedStrategyType}
        inheritLabel={t('conversation.contextStrategy.useAssistantDefault', { defaultValue: 'Use Assistant Default' })}
        useInherited={useAssistantDefault}
        onInheritedChange={handleUseAssistantDefaultChange}
        compact
      />

      {!useAssistantDefault && (
        <InfoBox>
          <InfoText>
            {t('conversation.contextStrategy.customInfo', {
              defaultValue: "Custom context strategy will override the assistant's setting for this conversation only."
            })}
          </InfoText>
        </InfoBox>
      )}
    </PopoverContainer>
  )

  return (
    <Popover
      content={popoverContent}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomLeft"
      overlayStyle={{ maxWidth: 500 }}>
      <Tooltip title={tooltipTitle} mouseEnterDelay={0.8}>
        <ButtonContainer $hasCustom={hasCustomStrategy}>
          <Layers size={16} />
          <ButtonText>{t('conversation.contextStrategy.button', { defaultValue: 'Context' })}</ButtonText>
        </ButtonContainer>
      </Tooltip>
    </Popover>
  )
}

const ButtonContainer = styled.div<{ $hasCustom: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: ${(props) => (props.$hasCustom ? 'var(--color-primary)' : 'var(--color-text-secondary)')};
  border: 1px solid ${(props) => (props.$hasCustom ? 'var(--color-primary)' : 'transparent')};
  background: ${(props) => (props.$hasCustom ? 'var(--color-primary-bg, rgba(24, 144, 255, 0.1))' : 'transparent')};

  &:hover {
    background: var(--color-background-soft);
    color: var(--color-text);
  }
`

const ButtonText = styled.span`
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
`

const PopoverContainer = styled.div`
  width: 450px;
  max-width: 90vw;
`

const PopoverHeader = styled.div`
  margin-bottom: 12px;
`

const PopoverTitle = styled.h4`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
`

const PopoverDescription = styled.p`
  margin: 0 0 16px 0;
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.5;
`

const InfoBox = styled.div`
  margin-top: 12px;
  padding: 10px 12px;
  background: var(--color-background-soft);
  border-radius: 6px;
  border: 1px solid var(--color-border);
`

const InfoText = styled.p`
  margin: 0;
  font-size: 11px;
  color: var(--color-text-secondary);
  line-height: 1.4;
`

export default ConversationContextButton
