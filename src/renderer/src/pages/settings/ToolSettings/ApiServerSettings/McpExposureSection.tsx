/**
 * MCP Exposure Section
 *
 * Centralized settings for managing which resources (agents, knowledge bases,
 * MCP servers) are exposed as MCP endpoints for external AI tools.
 */
import { useAgentClient } from '@renderer/hooks/agents/useAgentClient'
import { useAgents } from '@renderer/hooks/agents/useAgents'
import { useAppDispatch } from '@renderer/store'
import { setKnowledgeBaseExposed } from '@renderer/store/knowledge'
import { setMcpExposureEnabled } from '@renderer/store/settings'
import { Badge, Collapse, Switch, Typography } from 'antd'
import { BookOpen, Bot, Globe, Server } from 'lucide-react'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import styled from 'styled-components'

import type { RootState } from '../../../../store'
import { setMcpServerExposed } from '../../../../store/mcp'

const { Text } = Typography

const McpExposureSection: FC = () => {
  const dispatch = useAppDispatch()
  const { t } = useTranslation()
  const client = useAgentClient()

  // State selectors
  const mcpExposureEnabled = useSelector((state: RootState) => state.settings.apiServer.mcpExposureEnabled ?? false)
  const mcpServers = useSelector((state: RootState) => state.mcp.servers ?? [])
  const knowledgeBases = useSelector((state: RootState) => state.knowledge.bases ?? [])

  // Agent data from API
  const { agents, isLoading: agentsLoading } = useAgents()

  // Computed counts
  const activeServers = useMemo(() => mcpServers.filter((s) => s.isActive), [mcpServers])
  const exposedServers = useMemo(() => mcpServers.filter((s) => s.exposedViaMcp), [mcpServers])
  const exposedKBs = useMemo(() => knowledgeBases.filter((kb) => kb.exposedViaMcp), [knowledgeBases])
  const exposedAgents = useMemo(() => agents.filter((a) => a.exposed_via_mcp), [agents])

  // Toggle agent exposure via API
  const toggleAgentExposure = useCallback(
    async (agentId: string, exposed: boolean) => {
      try {
        await client.updateAgent({ id: agentId, exposed_via_mcp: exposed } as any)
        // SWR will auto-refresh via the useAgents hook
      } catch {
        // Agent exposure update failed — will be retried on next toggle
      }
    },
    [client]
  )

  const statusParts: string[] = []
  if (exposedAgents.length > 0)
    statusParts.push(`${exposedAgents.length} ${t('apiServer.mcpExposure.agents.title').toLowerCase()}`)
  if (exposedKBs.length > 0)
    statusParts.push(`${exposedKBs.length} ${t('apiServer.mcpExposure.knowledgeBases.title').toLowerCase()}`)
  if (exposedServers.length > 0)
    statusParts.push(`${exposedServers.length} ${t('apiServer.mcpExposure.mcpServers.title').toLowerCase()}`)

  return (
    <SectionContainer>
      {/* Master Toggle */}
      <MasterToggleRow>
        <ToggleInfo>
          <ToggleIcon>
            <Globe size={18} />
          </ToggleIcon>
          <div>
            <ToggleLabel>{t('apiServer.mcpExposure.title')}</ToggleLabel>
            <ToggleDescription>{t('apiServer.mcpExposure.description')}</ToggleDescription>
          </div>
        </ToggleInfo>
        <Switch
          checked={mcpExposureEnabled}
          onChange={(checked) => dispatch(setMcpExposureEnabled(checked))}
          size="small"
        />
      </MasterToggleRow>

      {mcpExposureEnabled && (
        <>
          {/* Exposure Status Summary */}
          <StatusRow>
            <Server size={14} />
            <Text type="secondary">
              {statusParts.length > 0 ? statusParts.join(', ') + ' exposed' : 'No resources exposed'}
            </Text>
          </StatusRow>

          <Collapse
            ghost
            size="small"
            items={[
              // ── Agents ──
              {
                key: 'agents',
                label: (
                  <CollapseLabel>
                    <Bot size={14} />
                    <span>{t('apiServer.mcpExposure.agents.title')}</span>
                    {exposedAgents.length > 0 && (
                      <Badge
                        count={exposedAgents.length}
                        size="small"
                        style={{ backgroundColor: 'var(--color-primary)' }}
                      />
                    )}
                  </CollapseLabel>
                ),
                children: (
                  <ItemList>
                    {agentsLoading ? (
                      <EmptyState>
                        <Text type="secondary">Loading agents…</Text>
                      </EmptyState>
                    ) : agents.length === 0 ? (
                      <EmptyState>
                        <Text type="secondary">{t('apiServer.mcpExposure.agents.empty')}</Text>
                      </EmptyState>
                    ) : (
                      agents.map((agent) => (
                        <ItemRow key={agent.id}>
                          <ItemInfo>
                            <ItemName>{agent.name}</ItemName>
                            {agent.description && (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {agent.description}
                              </Text>
                            )}
                          </ItemInfo>
                          <Switch
                            checked={agent.exposed_via_mcp ?? false}
                            onChange={(checked) => toggleAgentExposure(agent.id, checked)}
                            size="small"
                          />
                        </ItemRow>
                      ))
                    )}
                  </ItemList>
                )
              },

              // ── Knowledge Bases ──
              {
                key: 'knowledge-bases',
                label: (
                  <CollapseLabel>
                    <BookOpen size={14} />
                    <span>{t('apiServer.mcpExposure.knowledgeBases.title')}</span>
                    {exposedKBs.length > 0 && (
                      <Badge
                        count={exposedKBs.length}
                        size="small"
                        style={{ backgroundColor: 'var(--color-primary)' }}
                      />
                    )}
                  </CollapseLabel>
                ),
                children: (
                  <ItemList>
                    {knowledgeBases.length === 0 ? (
                      <EmptyState>
                        <Text type="secondary">{t('apiServer.mcpExposure.knowledgeBases.empty')}</Text>
                      </EmptyState>
                    ) : (
                      knowledgeBases.map((kb) => (
                        <ItemRow key={kb.id}>
                          <ItemInfo>
                            <ItemName>{kb.name}</ItemName>
                            {kb.description && (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {kb.description}
                              </Text>
                            )}
                          </ItemInfo>
                          <Switch
                            checked={kb.exposedViaMcp ?? false}
                            onChange={(checked) =>
                              dispatch(setKnowledgeBaseExposed({ baseId: kb.id, exposed: checked }))
                            }
                            size="small"
                          />
                        </ItemRow>
                      ))
                    )}
                  </ItemList>
                )
              },

              // ── MCP Servers ──
              {
                key: 'mcp-servers',
                label: (
                  <CollapseLabel>
                    <Server size={14} />
                    <span>{t('apiServer.mcpExposure.mcpServers.title')}</span>
                    {exposedServers.length > 0 && (
                      <Badge
                        count={exposedServers.length}
                        size="small"
                        style={{ backgroundColor: 'var(--color-primary)' }}
                      />
                    )}
                  </CollapseLabel>
                ),
                children: (
                  <ItemList>
                    {activeServers.length === 0 ? (
                      <EmptyState>
                        <Text type="secondary">{t('apiServer.mcpExposure.mcpServers.description')}</Text>
                      </EmptyState>
                    ) : (
                      activeServers.map((server) => (
                        <ItemRow key={server.id}>
                          <ItemInfo>
                            <ItemName>{server.name}</ItemName>
                            {server.description && (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {server.description}
                              </Text>
                            )}
                          </ItemInfo>
                          <Switch
                            checked={server.exposedViaMcp ?? false}
                            onChange={(checked) => dispatch(setMcpServerExposed({ id: server.id, exposed: checked }))}
                            size="small"
                          />
                        </ItemRow>
                      ))
                    )}
                  </ItemList>
                )
              }
            ]}
          />

          {/* Endpoint Info */}
          <EndpointInfo>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('apiServer.mcpExposure.endpoint.description')}
            </Text>
            <EndpointUrl>/v1/mcp-servers</EndpointUrl>
          </EndpointInfo>
        </>
      )}
    </SectionContainer>
  )
}

// Styled Components
const SectionContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--color-background);
  border-radius: 8px;
  border: 1px solid var(--color-border);
  margin-top: 12px;
`

const MasterToggleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const ToggleInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const ToggleIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--color-background-soft);
  color: var(--color-primary);
`

const ToggleLabel = styled.div`
  font-weight: 600;
  font-size: 14px;
  color: var(--color-text);
`

const ToggleDescription = styled.div`
  font-size: 12px;
  color: var(--color-text-3);
  margin-top: 2px;
`

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--color-background-soft);
  border-radius: 6px;
`

const CollapseLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
`

const ItemList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const ItemRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--color-background);
  border-radius: 6px;
  border: 1px solid var(--color-border);
`

const ItemInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
`

const ItemName = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const EmptyState = styled.div`
  padding: 12px;
  text-align: center;
`

const EndpointInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  background: var(--color-background-soft);
  border-radius: 6px;
`

const EndpointUrl = styled.code`
  font-size: 12px;
  font-family: monospace;
  color: var(--color-primary);
  background: var(--color-background);
  padding: 2px 6px;
  border-radius: 4px;
  width: fit-content;
`

export default McpExposureSection
