/**
 * Refinement Toolbar Component
 *
 * Compact toolbar for the artifact refinement chat.
 * Provides quick access to:
 * - Model selection (clickable to change)
 * - Clear conversation
 * - Settings
 */

import { ClearOutlined, SettingOutlined } from '@ant-design/icons'
import { SelectModelPopup } from '@renderer/components/Popups/SelectModelPopup/popup'
import { getDefaultModel } from '@renderer/services/AssistantService'
import { getModelUniqId } from '@renderer/services/ModelService'
import { useAppDispatch, useAppSelector } from '@renderer/store'
import { selectParentModelId, setParentModelId } from '@renderer/store/artifacts'
import { Tooltip } from 'antd'
import { Bot, ChevronDown } from 'lucide-react'
import type { FC } from 'react'
import { memo, useCallback } from 'react'
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
  const defaultModel = getDefaultModel()

  // Display the model being used for refinement
  const modelName = parentModelId || defaultModel?.name || 'Default Model'

  // Check if model change is allowed
  const canChangeModel = !modelLocked

  const handleModelClick = useCallback(async () => {
    if (!canChangeModel) return

    const selectedModel = await SelectModelPopup.show({})

    if (selectedModel) {
      dispatch(setParentModelId(getModelUniqId(selectedModel)))
    }
  }, [canChangeModel, dispatch])

  return (
    <ToolbarContainer>
      <Tooltip title={canChangeModel ? t('artifacts.change_model') : t('artifacts.model_locked')}>
        <ModelIndicator onClick={handleModelClick} $clickable={canChangeModel}>
          <Bot size={12} />
          <ModelName title={modelName}>{modelName}</ModelName>
          {canChangeModel && <ChevronDown size={12} />}
        </ModelIndicator>
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

// Styled components
const ToolbarContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
  font-size: 11px;
`

const ModelIndicator = styled.div<{ $clickable?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-3);
  padding: 4px 8px;
  margin: -4px -8px;
  border-radius: 4px;
  cursor: ${(props) => (props.$clickable ? 'pointer' : 'default')};
  transition: all 0.15s ease;

  ${(props) =>
    props.$clickable &&
    `
    &:hover {
      background: var(--color-background-mute);
      color: var(--color-text-2);
    }
  `}
`

const ModelName = styled.span`
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
