import { Switch } from '@cherrystudio/ui'
import { HStack } from '@renderer/components/Layout'
import { InfoTooltip } from '@renderer/components/TooltipIcons'
import { useTheme } from '@renderer/context/ThemeProvider'
import { DEFAULT_MCP_CONTENT_CONFIG } from '@renderer/services/McpContentManager'
import { useAppDispatch } from '@renderer/store'
import {
  setMcpAutoSummarization,
  setMcpMaxCharactersForTruncation,
  setMcpMaxToolResultTokens,
  setMcpSummarizationThreshold,
  setMcpTargetSummarizedTokens
} from '@renderer/store/settings'
import { InputNumber, Slider } from 'antd'
import { FileText, Scissors } from 'lucide-react'
import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

import { SettingDescription, SettingDivider, SettingGroup, SettingRow, SettingRowTitle, SettingTitle } from '..'

interface SettingsStateSlice {
  settings: {
    mcpAutoSummarization: boolean
    mcpMaxToolResultTokens: number
    mcpSummarizationThreshold: number
    mcpTargetSummarizedTokens: number
    mcpMaxCharactersForTruncation: number
  }
}

/**
 * MCP Content Management Settings Component
 *
 * Provides UI for configuring MCP tool result content management.
 * This helps prevent "Prompt is too long" errors when MCP tools
 * (especially web search tools) return very large content.
 */
