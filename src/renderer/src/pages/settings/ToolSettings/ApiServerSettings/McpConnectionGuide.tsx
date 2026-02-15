import { useTheme } from '@renderer/context/ThemeProvider'
import type { RootState } from '@renderer/store'
import { API_SERVER_DEFAULTS } from '@shared/config/constant'
import { Collapse, Typography } from 'antd'
import { Check, ChevronDown, Copy } from 'lucide-react'
import type { FC } from 'react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import styled from 'styled-components'

const { Text, Title } = Typography

// ─── Tool configuration definitions ──────────────────────────────────────────

interface ToolConfig {
  id: string
  name: string
  icon: string
  configPath: string
  configPathWindows?: string
  format: 'json' | 'toml' | 'cli'
  notes?: string[]
  /** Generate the config snippet for this tool */
  snippet: (baseUrl: string, apiKey: string) => string
}

function buildToolConfigs(): ToolConfig[] {
  return [
    {
      id: 'claude-desktop',
      name: 'Claude Desktop',
      icon: '🤖',
      configPath: '~/Library/Application Support/Claude/claude_desktop_config.json',
      configPathWindows: '%APPDATA%\\Claude\\claude_desktop_config.json',
      format: 'json',
      snippet: (baseUrl, apiKey) =>
        JSON.stringify(
          {
            mcpServers: {
              'cherry-studio-agents': {
                url: `${baseUrl}/v1/mcp-servers/agents`,
                headers: { Authorization: `Bearer ${apiKey}` }
              },
              'cherry-studio-knowledge': {
                url: `${baseUrl}/v1/mcp-servers/knowledge`,
                headers: { Authorization: `Bearer ${apiKey}` }
              }
            }
          },
          null,
          2
        )
    },
    {
      id: 'claude-code',
      name: 'Claude Code',
      icon: '⌨️',
      configPath: '~/.claude.json (or use CLI)',
      format: 'cli',
      notes: ['Run these commands in your terminal:'],
      snippet: (baseUrl, apiKey) =>
        [
          `claude mcp add-json cherry-studio-agents '${JSON.stringify({ type: 'http', url: `${baseUrl}/v1/mcp-servers/agents`, headers: { Authorization: `Bearer ${apiKey}` } })}'`,
          '',
          `claude mcp add-json cherry-studio-knowledge '${JSON.stringify({ type: 'http', url: `${baseUrl}/v1/mcp-servers/knowledge`, headers: { Authorization: `Bearer ${apiKey}` } })}'`
        ].join('\n')
    },
    {
      id: 'antigravity',
      name: 'Antigravity (Gemini)',
      icon: '💎',
      configPath: 'Settings → MCP Servers (settings.json)',
      format: 'json',
      notes: [
        'Use serverUrl (not url) for Streamable HTTP transport.',
        'If you get "standalone SSE stream" errors, use mcp-remote as a fallback:'
      ],
      snippet: (baseUrl, apiKey) =>
        JSON.stringify(
          {
            mcpServers: {
              'cherry-studio-agents': {
                serverUrl: `${baseUrl}/v1/mcp-servers/agents`,
                headers: { Authorization: `Bearer ${apiKey}` }
              },
              'cherry-studio-knowledge': {
                serverUrl: `${baseUrl}/v1/mcp-servers/knowledge`,
                headers: { Authorization: `Bearer ${apiKey}` }
              }
            }
          },
          null,
          2
        ) +
        '\n\n# Fallback (if Streamable HTTP fails):\n' +
        JSON.stringify(
          {
            mcpServers: {
              'cherry-studio-agents': {
                command: 'npx',
                args: ['-y', 'mcp-remote', `${baseUrl}/v1/mcp-servers/agents`],
                env: { AUTHORIZATION: `Bearer ${apiKey}` }
              }
            }
          },
          null,
          2
        )
    },
    {
      id: 'opencode',
      name: 'OpenCode',
      icon: '📟',
      configPath: 'opencode.json (project root)',
      format: 'json',
      notes: ['Uses type: "remote" with url and headers.'],
      snippet: (baseUrl, apiKey) =>
        JSON.stringify(
          {
            mcp: {
              'cherry-studio-agents': {
                type: 'remote',
                url: `${baseUrl}/v1/mcp-servers/agents`,
                headers: { Authorization: `Bearer ${apiKey}` },
                enabled: true
              },
              'cherry-studio-knowledge': {
                type: 'remote',
                url: `${baseUrl}/v1/mcp-servers/knowledge`,
                headers: { Authorization: `Bearer ${apiKey}` },
                enabled: true
              }
            }
          },
          null,
          2
        )
    },
    {
      id: 'zed',
      name: 'Zed IDE',
      icon: '⚡',
      configPath: 'Settings → context_servers in settings.json',
      format: 'json',
      notes: [
        'Zed supports Streamable HTTP via the url key in context_servers.',
        'If your Zed version does not yet support it, use mcp-remote as a shim.'
      ],
      snippet: (baseUrl, apiKey) =>
        JSON.stringify(
          {
            context_servers: {
              'cherry-studio-agents': {
                url: `${baseUrl}/v1/mcp-servers/agents`,
                headers: { Authorization: `Bearer ${apiKey}` }
              },
              'cherry-studio-knowledge': {
                url: `${baseUrl}/v1/mcp-servers/knowledge`,
                headers: { Authorization: `Bearer ${apiKey}` }
              }
            }
          },
          null,
          2
        )
    },
    {
      id: 'roo-code',
      name: 'Roo Code',
      icon: '🦘',
      configPath: 'VS Code → Roo Code MCP Settings (mcp.json)',
      format: 'json',
      notes: ['Roo Code uses type: "streamable-http" (kebab-case).'],
      snippet: (baseUrl, apiKey) =>
        JSON.stringify(
          {
            mcpServers: {
              'cherry-studio-agents': {
                type: 'streamable-http',
                url: `${baseUrl}/v1/mcp-servers/agents`,
                headers: { Authorization: `Bearer ${apiKey}` },
                disabled: false
              },
              'cherry-studio-knowledge': {
                type: 'streamable-http',
                url: `${baseUrl}/v1/mcp-servers/knowledge`,
                headers: { Authorization: `Bearer ${apiKey}` },
                disabled: false
              }
            }
          },
          null,
          2
        )
    },
    {
      id: 'kilo-code',
      name: 'Kilo Code',
      icon: '🔷',
      configPath: 'VS Code → Kilo Code MCP Settings (mcp.json)',
      format: 'json',
      notes: ['Kilo Code uses the same format as Roo Code: type: "streamable-http".'],
      snippet: (baseUrl, apiKey) =>
        JSON.stringify(
          {
            mcpServers: {
              'cherry-studio-agents': {
                type: 'streamable-http',
                url: `${baseUrl}/v1/mcp-servers/agents`,
                headers: { Authorization: `Bearer ${apiKey}` },
                disabled: false
              },
              'cherry-studio-knowledge': {
                type: 'streamable-http',
                url: `${baseUrl}/v1/mcp-servers/knowledge`,
                headers: { Authorization: `Bearer ${apiKey}` },
                disabled: false
              }
            }
          },
          null,
          2
        )
    },
    {
      id: 'codex',
      name: 'Codex / Codex Desktop',
      icon: '🧬',
      configPath: '~/.codex/config.toml',
      format: 'toml',
      notes: ['Codex CLI uses TOML config.', 'Requires experimental_use_rmcp_client = true for Streamable HTTP.'],
      snippet: (baseUrl, apiKey) =>
        [
          'experimental_use_rmcp_client = true',
          '',
          '[mcp_servers.cherry-studio-agents]',
          `url = "${baseUrl}/v1/mcp-servers/agents"`,
          '',
          `[mcp_servers.cherry-studio-agents.headers]`,
          `Authorization = "Bearer ${apiKey}"`,
          '',
          '[mcp_servers.cherry-studio-knowledge]',
          `url = "${baseUrl}/v1/mcp-servers/knowledge"`,
          '',
          `[mcp_servers.cherry-studio-knowledge.headers]`,
          `Authorization = "Bearer ${apiKey}"`
        ].join('\n')
    },
    {
      id: 'cursor',
      name: 'Cursor',
      icon: '🖱️',
      configPath: '.cursor/mcp.json (project root)',
      format: 'json',
      notes: ['Cursor supports Streamable HTTP with the url key.'],
      snippet: (baseUrl, apiKey) =>
        JSON.stringify(
          {
            mcpServers: {
              'cherry-studio-agents': {
                url: `${baseUrl}/v1/mcp-servers/agents`,
                headers: { Authorization: `Bearer ${apiKey}` }
              },
              'cherry-studio-knowledge': {
                url: `${baseUrl}/v1/mcp-servers/knowledge`,
                headers: { Authorization: `Bearer ${apiKey}` }
              }
            }
          },
          null,
          2
        )
    },
    {
      id: 'windsurf',
      name: 'Windsurf',
      icon: '🏄',
      configPath: '~/.codeium/windsurf/mcp_config.json',
      format: 'json',
      notes: ['Windsurf uses serverUrl (not url) for Streamable HTTP.'],
      snippet: (baseUrl, apiKey) =>
        JSON.stringify(
          {
            mcpServers: {
              'cherry-studio-agents': {
                serverUrl: `${baseUrl}/v1/mcp-servers/agents`,
                headers: { Authorization: `Bearer ${apiKey}` }
              },
              'cherry-studio-knowledge': {
                serverUrl: `${baseUrl}/v1/mcp-servers/knowledge`,
                headers: { Authorization: `Bearer ${apiKey}` }
              }
            }
          },
          null,
          2
        )
    },
    {
      id: 'warp',
      name: 'Warp Terminal',
      icon: '🚀',
      configPath: 'Settings → AI → MCP Servers → + Add',
      format: 'json',
      notes: ['Paste the JSON directly into the Warp MCP server dialog.'],
      snippet: (baseUrl, apiKey) =>
        JSON.stringify(
          {
            mcpServers: {
              'cherry-studio-agents': {
                url: `${baseUrl}/v1/mcp-servers/agents`,
                headers: { Authorization: `Bearer ${apiKey}` }
              },
              'cherry-studio-knowledge': {
                url: `${baseUrl}/v1/mcp-servers/knowledge`,
                headers: { Authorization: `Bearer ${apiKey}` }
              }
            }
          },
          null,
          2
        )
    }
  ]
}

