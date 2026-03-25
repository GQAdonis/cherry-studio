import { ExportOutlined } from '@ant-design/icons'
import { Switch } from '@cherrystudio/ui'
import E2BLogo from '@renderer/assets/images/providers/e2b.png'
import { InfoTooltip } from '@renderer/components/TooltipIcons'
import { useTheme } from '@renderer/context/ThemeProvider'
import { useAppDispatch, useAppSelector } from '@renderer/store'
import { updateE2BConfig, updateE2BOptions } from '@renderer/store/e2b'
import { updateMCPServer } from '@renderer/store/mcp'
import type { E2BOptions } from '@renderer/types'
import { BuiltinMCPServerNames } from '@renderer/types'
import { formatApiKeys } from '@renderer/utils'
import { Avatar, Button, Divider, Flex, Input, InputNumber, Select, Slider } from 'antd'
import Link from 'antd/es/typography/Link'
import type { FC } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import {
  SettingContainer,
  SettingDivider,
  SettingGroup,
  SettingHelpLink,
  SettingHelpText,
  SettingHelpTextRow,
  SettingRow,
  SettingRowTitle,
  SettingSubtitle,
  SettingTitle
} from '..'

const E2BSettings: FC = () => {
  const { t } = useTranslation()
  const { theme: themeMode } = useTheme()
  const dispatch = useAppDispatch()
  const config = useAppSelector((state) => state.e2b)
  const mcpServers = useAppSelector((state) => state.mcp.servers)

  const [apiKey, setApiKey] = useState(config.apiKey || '')
  const [apiUrl, setApiUrl] = useState(config.apiHost || 'https://api.e2b.dev')
  const [sandboxMode, setSandboxMode] = useState<'per-session' | 'persistent'>(
    config.options?.sandboxMode || 'per-session'
  )
  const [timeout, setTimeout] = useState(config.options?.timeout || 300)
  const [template, setTemplate] = useState(config.options?.template || '')
  const [enableChatTool, setEnableChatTool] = useState(config.options?.enableChatTool ?? false)

  useEffect(() => {
    setApiKey(config.apiKey ?? '')
    setApiUrl(config.apiHost ?? 'https://api.e2b.dev')
    setSandboxMode(config.options?.sandboxMode || 'per-session')
    setTimeout(config.options?.timeout || 300)
    setTemplate(config.options?.template || '')
    setEnableChatTool(config.options?.enableChatTool ?? false)
  }, [config])

  // Sync MCP server configuration with E2B config
  const syncMCPServer = useCallback(
    (updates: { apiKey?: string; apiUrl?: string; isActive?: boolean }) => {
      const e2bServer = mcpServers.find((s) => s.name === BuiltinMCPServerNames.e2b)
      if (e2bServer) {
        const updatedServer = {
          ...e2bServer,
          env: {
            ...e2bServer.env,
            ...(updates.apiKey !== undefined && { E2B_API_KEY: updates.apiKey }),
            ...(updates.apiUrl !== undefined && { E2B_API_URL: updates.apiUrl })
          },
          ...(updates.isActive !== undefined && { isActive: updates.isActive })
        }
        dispatch(updateMCPServer(updatedServer))
      }
    },
    [mcpServers, dispatch]
  )

  const onUpdateApiKey = () => {
    if (apiKey !== config.apiKey) {
      dispatch(updateE2BConfig({ apiKey }))
      syncMCPServer({ apiKey })
    }
  }

  const onUpdateApiUrl = () => {
    let trimmedUrl = apiUrl?.trim() || 'https://api.e2b.dev'
    if (trimmedUrl.endsWith('/')) {
      trimmedUrl = trimmedUrl.slice(0, -1)
    }
    if (trimmedUrl !== config.apiHost) {
      dispatch(updateE2BConfig({ apiHost: trimmedUrl }))
      syncMCPServer({ apiUrl: trimmedUrl })
    } else {
      setApiUrl(config.apiHost || 'https://api.e2b.dev')
    }
  }

  const updateOptions = useCallback(
    (updates: Partial<E2BOptions>) => {
      dispatch(updateE2BOptions(updates))
    },
    [dispatch]
  )

  const handleSandboxModeChange = (value: 'per-session' | 'persistent') => {
    setSandboxMode(value)
    updateOptions({ sandboxMode: value })
  }

  const handleTimeoutChange = (value: number | null) => {
    const newValue = value || 300
    setTimeout(newValue)
    updateOptions({ timeout: newValue })
  }

  const handleTemplateChange = (value: string) => {
    setTemplate(value)
    updateOptions({ template: value || undefined })
  }

  const handleEnableChatToolChange = (checked: boolean) => {
    setEnableChatTool(checked)
    updateOptions({ enableChatTool: checked })
    // Sync with MCP server
    syncMCPServer({ isActive: checked })
  }

  const testConnection = async () => {
    try {
      await window.api.e2b.testConnection(apiKey, apiUrl)
      window.toast.success(t('settings.tool.preprocess.e2b.health_check.success'))
    } catch (error) {
      window.toast.error(t('settings.tool.preprocess.e2b.health_check.failed'))
    }
  }

  return (
    <SettingContainer theme={themeMode}>
      <SettingGroup theme={themeMode}>
        <SettingTitle>
          <Flex align="center" gap={8}>
            <ProviderLogo shape="square" src={E2BLogo} size={16} />
            <ProviderName>E2B Code Interpreter</ProviderName>
            <Link target="_blank" href="https://e2b.dev">
              <ExportOutlined style={{ color: 'var(--color-text)', fontSize: '12px' }} />
            </Link>
          </Flex>
        </SettingTitle>
        <Divider style={{ width: '100%', margin: '10px 0' }} />

        {/* API Key */}
        <SettingSubtitle style={{ marginTop: 5, marginBottom: 10 }}>
          {t('settings.tool.preprocess.e2b.api_key')}
        </SettingSubtitle>
        <Flex gap={8}>
          <Input.Password
            value={apiKey}
            placeholder={t('settings.tool.preprocess.e2b.api_key_placeholder')}
            onChange={(e) => setApiKey(formatApiKeys(e.target.value))}
            onBlur={onUpdateApiKey}
            spellCheck={false}
            type="password"
            autoFocus={apiKey === ''}
          />
        </Flex>
        <SettingHelpTextRow style={{ justifyContent: 'space-between', marginTop: 5 }}>
          <SettingHelpLink target="_blank" href="https://e2b.dev/docs/api-key">
            {t('settings.provider.get_api_key')}
          </SettingHelpLink>
          <SettingHelpText>{t('settings.provider.api_key.tip')}</SettingHelpText>
        </SettingHelpTextRow>

        {/* API URL */}
        <SettingSubtitle style={{ marginTop: 15, marginBottom: 10 }}>
          {t('settings.tool.preprocess.e2b.api_url')}
        </SettingSubtitle>
        <Flex>
          <Input
            value={apiUrl}
            placeholder={t('settings.tool.preprocess.e2b.api_url_placeholder')}
            onChange={(e) => setApiUrl(e.target.value)}
            onBlur={onUpdateApiUrl}
          />
        </Flex>
        <SettingHelpText style={{ marginTop: 5 }}>
          Default: https://api.e2b.dev (For self-hosted, enter your custom URL)
        </SettingHelpText>

        {/* Health Check */}
        <Flex style={{ marginTop: 10 }}>
          <Button onClick={testConnection} disabled={!apiKey}>
            {t('settings.tool.preprocess.e2b.health_check.button')}
          </Button>
        </Flex>

        <SettingDivider style={{ marginTop: 20, marginBottom: 15 }} />

        {/* Chat Tool Toggle */}
        <SettingRow>
          <SettingRowTitle>
            <Flex align="center" gap={4}>
              {t('settings.tool.preprocess.e2b.chat_tool.label')}
              <InfoTooltip title={t('settings.tool.preprocess.e2b.chat_tool.tooltip')} />
            </Flex>
          </SettingRowTitle>
          <Switch checked={enableChatTool} onCheckedChange={handleEnableChatToolChange} disabled={!apiKey} />
        </SettingRow>
        {enableChatTool && (
          <>
            <SettingHelpText style={{ marginTop: 5 }}>
              {t('settings.tool.preprocess.e2b.chat_tool.description')}
            </SettingHelpText>
            <SettingHelpText style={{ marginTop: 2 }}>
              {t('settings.tool.preprocess.e2b.chat_tool.tool_name')}
            </SettingHelpText>
          </>
        )}

        <SettingDivider style={{ marginTop: 15, marginBottom: 15 }} />

        {/* Sandbox Mode */}
        <SettingRow>
          <SettingRowTitle>
            <Flex align="center" gap={4}>
              {t('settings.tool.preprocess.e2b.options.sandbox_mode.label')}
              <InfoTooltip title={t('settings.tool.preprocess.e2b.options.sandbox_mode.tooltip')} />
            </Flex>
          </SettingRowTitle>
          <Select
            style={{ minWidth: 200 }}
            value={sandboxMode}
            onChange={handleSandboxModeChange}
            options={[
              {
                value: 'per-session',
                label: t('settings.tool.preprocess.e2b.options.sandbox_mode.per_session')
              },
              {
                value: 'persistent',
                label: t('settings.tool.preprocess.e2b.options.sandbox_mode.persistent')
              }
            ]}
          />
        </SettingRow>

        <SettingDivider style={{ marginTop: 15, marginBottom: 15 }} />

        {/* Timeout */}
        <SettingRow>
          <SettingRowTitle>
            <Flex align="center" gap={4}>
              {t('settings.tool.preprocess.e2b.options.timeout.label')}
              <InfoTooltip title={t('settings.tool.preprocess.e2b.options.timeout.tooltip')} />
            </Flex>
          </SettingRowTitle>
          <Flex gap={12} align="center" style={{ minWidth: 200 }}>
            <Slider
              min={30}
              max={600}
              value={timeout}
              onChange={handleTimeoutChange}
              style={{ flex: 1 }}
              marks={{
                30: '30s',
                300: '5m',
                600: '10m'
              }}
            />
            <InputNumber
              min={30}
              max={600}
              value={timeout}
              onChange={handleTimeoutChange}
              style={{ width: 80 }}
              addonAfter="s"
            />
          </Flex>
        </SettingRow>

        <SettingDivider style={{ marginTop: 15, marginBottom: 15 }} />

        {/* Custom Template */}
        <SettingRow>
          <SettingRowTitle>
            <Flex align="center" gap={4}>
              {t('settings.tool.preprocess.e2b.options.template.label')}
              <InfoTooltip title={t('settings.tool.preprocess.e2b.options.template.tooltip')} />
            </Flex>
          </SettingRowTitle>
          <Input
            style={{ minWidth: 200 }}
            value={template}
            placeholder={t('settings.tool.preprocess.e2b.options.template.placeholder')}
            onChange={(e) => handleTemplateChange(e.target.value)}
          />
        </SettingRow>
      </SettingGroup>
    </SettingContainer>
  )
}

const ProviderName = styled.span`
  font-size: 14px;
  font-weight: 500;
`

const ProviderLogo = styled(Avatar)`
  border: 0.5px solid var(--color-border);
`

export default E2BSettings
