import { ExportOutlined } from '@ant-design/icons'
import { InfoTooltip } from '@renderer/components/TooltipIcons'
import { getPreprocessProviderLogo, PREPROCESS_PROVIDER_CONFIG } from '@renderer/config/preprocessProviders'
import { usePreprocessProvider } from '@renderer/hooks/usePreprocess'
import { useAppDispatch, useAppSelector } from '@renderer/store'
import { updateMCPServer } from '@renderer/store/mcp'
import type { PreprocessProvider, UnstructuredOptions } from '@renderer/types'
import { BuiltinMCPServerNames } from '@renderer/types'
import { formatApiKeys } from '@renderer/utils'
import { Avatar, Button, Divider, Flex, Input, InputNumber, Select, Slider, Switch } from 'antd'
import Link from 'antd/es/typography/Link'
import type { FC } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import {
  SettingDivider,
  SettingHelpLink,
  SettingHelpText,
  SettingHelpTextRow,
  SettingRow,
  SettingRowTitle,
  SettingSubtitle,
  SettingTitle
} from '..'
import { UnstructuredMimeTypeSelector } from './UnstructuredMimeTypeSelector'

interface Props {
  provider: PreprocessProvider
}

export const UnstructuredSettings: FC<Props> = ({ provider: _provider }) => {
  const { provider, updateProvider } = usePreprocessProvider(_provider.id)
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const mcpServers = useAppSelector((state) => state.mcp.servers)

  const [apiKey, setApiKey] = useState(provider.apiKey || '')
  const [apiHost, setApiHost] = useState(provider.apiHost || '')

  const options = useMemo(() => (provider.options || {}) as UnstructuredOptions, [provider.options])
  const [strategy, setStrategy] = useState(options.strategy || 'auto')
  const [chunkingStrategy, setChunkingStrategy] = useState(options.chunkingStrategy || 'by_title')
  const [splitPdfPage, setSplitPdfPage] = useState(options.splitPdfPage ?? true)
  const [splitPdfConcurrencyLevel, setSplitPdfConcurrencyLevel] = useState(options.splitPdfConcurrencyLevel || 5)
  const [enableChatTool, setEnableChatTool] = useState(options.enableChatTool ?? false)
  const [enabledMimeTypes, setEnabledMimeTypes] = useState<string[]>(options.enabledMimeTypes || [])

  const preprocessProviderConfig = PREPROCESS_PROVIDER_CONFIG[provider.id]
  const apiKeyWebsite = preprocessProviderConfig?.websites?.apiKey
  const officialWebsite = preprocessProviderConfig?.websites?.official

  useEffect(() => {
    setApiKey(provider.apiKey ?? '')
    setApiHost(provider.apiHost ?? '')
    const opts = (provider.options || {}) as UnstructuredOptions
    setStrategy(opts.strategy || 'auto')
    setChunkingStrategy(opts.chunkingStrategy || 'by_title')
    setSplitPdfPage(opts.splitPdfPage ?? true)
    setSplitPdfConcurrencyLevel(opts.splitPdfConcurrencyLevel || 5)
    setEnableChatTool(opts.enableChatTool ?? false)
    setEnabledMimeTypes(opts.enabledMimeTypes || [])
  }, [provider])

  // Sync MCP server configuration with Unstructured config
  const syncMCPServer = useCallback(
    (updates: { apiKey?: string; apiHost?: string; isActive?: boolean }) => {
      const unstructuredServer = mcpServers.find((s) => s.name === BuiltinMCPServerNames.unstructured)
      if (unstructuredServer) {
        const updatedServer = {
          ...unstructuredServer,
          env: {
            ...unstructuredServer.env,
            ...(updates.apiKey !== undefined && { UNSTRUCTURED_API_KEY: updates.apiKey }),
            ...(updates.apiHost !== undefined && { UNSTRUCTURED_API_URL: updates.apiHost })
          },
          ...(updates.isActive !== undefined && { isActive: updates.isActive })
        }
        dispatch(updateMCPServer(updatedServer))
      }
    },
    [mcpServers, dispatch]
  )

  const onUpdateApiKey = () => {
    if (apiKey !== provider.apiKey) {
      updateProvider({ apiKey, quota: undefined })
      syncMCPServer({ apiKey })
    }
  }

  const onUpdateApiHost = () => {
    let trimmedHost = apiHost?.trim() || ''
    if (trimmedHost.endsWith('/')) {
      trimmedHost = trimmedHost.slice(0, -1)
    }
    if (trimmedHost !== provider.apiHost) {
      updateProvider({ apiHost: trimmedHost })
      syncMCPServer({ apiHost: trimmedHost })
    } else {
      setApiHost(provider.apiHost || '')
    }
  }

  const updateOptions = useCallback(
    (updates: Partial<UnstructuredOptions>) => {
      const newOptions = { ...options, ...updates }
      updateProvider({ options: newOptions })
    },
    [options, updateProvider]
  )

  const handleStrategyChange = (value: string) => {
    setStrategy(value as any)
    updateOptions({ strategy: value as any })
  }

  const handleChunkingStrategyChange = (value: string) => {
    setChunkingStrategy(value as any)
    updateOptions({ chunkingStrategy: value as any })
  }

  const handleSplitPdfPageChange = (checked: boolean) => {
    setSplitPdfPage(checked)
    updateOptions({ splitPdfPage: checked })
  }

  const handleConcurrencyChange = (value: number | null) => {
    const newValue = value || 5
    setSplitPdfConcurrencyLevel(newValue)
    updateOptions({ splitPdfConcurrencyLevel: newValue })
  }

  const handleEnableChatToolChange = (checked: boolean) => {
    setEnableChatTool(checked)
    updateOptions({ enableChatTool: checked })
    // Sync with MCP server
    syncMCPServer({ isActive: checked })
  }

  const handleMimeTypesChange = (types: string[]) => {
    setEnabledMimeTypes(types)
    updateOptions({ enabledMimeTypes: types })
  }

  const testConnection = async () => {
    try {
      await window.api.unstructured.testConnection(apiKey, apiHost)
      window.toast.success(t('settings.tool.preprocess.unstructured.health_check.success'))
    } catch (error) {
      window.toast.error(t('settings.tool.preprocess.unstructured.health_check.failed'))
    }
  }

  return (
    <>
      <SettingTitle>
        <Flex align="center" gap={8}>
          <ProviderLogo shape="square" src={getPreprocessProviderLogo(provider.id)} size={16} />
          <ProviderName>{provider.name}</ProviderName>
          {officialWebsite && (
            <Link target="_blank" href={officialWebsite}>
              <ExportOutlined style={{ color: 'var(--color-text)', fontSize: '12px' }} />
            </Link>
          )}
        </Flex>
      </SettingTitle>
      <Divider style={{ width: '100%', margin: '10px 0' }} />

      {/* API Key */}
      <SettingSubtitle style={{ marginTop: 5, marginBottom: 10 }}>
        {t('settings.tool.preprocess.unstructured.api_key')}
      </SettingSubtitle>
      <Flex gap={8}>
        <Input.Password
          value={apiKey}
          placeholder={t('settings.tool.preprocess.unstructured.api_key_placeholder')}
          onChange={(e) => setApiKey(formatApiKeys(e.target.value))}
          onBlur={onUpdateApiKey}
          spellCheck={false}
          type="password"
          autoFocus={apiKey === ''}
        />
      </Flex>
      <SettingHelpTextRow style={{ justifyContent: 'space-between', marginTop: 5 }}>
        <SettingHelpLink target="_blank" href={apiKeyWebsite}>
          {t('settings.provider.get_api_key')}
        </SettingHelpLink>
        <SettingHelpText>{t('settings.provider.api_key.tip')}</SettingHelpText>
      </SettingHelpTextRow>

      {/* API Host */}
      <SettingSubtitle style={{ marginTop: 15, marginBottom: 10 }}>
        {t('settings.tool.preprocess.unstructured.api_host')}
      </SettingSubtitle>
      <Flex>
        <Input
          value={apiHost}
          placeholder={t('settings.tool.preprocess.unstructured.api_host_placeholder')}
          onChange={(e) => setApiHost(e.target.value)}
          onBlur={onUpdateApiHost}
        />
      </Flex>

      {/* Health Check */}
      <Flex style={{ marginTop: 10 }}>
        <Button onClick={testConnection} disabled={!apiKey}>
          {t('settings.tool.preprocess.unstructured.health_check.button')}
        </Button>
      </Flex>

      <SettingDivider style={{ marginTop: 20, marginBottom: 15 }} />

      {/* Chat Tool Toggle */}
      <SettingRow>
        <SettingRowTitle>
          <Flex align="center" gap={4}>
            {t('settings.tool.preprocess.unstructured.chat_tool.label')}
            <InfoTooltip title={t('settings.tool.preprocess.unstructured.chat_tool.tooltip')} />
          </Flex>
        </SettingRowTitle>
        <Switch checked={enableChatTool} onChange={handleEnableChatToolChange} disabled={!apiKey} />
      </SettingRow>
      {enableChatTool && (
        <SettingHelpText style={{ marginTop: 5 }}>
          {t('settings.tool.preprocess.unstructured.chat_tool.tool_name')}
        </SettingHelpText>
      )}

      <SettingDivider style={{ marginTop: 15, marginBottom: 15 }} />

      {/* Processing Strategy */}
      <SettingRow>
        <SettingRowTitle>{t('settings.tool.preprocess.unstructured.options.strategy.label')}</SettingRowTitle>
        <Select
          style={{ minWidth: 200 }}
          value={strategy}
          onChange={handleStrategyChange}
          options={[
            {
              value: 'auto',
              label: t('settings.tool.preprocess.unstructured.options.strategy.auto')
            },
            {
              value: 'fast',
              label: t('settings.tool.preprocess.unstructured.options.strategy.fast')
            },
            {
              value: 'hi_res',
              label: t('settings.tool.preprocess.unstructured.options.strategy.hi_res')
            },
            {
              value: 'ocr_only',
              label: t('settings.tool.preprocess.unstructured.options.strategy.ocr_only')
            }
          ]}
        />
      </SettingRow>

      <SettingDivider style={{ marginTop: 15, marginBottom: 15 }} />

      {/* Chunking Strategy */}
      <SettingRow>
        <SettingRowTitle>{t('settings.tool.preprocess.unstructured.options.chunking_strategy.label')}</SettingRowTitle>
        <Select
          style={{ minWidth: 200 }}
          value={chunkingStrategy}
          onChange={handleChunkingStrategyChange}
          options={[
            {
              value: 'basic',
              label: t('settings.tool.preprocess.unstructured.options.chunking_strategy.basic')
            },
            {
              value: 'by_title',
              label: t('settings.tool.preprocess.unstructured.options.chunking_strategy.by_title')
            }
          ]}
        />
      </SettingRow>

      <SettingDivider style={{ marginTop: 15, marginBottom: 15 }} />

      {/* Split PDF Pages */}
      <SettingRow>
        <SettingRowTitle>
          <Flex align="center" gap={4}>
            {t('settings.tool.preprocess.unstructured.options.split_pdf.label')}
            <InfoTooltip title={t('settings.tool.preprocess.unstructured.options.split_pdf.tooltip')} />
          </Flex>
        </SettingRowTitle>
        <Switch checked={splitPdfPage} onChange={handleSplitPdfPageChange} />
      </SettingRow>

      {/* Concurrency Level */}
      {splitPdfPage && (
        <>
          <SettingDivider style={{ marginTop: 15, marginBottom: 15 }} />
          <SettingRow>
            <SettingRowTitle>
              <Flex align="center" gap={4}>
                {t('settings.tool.preprocess.unstructured.options.concurrency.label')}
                <InfoTooltip title={t('settings.tool.preprocess.unstructured.options.concurrency.tooltip')} />
              </Flex>
            </SettingRowTitle>
            <Flex gap={12} align="center" style={{ minWidth: 200 }}>
              <Slider
                min={1}
                max={15}
                value={splitPdfConcurrencyLevel}
                onChange={handleConcurrencyChange}
                style={{ flex: 1 }}
              />
              <InputNumber
                min={1}
                max={15}
                value={splitPdfConcurrencyLevel}
                onChange={handleConcurrencyChange}
                style={{ width: 60 }}
              />
            </Flex>
          </SettingRow>
        </>
      )}

      <SettingDivider style={{ marginTop: 20, marginBottom: 15 }} />

      {/* MIME Type Selector */}
      <UnstructuredMimeTypeSelector enabledMimeTypes={enabledMimeTypes} onChange={handleMimeTypesChange} />
    </>
  )
}

const ProviderName = styled.span`
  font-size: 14px;
  font-weight: 500;
`

const ProviderLogo = styled(Avatar)`
  border: 0.5px solid var(--color-border);
`