// ─── Component ───────────────────────────────────────────────────────────────

const McpConnectionGuide: FC = () => {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const apiServerConfig = useSelector((state: RootState) => state.settings.apiServer)

  const host = apiServerConfig.host || API_SERVER_DEFAULTS.HOST
  const port = apiServerConfig.port || API_SERVER_DEFAULTS.PORT
  const baseUrl = `http://${host}:${port}`
  const apiKey = apiServerConfig.apiKey || 'your-api-key'

  const tools = buildToolConfigs()

  const collapseItems = tools.map((tool) => ({
    key: tool.id,
    label: (
      <ToolHeader>
        <ToolIcon>{tool.icon}</ToolIcon>
        <ToolName>{tool.name}</ToolName>
        <FormatBadge $format={tool.format}>{tool.format.toUpperCase()}</FormatBadge>
      </ToolHeader>
    ),
    children: <ToolContent tool={tool} baseUrl={baseUrl} apiKey={apiKey} />
  }))

  return (
    <GuideContainer theme={theme}>
      <SectionHeader>
        <Title level={5} style={{ margin: 0 }}>
          {t('apiServer.mcpGuide.title')}
        </Title>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t('apiServer.mcpGuide.description')}
        </Text>
        <Text type="secondary" style={{ fontSize: 11, marginTop: 4 }}>
          💡 For per-agent or per-KB endpoints, use{' '}
          <code>
            /v1/mcp-servers/agents/{'{'}
            <em>agentId</em>
            {'}'}
          </code>{' '}
          or{' '}
          <code>
            /v1/mcp-servers/knowledge/{'{'}
            <em>kbId</em>
            {'}'}
          </code>
          . Discover available IDs via <code>GET /v1/agents</code> or <code>GET /v1/knowledge-bases</code>.
        </Text>
      </SectionHeader>

      <StyledCollapse
        accordion
        expandIcon={({ isActive }) => (
          <ChevronDown
            size={14}
            style={{ transform: isActive ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
          />
        )}
        items={collapseItems}
      />
    </GuideContainer>
  )
}

// ─── ToolContent sub-component ───────────────────────────────────────────────

interface ToolContentProps {
  tool: ToolConfig
  baseUrl: string
  apiKey: string
}

const ToolContent: FC<ToolContentProps> = ({ tool, baseUrl, apiKey }) => {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const snippet = tool.snippet(baseUrl, apiKey)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [snippet])

  const language = tool.format === 'toml' ? 'toml' : tool.format === 'cli' ? 'bash' : 'json'

  return (
    <ContentWrapper>
      <ConfigPathRow>
        <ConfigPathLabel>{t('apiServer.mcpGuide.configPath')}</ConfigPathLabel>
        <ConfigPathValue>{tool.configPath}</ConfigPathValue>
        {tool.configPathWindows && (
          <ConfigPathValue style={{ marginTop: 2 }}>Windows: {tool.configPathWindows}</ConfigPathValue>
        )}
      </ConfigPathRow>

      {tool.notes && tool.notes.length > 0 && (
        <NotesSection>
          {tool.notes.map((note, i) => (
            <NoteItem key={i}>💡 {note}</NoteItem>
          ))}
        </NotesSection>
      )}

      <SnippetSection>
        <SnippetHeader>
          <SnippetLanguage>{language}</SnippetLanguage>
          <CopyButton onClick={handleCopy}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? t('apiServer.mcpGuide.copied') : t('apiServer.mcpGuide.copy')}</span>
          </CopyButton>
        </SnippetHeader>
        <CodeBlock>
          <code>{snippet}</code>
        </CodeBlock>
      </SnippetSection>
    </ContentWrapper>
  )
}

