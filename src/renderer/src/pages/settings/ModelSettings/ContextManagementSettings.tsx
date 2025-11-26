import { HStack } from '@renderer/components/Layout'
import Selector from '@renderer/components/Selector'
import { InfoTooltip } from '@renderer/components/TooltipIcons'
import { useTheme } from '@renderer/context/ThemeProvider'
import { useAppDispatch } from '@renderer/store'
import { setContextStrategyPartial } from '@renderer/store/settings'
import type { ContextStrategyConfig, ContextStrategyType } from '@renderer/types'
import {
  CONTEXT_STRATEGY_DESCRIPTIONS,
  CONTEXT_STRATEGY_LABELS,
  DEFAULT_CONTEXT_STRATEGY_CONFIG
} from '@renderer/types/contextStrategy'
import { InputNumber, Slider } from 'antd'
import { Layers } from 'lucide-react'
import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

import { SettingDescription, SettingDivider, SettingGroup, SettingRow, SettingRowTitle, SettingTitle } from '..'

/**
 * Context Management Settings Component
 *
 * Provides UI for configuring the global context management strategy.
 * This helps prevent "Prompt is too long" errors by intelligently
 * managing conversation history to stay within model context limits.
 */
const ContextManagementSettings: FC = () => {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const contextStrategy = useSelector(
    (state: { settings: { contextStrategy: ContextStrategyConfig } }) => state.settings.contextStrategy
  )

  // Use defaults if not set
  const strategy = contextStrategy || DEFAULT_CONTEXT_STRATEGY_CONFIG

  const strategyOptions = (Object.keys(CONTEXT_STRATEGY_LABELS) as ContextStrategyType[]).map((type) => ({
    value: type,
    label: t(`settings.contextStrategy.types.${type}`, { defaultValue: CONTEXT_STRATEGY_LABELS[type] })
  }))

  const handleStrategyChange = (type: ContextStrategyType) => {
    dispatch(setContextStrategyPartial({ type }))
  }

  const handleConfigChange = (key: keyof ContextStrategyConfig, value: number | string | boolean | undefined) => {
    dispatch(setContextStrategyPartial({ [key]: value }))
  }

  return (
    <SettingGroup theme={theme}>
      <SettingTitle style={{ marginBottom: 12 }}>
        <HStack alignItems="center" gap={10}>
          <Layers size={18} color="var(--color-text)" />
          {t('settings.contextStrategy.title', { defaultValue: 'Context Management' })}
          <InfoTooltip
            title={t('settings.contextStrategy.tooltip', {
              defaultValue:
                'Automatically manages conversation context to prevent exceeding model limits. Applies to all conversations unless overridden.'
            })}
          />
        </HStack>
      </SettingTitle>

      <SettingRow>
        <SettingRowTitle>
          {t('settings.contextStrategy.strategy', { defaultValue: 'Strategy' })}
          <InfoTooltip
            title={t(`settings.contextStrategy.descriptions.${strategy.type}`, {
              defaultValue: CONTEXT_STRATEGY_DESCRIPTIONS[strategy.type]
            })}
          />
        </SettingRowTitle>
        <Selector value={strategy.type} onChange={handleStrategyChange} options={strategyOptions} />
      </SettingRow>

      {/* Sliding Window Options */}
      {strategy.type === 'sliding_window' && (
        <>
          <SettingDivider />
          <SettingRow>
            <SettingRowTitle>
              {t('settings.contextStrategy.maxMessages', { defaultValue: 'Max Messages' })}
              <InfoTooltip
                title={t('settings.contextStrategy.maxMessagesHelp', {
                  defaultValue:
                    'Maximum number of messages to keep. Leave empty for automatic (token-based) management.'
                })}
              />
            </SettingRowTitle>
            <InputNumber
              min={1}
              max={200}
              value={strategy.maxMessages}
              onChange={(value) => handleConfigChange('maxMessages', value ?? undefined)}
              placeholder={t('common.auto', { defaultValue: 'Auto' })}
              style={{ width: 100 }}
            />
          </SettingRow>
        </>
      )}

      {/* Summarization Options */}
      {strategy.type === 'summarize' && (
        <>
          <SettingDivider />
          <SettingRow>
            <SettingRowTitle>
              {t('settings.contextStrategy.summaryMaxTokens', { defaultValue: 'Summary Budget' })}
              <InfoTooltip
                title={t('settings.contextStrategy.summaryMaxTokensHelp', {
                  defaultValue: 'Maximum tokens allocated for the conversation summary.'
                })}
              />
            </SettingRowTitle>
            <HStack alignItems="center" gap={12} style={{ flex: 1, maxWidth: 300 }}>
              <Slider
                min={200}
                max={2000}
                step={100}
                value={strategy.summaryMaxTokens ?? DEFAULT_CONTEXT_STRATEGY_CONFIG.summaryMaxTokens}
                onChange={(value) => handleConfigChange('summaryMaxTokens', value)}
                style={{ flex: 1 }}
              />
              <span style={{ minWidth: 50, textAlign: 'right' }}>
                {strategy.summaryMaxTokens ?? DEFAULT_CONTEXT_STRATEGY_CONFIG.summaryMaxTokens}
              </span>
            </HStack>
          </SettingRow>
          <SettingDivider />
          <SettingRow>
            <SettingRowTitle>
              {t('settings.contextStrategy.summarizeThreshold', { defaultValue: 'Min Messages Before Summarizing' })}
              <InfoTooltip
                title={t('settings.contextStrategy.summarizeThresholdHelp', {
                  defaultValue: 'Minimum number of messages before summarization kicks in.'
                })}
              />
            </SettingRowTitle>
            <InputNumber
              min={4}
              max={20}
              value={strategy.summarizeThreshold ?? DEFAULT_CONTEXT_STRATEGY_CONFIG.summarizeThreshold}
              onChange={(value) => handleConfigChange('summarizeThreshold', value ?? undefined)}
              style={{ width: 100 }}
            />
          </SettingRow>
        </>
      )}

      {/* Hierarchical Memory Options */}
      {strategy.type === 'hierarchical' && (
        <>
          <SettingDivider />
          <SettingRow>
            <SettingRowTitle>
              {t('settings.contextStrategy.shortTermTurns', { defaultValue: 'Short-term Turns' })}
              <InfoTooltip
                title={t('settings.contextStrategy.shortTermTurnsHelp', {
                  defaultValue: 'Number of recent conversation turns to keep verbatim.'
                })}
              />
            </SettingRowTitle>
            <InputNumber
              min={1}
              max={20}
              value={strategy.shortTermTurns ?? DEFAULT_CONTEXT_STRATEGY_CONFIG.shortTermTurns}
              onChange={(value) => handleConfigChange('shortTermTurns', value ?? undefined)}
              style={{ width: 100 }}
            />
          </SettingRow>
          <SettingDivider />
          <SettingRow>
            <SettingRowTitle>
              {t('settings.contextStrategy.midTermBudget', { defaultValue: 'Mid-term Budget' })}
              <InfoTooltip
                title={t('settings.contextStrategy.midTermBudgetHelp', {
                  defaultValue: 'Token budget for mid-term memory summaries.'
                })}
              />
            </SettingRowTitle>
            <HStack alignItems="center" gap={12} style={{ flex: 1, maxWidth: 300 }}>
              <Slider
                min={500}
                max={5000}
                step={100}
                value={strategy.midTermSummaryTokens ?? DEFAULT_CONTEXT_STRATEGY_CONFIG.midTermSummaryTokens}
                onChange={(value) => handleConfigChange('midTermSummaryTokens', value)}
                style={{ flex: 1 }}
              />
              <span style={{ minWidth: 50, textAlign: 'right' }}>
                {strategy.midTermSummaryTokens ?? DEFAULT_CONTEXT_STRATEGY_CONFIG.midTermSummaryTokens}
              </span>
            </HStack>
          </SettingRow>
          <SettingDivider />
          <SettingRow>
            <SettingRowTitle>
              {t('settings.contextStrategy.longTermBudget', { defaultValue: 'Long-term Budget' })}
              <InfoTooltip
                title={t('settings.contextStrategy.longTermBudgetHelp', {
                  defaultValue: 'Token budget for extracted long-term facts and preferences.'
                })}
              />
            </SettingRowTitle>
            <HStack alignItems="center" gap={12} style={{ flex: 1, maxWidth: 300 }}>
              <Slider
                min={100}
                max={2000}
                step={100}
                value={strategy.longTermFactsTokens ?? DEFAULT_CONTEXT_STRATEGY_CONFIG.longTermFactsTokens}
                onChange={(value) => handleConfigChange('longTermFactsTokens', value)}
                style={{ flex: 1 }}
              />
              <span style={{ minWidth: 50, textAlign: 'right' }}>
                {strategy.longTermFactsTokens ?? DEFAULT_CONTEXT_STRATEGY_CONFIG.longTermFactsTokens}
              </span>
            </HStack>
          </SettingRow>
        </>
      )}

      {/* Truncate Middle Options */}
      {strategy.type === 'truncate_middle' && (
        <>
          <SettingDivider />
          <SettingRow>
            <SettingRowTitle>
              {t('settings.contextStrategy.keepFirst', { defaultValue: 'Keep First Messages' })}
              <InfoTooltip
                title={t('settings.contextStrategy.keepFirstHelp', {
                  defaultValue: 'Number of initial messages to preserve (system context, instructions).'
                })}
              />
            </SettingRowTitle>
            <InputNumber
              min={1}
              max={10}
              value={strategy.keepFirstMessages ?? DEFAULT_CONTEXT_STRATEGY_CONFIG.keepFirstMessages}
              onChange={(value) => handleConfigChange('keepFirstMessages', value ?? undefined)}
              style={{ width: 100 }}
            />
          </SettingRow>
          <SettingDivider />
          <SettingRow>
            <SettingRowTitle>
              {t('settings.contextStrategy.keepLast', { defaultValue: 'Keep Last Messages' })}
              <InfoTooltip
                title={t('settings.contextStrategy.keepLastHelp', {
                  defaultValue: 'Number of recent messages to preserve.'
                })}
              />
            </SettingRowTitle>
            <InputNumber
              min={1}
              max={20}
              value={strategy.keepLastMessages ?? DEFAULT_CONTEXT_STRATEGY_CONFIG.keepLastMessages}
              onChange={(value) => handleConfigChange('keepLastMessages', value ?? undefined)}
              style={{ width: 100 }}
            />
          </SettingRow>
        </>
      )}

      <SettingDescription>
        {t('settings.contextStrategy.description', {
          defaultValue:
            'Choose how to manage conversation context when it approaches model limits. This prevents "Prompt is too long" errors while preserving important context.'
        })}
      </SettingDescription>
    </SettingGroup>
  )
}

export default ContextManagementSettings