const McpContentSettings: FC = () => {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const mcpAutoSummarization = useSelector(
    (state: SettingsStateSlice) =>
      state.settings.mcpAutoSummarization ?? DEFAULT_MCP_CONTENT_CONFIG.enableAutoSummarization
  )
  const mcpMaxToolResultTokens = useSelector(
    (state: SettingsStateSlice) =>
      state.settings.mcpMaxToolResultTokens ?? DEFAULT_MCP_CONTENT_CONFIG.maxToolResultTokens
  )
  const mcpSummarizationThreshold = useSelector(
    (state: SettingsStateSlice) =>
      state.settings.mcpSummarizationThreshold ?? DEFAULT_MCP_CONTENT_CONFIG.summarizationThreshold
  )
  const mcpTargetSummarizedTokens = useSelector(
    (state: SettingsStateSlice) =>
      state.settings.mcpTargetSummarizedTokens ?? DEFAULT_MCP_CONTENT_CONFIG.targetSummarizedTokens
  )
  const mcpMaxCharactersForTruncation = useSelector(
    (state: SettingsStateSlice) =>
      state.settings.mcpMaxCharactersForTruncation ?? DEFAULT_MCP_CONTENT_CONFIG.maxCharactersForTruncation
  )

  return (
    <SettingGroup theme={theme}>
      <SettingTitle style={{ marginBottom: 12 }}>
        <HStack alignItems="center" gap={10}>
          <Scissors size={18} color="var(--color-text)" />
          {t('settings.mcpContent.title', { defaultValue: 'MCP Tool Content Management' })}
          <InfoTooltip
            title={t('settings.mcpContent.tooltip', {
              defaultValue:
                'Automatically manages large content from MCP tools (like web search) to prevent "Prompt is too long" errors. Large results are summarized or truncated before being sent to the model.'
            })}
          />
        </HStack>
      </SettingTitle>

      <SettingRow>
        <SettingRowTitle>
          {t('settings.mcpContent.autoSummarization', { defaultValue: 'Auto-Summarization' })}
          <InfoTooltip
            title={t('settings.mcpContent.autoSummarizationHelp', {
              defaultValue:
                'When enabled, large MCP tool results will be automatically summarized using the quick model. When disabled, large results will be truncated instead.'
            })}
          />
        </SettingRowTitle>
        <Switch
          checked={mcpAutoSummarization}
          onCheckedChange={(checked) => dispatch(setMcpAutoSummarization(checked))}
        />
      </SettingRow>

      <SettingDivider />

      <SettingRow>
        <SettingRowTitle>
          <HStack alignItems="center" gap={6}>
            <FileText size={14} />
            {t('settings.mcpContent.summarizationThreshold', { defaultValue: 'Summarization Threshold' })}
          </HStack>
          <InfoTooltip
            title={t('settings.mcpContent.summarizationThresholdHelp', {
              defaultValue:
                'Token count that triggers automatic summarization. Content exceeding this will be processed. Lower values mean more aggressive summarization.'
            })}
          />
        </SettingRowTitle>
        <HStack alignItems="center" gap={12} style={{ flex: 1, maxWidth: 350 }}>
          <Slider
            min={5000}
            max={100000}
            step={5000}
            value={mcpSummarizationThreshold}
            onChange={(value) => dispatch(setMcpSummarizationThreshold(value))}
            style={{ flex: 1 }}
            tooltip={{
              formatter: (value) => `${(value || 0).toLocaleString()} tokens`
            }}
          />
          <span style={{ minWidth: 70, textAlign: 'right', fontSize: 12 }}>
            {mcpSummarizationThreshold.toLocaleString()}
          </span>
        </HStack>
      </SettingRow>

      <SettingDivider />

      <SettingRow>
        <SettingRowTitle>
          {t('settings.mcpContent.targetSummarizedTokens', { defaultValue: 'Target Summary Size' })}
          <InfoTooltip
            title={t('settings.mcpContent.targetSummarizedTokensHelp', {
              defaultValue:
                'Target token count after summarization. Larger values preserve more detail but use more context. Recommended: 4000-12000 tokens.'
            })}
          />
        </SettingRowTitle>
        <HStack alignItems="center" gap={12} style={{ flex: 1, maxWidth: 350 }}>
          <Slider
            min={2000}
            max={20000}
            step={1000}
            value={mcpTargetSummarizedTokens}
            onChange={(value) => dispatch(setMcpTargetSummarizedTokens(value))}
            style={{ flex: 1 }}
            tooltip={{
              formatter: (value) => `${(value || 0).toLocaleString()} tokens`
            }}
          />
          <span style={{ minWidth: 70, textAlign: 'right', fontSize: 12 }}>
            {mcpTargetSummarizedTokens.toLocaleString()}
          </span>
        </HStack>
      </SettingRow>

      <SettingDivider />

      <SettingRow>
        <SettingRowTitle>
          {t('settings.mcpContent.maxToolResultTokens', { defaultValue: 'Max Result Tokens' })}
          <InfoTooltip
            title={t('settings.mcpContent.maxToolResultTokensHelp', {
              defaultValue:
                'Absolute maximum tokens allowed for a single MCP tool result. Results exceeding this will always be processed regardless of other settings.'
            })}
          />
        </SettingRowTitle>
        <InputNumber
          min={10000}
          max={200000}
          step={10000}
          value={mcpMaxToolResultTokens}
          onChange={(value) =>
            dispatch(setMcpMaxToolResultTokens(value ?? DEFAULT_MCP_CONTENT_CONFIG.maxToolResultTokens))
          }
          style={{ width: 110 }}
          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(value) => Number(value?.replace(/,/g, '') ?? 0)}
        />
      </SettingRow>

      <SettingDivider />

      <SettingRow>
        <SettingRowTitle>
          {t('settings.mcpContent.maxCharactersForTruncation', { defaultValue: 'Truncation Limit (chars)' })}
          <InfoTooltip
            title={t('settings.mcpContent.maxCharactersForTruncationHelp', {
              defaultValue:
                'Maximum characters to keep when truncating (fallback when summarization fails or is disabled). Content beyond this is removed.'
            })}
          />
        </SettingRowTitle>
        <InputNumber
          min={10000}
          max={500000}
          step={10000}
          value={mcpMaxCharactersForTruncation}
          onChange={(value) =>
            dispatch(setMcpMaxCharactersForTruncation(value ?? DEFAULT_MCP_CONTENT_CONFIG.maxCharactersForTruncation))
          }
          style={{ width: 110 }}
          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(value) => Number(value?.replace(/,/g, '') ?? 0)}
        />
      </SettingRow>

      <SettingDescription>
        {t('settings.mcpContent.description', {
          defaultValue:
            'These settings help prevent "Prompt is too long" errors when MCP tools return large content (e.g., web search results, extracted pages). Large content is automatically summarized or truncated before being sent to the model.'
        })}
      </SettingDescription>
    </SettingGroup>
  )
}

export default McpContentSettings