// ─── Styled Components ───────────────────────────────────────────────────────

const GuideContainer = styled.div`
  margin-top: 16px;
  padding: 16px;
  background: var(--color-background);
  border-radius: 8px;
  border: 1px solid var(--color-border);
`

const SectionHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
`

const StyledCollapse = styled(Collapse)`
  background: transparent;
  border: none;

  .ant-collapse-item {
    border: 1px solid var(--color-border);
    border-radius: 6px !important;
    margin-bottom: 8px;
    overflow: hidden;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .ant-collapse-header {
    padding: 12px 16px !important;
    align-items: center !important;
  }

  .ant-collapse-content {
    border-top: 1px solid var(--color-border);
  }

  .ant-collapse-content-box {
    padding: 12px 16px !important;
  }
`

const ToolHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const ToolIcon = styled.span`
  font-size: 18px;
  line-height: 1;
`

const ToolName = styled.span`
  font-weight: 600;
  font-size: 14px;
  color: var(--color-text-1);
`

const FormatBadge = styled.span<{ $format: string }>`
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  color: var(--color-text-3);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
`

const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const ConfigPathRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const ConfigPathLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const ConfigPathValue = styled.span`
  font-size: 12px;
  color: var(--color-text-2);
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
`

const NotesSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const NoteItem = styled.div`
  font-size: 12px;
  color: var(--color-text-2);
  line-height: 1.4;
`

const SnippetSection = styled.div`
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;
`

const SnippetHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
`

const SnippetLanguage = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-3);
  text-transform: uppercase;
`

const CopyButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  font-size: 12px;
  color: var(--color-text-2);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s ease;

  &:hover {
    background: var(--color-background-mute);
    color: var(--color-primary);
  }
`

const CodeBlock = styled.pre`
  margin: 0;
  padding: 12px 16px;
  background: var(--color-background-mute);
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-text-1);
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;

  code {
    white-space: pre;
  }
`

export default McpConnectionGuide
