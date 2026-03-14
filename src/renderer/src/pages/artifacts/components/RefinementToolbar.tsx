/**
 * Artifact Chat Toolbar Component
 *
 * Compact toolbar for the artifact chat.
 * Provides quick access to:
 * - Model selection (assistant-style API model popup)
 * - Clear conversation
 * - Settings
 */

import { ClearOutlined, SettingOutlined } from '@ant-design/icons'
import ModelAvatar from '@renderer/components/Avatar/ModelAvatar'
import { SelectAgentModelPopup } from '@renderer/components/Popups/SelectModelPopup'
import { ARTIFACT_STUDIO_AGENT_ID } from '@renderer/features/artifacts/services/ArtifactStudioRuntimeService'
import { useAgent } from '@renderer/hooks/agents/useAgent'
import { useApiModel } from '@renderer/hooks/agents/useModel'
import { getDefaultModel } from '@renderer/services/AssistantService'
import { getModelUniqId } from '@renderer/services/ModelService'
import { getProviderNameById } from '@renderer/services/ProviderService'
import { useAppDispatch, useAppSelector } from '@renderer/store'
import { selectParentModelId, setActiveStudioSessionId, setParentModelId } from '@renderer/store/artifacts'
import { apiModelAdapter } from '@renderer/utils/model'
import { Tooltip } from 'antd'
import { ChevronDown } from 'lucide-react'
import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

interface RefinementToolbarProps {
  onClear?: () => void
  onSettings?: () => void
  /** If true, model selection is disabled */
  modelLocked?: boolean
}

const RefinementToolbar: FC<RefinementToolbarProps> = ({ onClear, onSettings, modelLocked = false }) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const parentModelId = useAppSelector(selectParentModelId)
  const { agent } = useAgent(ARTIFACT_STUDIO_AGENT_ID)
  const defaultModel = getDefaultModel()
  const defaultModelId = defaultModel ? getModelUniqId(defaultModel) : undefined

  // Conversation override should win; otherwise reflect the system Artifact Studio agent model.
  const activeModelId = parentModelId || agent?.model || defaultModelId || ''
  const activeModel = useApiModel({ id: activeModelId || undefined })
  const providerName = activeModel?.provider ? getProviderNameById(activeModel.provider) : activeModel?.provider_name

  const modelLabel = useMemo(() => {
    if (activeModel) {
      return `${activeModel.name}${providerName ? ` | ${providerName}` : ''}`
    }
    if (activeModelId) {
      return activeModelId
    }
    return t('settings.models.default_model', 'Default model')
  }, [activeModel, activeModelId, providerName, t])

  const canChangeModel = !modelLocked

  const handleModelClick = useCallback(async () => {
    if (!canChangeModel) return

    const selectedModel = await SelectAgentModelPopup.show({ model: activeModel })

    if (selectedModel && selectedModel.id !== activeModelId) {
      dispatch(setParentModelId(selectedModel.id))
      // Force creating/using a fresh runtime session so the selected model applies immediately.
      dispatch(setActiveStudioSessionId(null))
    }
  }, [activeModel, activeModelId, canChangeModel, dispatch])

  return (
    <ToolbarContainer>
      <Tooltip title={canChangeModel ? t('artifacts.change_model') : t('artifacts.model_locked')}>
        <ModelButton onClick={handleModelClick} $clickable={canChangeModel}>
          <ModelAvatar model={activeModel ? apiModelAdapter(activeModel) : undefined} size={16} />
          <ModelName title={modelLabel}>{modelLabel}</ModelName>
          {canChangeModel && <ChevronDown size={12} />}
        </ModelButton>
      </Tooltip>

      <ToolbarActions>
        {onClear && (
          <Tooltip title={t('common.clear')}>
            <ToolbarButton onClick={onClear}>
              <ClearOutlined />
            </ToolbarButton>
          </Tooltip>
        )}
        {onSettings && (
          <Tooltip title={t('common.settings')}>
            <ToolbarButton onClick={onSettings}>
              <SettingOutlined />
            </ToolbarButton>
          </Tooltip>
        )}
      </ToolbarActions>
    </ToolbarContainer>
  )
}

const ToolbarContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
  font-size: 11px;
  gap: 8px;
`

const ModelButton = styled.button<{ $clickable?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-2);
  padding: 6px 8px;
  cursor: ${(props) => (props.$clickable ? 'pointer' : 'default')};
  transition: all 0.15s ease;

  ${(props) =>
    props.$clickable &&
    `
    &:hover {
      background: var(--color-background-mute);
      color: var(--color-text);
    }
  `}
`

const ModelName = styled.span`
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
`

const ToolbarActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`

const ToolbarButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--color-text-3);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--color-background-mute);
    color: var(--color-text);
  }

  .anticon {
    font-size: 12px;
  }
`

export default memo(RefinementToolbar)
