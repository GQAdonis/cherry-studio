import ContextStrategySelector from '@renderer/components/ContextStrategySelector'
import { useSettings } from '@renderer/hooks/useSettings'
import type { UpdateAgentBaseForm } from '@renderer/types'
import { AgentConfigurationSchema } from '@renderer/types'
import type { ContextStrategyConfig } from '@renderer/types/contextStrategy'
import { DEFAULT_CONTEXT_STRATEGY_CONFIG } from '@renderer/types/contextStrategy'
import { Layers } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { type AgentOrSessionSettingsProps, SettingsContainer, SettingsItem, SettingsTitle } from '../shared'

const ContextSettings: React.FC<AgentOrSessionSettingsProps> = ({ agentBase, update }) => {
  const { t } = useTranslation()
  const { contextStrategy: globalContextStrategy } = useSettings()

  const hasCustomStrategy = useMemo(() => {
    if (!agentBase) return false
    const config = (agentBase.configuration ?? {}) as Record<string, unknown>
    return config.contextStrategy !== undefined
  }, [agentBase])

  const [useGlobalDefault, setUseGlobalDefault] = useState(!hasCustomStrategy)

  useEffect(() => {
    setUseGlobalDefault(!hasCustomStrategy)
  }, [hasCustomStrategy])

  const effectiveStrategy = useMemo<ContextStrategyConfig>(() => {
    if (!agentBase) {
      return globalContextStrategy || DEFAULT_CONTEXT_STRATEGY_CONFIG
    }

    const config = (agentBase.configuration ?? {}) as Record<string, unknown>
    const custom = config.contextStrategy as ContextStrategyConfig | undefined
    return custom || globalContextStrategy || DEFAULT_CONTEXT_STRATEGY_CONFIG
  }, [agentBase, globalContextStrategy])

  const updateContextStrategy = useCallback(
    (contextStrategy: ContextStrategyConfig | undefined) => {
      if (!agentBase) return
      const nextConfig = AgentConfigurationSchema.parse({
        ...agentBase.configuration,
        contextStrategy
      })
      update({ id: agentBase.id, configuration: nextConfig } satisfies UpdateAgentBaseForm, {
        showSuccessToast: false
      })
    },
    [agentBase, update]
  )

  const handleUseGlobalChange = useCallback(
    (useGlobal: boolean) => {
      setUseGlobalDefault(useGlobal)
      if (useGlobal) {
        updateContextStrategy(undefined)
      } else {
        updateContextStrategy(globalContextStrategy || DEFAULT_CONTEXT_STRATEGY_CONFIG)
      }
    },
    [globalContextStrategy, updateContextStrategy]
  )

  const handleStrategyChange = useCallback(
    (config: ContextStrategyConfig) => {
      updateContextStrategy(config)
    },
    [updateContextStrategy]
  )

  if (!agentBase) {
    return null
  }

  return (
    <SettingsContainer>
      <SettingsItem>
        <SettingsTitle contentAfter={<Layers size={16} className="text-foreground-400" />}>
          {t('agent.settings.context.title', 'Context Management')}
        </SettingsTitle>
        <div className="mt-2 flex flex-col gap-2">
          <span className="text-foreground-500 text-xs">
            {t(
              'agent.settings.context.description',
              'Control how this agent/session manages long context windows before model limits are reached.'
            )}
          </span>
        </div>
      </SettingsItem>

      <SettingsItem divider={false}>
        <ContextStrategySelector
          value={effectiveStrategy}
          onChange={handleStrategyChange}
          showInheritOption
          inheritedStrategyType={globalContextStrategy?.type}
          inheritLabel={t('agent.settings.context.useGlobal', 'Use Global Default')}
          useInherited={useGlobalDefault}
          onInheritedChange={handleUseGlobalChange}
        />
      </SettingsItem>
    </SettingsContainer>
  )
}

export default ContextSettings
