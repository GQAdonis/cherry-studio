import { loggerService } from '@logger'
import ContextStrategySelector from '@renderer/components/ContextStrategySelector'
import { TopView } from '@renderer/components/TopView'
import { useAssistants, useDefaultAssistant } from '@renderer/hooks/useAssistant'
import { useAssistantPresets } from '@renderer/hooks/useAssistantPresets'
import { useSettings } from '@renderer/hooks/useSettings'
import { useTimer } from '@renderer/hooks/useTimer'
import { useSystemAssistantPresets } from '@renderer/pages/store/assistants/presets'
import { createAssistantFromAgentWithOptions, DEFAULT_ASSISTANT_SETTINGS } from '@renderer/services/AssistantService'
import { EVENT_NAMES, EventEmitter } from '@renderer/services/EventService'
import type { Assistant, AssistantPreset, AssistantSettings, Skill } from '@renderer/types'
import type { ContextStrategyConfig } from '@renderer/types/contextStrategy'
import { DEFAULT_CONTEXT_STRATEGY_CONFIG } from '@renderer/types/contextStrategy'
import type { SkillAvailabilityMode, SkillScopeConfig } from '@renderer/types/skillScope'
import { uuid } from '@renderer/utils'
import type { InputRef } from 'antd'
import { Divider, Input, Modal, Select, Tag } from 'antd'
import { take } from 'lodash'
import { Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import EmojiIcon from '../EmojiIcon'
import { HStack } from '../Layout'
import Scrollbar from '../Scrollbar'

interface Props {
  resolve: (value: Assistant | undefined) => void
}

type AssistantSkillMode = Exclude<SkillAvailabilityMode, 'inherit'>
type AssistantCreationSkillScope = Omit<SkillScopeConfig, 'mode'> & { mode: AssistantSkillMode }

const SKILL_MODE_OPTIONS: Array<{ value: AssistantSkillMode; label: string }> = [
  { value: 'all', label: 'All Skills' },
  { value: 'selected', label: 'Selected Skills' },
  { value: 'none', label: 'No Skills' }
]

const SKILL_STRATEGY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '__inherit__', label: 'Inherit Global' },
  { value: 'none', label: 'None (Inject All)' },
  { value: 'keyword', label: 'Keyword' },
  { value: 'embedding', label: 'Embedding (API)' },
  { value: 'local-embedding', label: 'Local Embedding' },
  { value: 'llm', label: 'LLM Classification' },
  { value: 'hybrid', label: 'Hybrid' }
]

const logger = loggerService.withContext('AddAssistantPopup')

const PopupContainer: React.FC<Props> = ({ resolve }) => {
  const [open, setOpen] = useState(true)
  const { t } = useTranslation()
  const { contextStrategy: globalContextStrategy } = useSettings()
  const { presets: userPresets } = useAssistantPresets()
  const [searchText, setSearchText] = useState('')
  const { defaultAssistant } = useDefaultAssistant()
  const { assistants, addAssistant } = useAssistants()
  const inputRef = useRef<InputRef>(null)
  const systemPresets = useSystemAssistantPresets()
  const loadingRef = useRef(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const { setTimeoutTimer } = useTimer()
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([])
  const [useGlobalSkillScope, setUseGlobalSkillScope] = useState(true)
  const [skillScope, setSkillScope] = useState<AssistantCreationSkillScope>({ mode: 'all' })
  const [useGlobalContextStrategy, setUseGlobalContextStrategy] = useState(true)
  const [contextStrategy, setContextStrategy] = useState<ContextStrategyConfig>(
    globalContextStrategy || DEFAULT_CONTEXT_STRATEGY_CONFIG
  )

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const skills = await window.api.skill.getList()
        setAvailableSkills(skills || [])
      } catch (error) {
        // Keep popup functional even when skills cannot be loaded.
        logger.error('Failed to load skills in assistant creation dialog', { error })
      }
    }

    fetchSkills()
  }, [])

  useEffect(() => {
    if (!useGlobalContextStrategy) return
    setContextStrategy(globalContextStrategy || DEFAULT_CONTEXT_STRATEGY_CONFIG)
  }, [globalContextStrategy, useGlobalContextStrategy])

  const buildCreationSettings = useCallback(
    (baseSettings?: Partial<AssistantSettings>): Partial<AssistantSettings> => {
      const nextSettings: Partial<AssistantSettings> = {
        ...(baseSettings ?? DEFAULT_ASSISTANT_SETTINGS)
      }

      if (useGlobalSkillScope) {
        delete nextSettings.skillScope
      } else {
        nextSettings.skillScope = {
          ...skillScope,
          selectedSkillIds: skillScope.mode === 'selected' ? (skillScope.selectedSkillIds ?? []) : undefined
        }
      }

      if (useGlobalContextStrategy) {
        delete nextSettings.contextStrategy
      } else {
        nextSettings.contextStrategy = contextStrategy
      }

      return nextSettings
    },
    [contextStrategy, skillScope, useGlobalContextStrategy, useGlobalSkillScope]
  )

  const onSkillModeChange = useCallback((mode: AssistantSkillMode) => {
    setSkillScope((prev) => ({
      ...prev,
      mode,
      selectedSkillIds: mode === 'selected' ? (prev.selectedSkillIds ?? []) : undefined
    }))
  }, [])

  const onSkillSelectionChange = useCallback((selectedSkillIds: string[]) => {
    setSkillScope((prev) => ({
      ...prev,
      mode: 'selected',
      selectedSkillIds
    }))
  }, [])

  const onSkillStrategyChange = useCallback((strategyValue: string) => {
    setSkillScope((prev) => ({
      ...prev,
      strategy: strategyValue === '__inherit__' ? undefined : (strategyValue as SkillScopeConfig['strategy'])
    }))
  }, [])

  const presets = useMemo(() => {
    const allPresets = [...userPresets, ...systemPresets] as AssistantPreset[]
    const list = [defaultAssistant, ...allPresets.filter((preset) => !assistants.map((a) => a.id).includes(preset.id))]
    const filtered = searchText
      ? list.filter(
          (preset) =>
            preset.name.toLowerCase().includes(searchText.trim().toLocaleLowerCase()) ||
            preset.description?.toLowerCase().includes(searchText.trim().toLocaleLowerCase())
        )
      : list

    if (searchText.trim()) {
      const newAgent: AssistantPreset = {
        id: 'new',
        name: searchText.trim(),
        prompt: '',
        topics: [],
        type: 'assistant',
        emoji: '⭐️'
      }
      return [newAgent, ...filtered]
    }
    return filtered
  }, [assistants, defaultAssistant, searchText, systemPresets, userPresets])

  // 重置选中索引当搜索或列表内容变更时
  useEffect(() => {
    setSelectedIndex(0)
  }, [presets.length, searchText])

  const onCreateAssistant = useCallback(
    async (preset: AssistantPreset) => {
      if (loadingRef.current) {
        return
      }

      loadingRef.current = true
      let assistant: Assistant

      if (preset.id === 'default') {
        assistant = {
          ...preset,
          id: uuid(),
          settings: buildCreationSettings(preset.settings)
        }
        addAssistant(assistant)
      } else {
        assistant = await createAssistantFromAgentWithOptions(preset, {
          settings: buildCreationSettings(preset.settings)
        })
      }

      setTimeoutTimer('onCreateAssistant', () => EventEmitter.emit(EVENT_NAMES.SHOW_ASSISTANTS), 0)
      resolve(assistant)
      setOpen(false)
    },
    [setTimeoutTimer, resolve, addAssistant, buildCreationSettings]
  ) // 添加函数内使用的依赖项
  // 键盘导航处理
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const displayedPresets = take(presets, 100)

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev >= displayedPresets.length - 1 ? 0 : prev + 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev <= 0 ? displayedPresets.length - 1 : prev - 1))
          break
        case 'Enter':
        case 'NumpadEnter':
          const activeElement = document.activeElement as HTMLElement | null
          const editingCreationSettings =
            activeElement &&
            activeElement !== inputRef.current?.input &&
            (activeElement.closest('.assistant-creation-settings') !== null ||
              activeElement.closest('.ant-select-dropdown') !== null ||
              activeElement.tagName === 'INPUT' ||
              activeElement.tagName === 'TEXTAREA')

          if (editingCreationSettings) {
            return
          }

          // 如果焦点在输入框且有搜索内容，则默认选择第一项
          if (document.activeElement === inputRef.current?.input && searchText.trim()) {
            e.preventDefault()
            onCreateAssistant(displayedPresets[selectedIndex])
          }
          // 否则选择当前选中项
          else if (selectedIndex >= 0 && selectedIndex < displayedPresets.length) {
            e.preventDefault()
            onCreateAssistant(displayedPresets[selectedIndex])
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, selectedIndex, presets, searchText, onCreateAssistant])

  // 确保选中项在可视区域
  useEffect(() => {
    if (containerRef.current) {
      const presetItems = containerRef.current.querySelectorAll('.agent-item')
      if (presetItems[selectedIndex]) {
        presetItems[selectedIndex].scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        })
      }
    }
  }, [selectedIndex])

  const onCancel = () => {
    setOpen(false)
  }

  const onClose = async () => {
    resolve(undefined)
    AddAssistantPopup.hide()
  }

  useEffect(() => {
    if (!open) return

    const timer = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(timer)
  }, [open])

  return (
    <Modal
      centered
      open={open}
      onCancel={onCancel}
      afterClose={onClose}
      transitionName="animation-move-down"
      styles={{
        content: {
          borderRadius: 20,
          padding: 0,
          overflow: 'hidden',
          paddingBottom: 20
        },
        body: {
          padding: 0
        }
      }}
      closeIcon={null}
      footer={null}>
      <HStack style={{ padding: '0 12px', marginTop: 5 }}>
        <Input
          prefix={
            <SearchIcon>
              <Search size={14} />
            </SearchIcon>
          }
          ref={inputRef}
          placeholder={t('assistants.search')}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          autoFocus
          style={{ paddingLeft: 0 }}
          variant="borderless"
          size="middle"
        />
      </HStack>
      <Divider style={{ margin: 0, marginTop: 4, borderBlockStartWidth: 0.5 }} />
      <Container ref={containerRef}>
        {take(presets, 100).map((preset, index) => (
          <AgentItem
            key={preset.id}
            onClick={() => onCreateAssistant(preset)}
            className={`agent-item ${preset.id === 'default' ? 'default' : ''} ${index === selectedIndex ? 'keyboard-selected' : ''}`}
            onMouseEnter={() => setSelectedIndex(index)}>
            <HStack alignItems="center" gap={5} style={{ overflow: 'hidden', maxWidth: '100%' }}>
              <EmojiIcon emoji={preset.emoji || ''} />
              <span className="text-nowrap">{preset.name}</span>
            </HStack>
            {preset.id === 'default' && <Tag color="green">{t('assistants.presets.tag.system')}</Tag>}
            {preset.type === 'agent' && <Tag color="orange">{t('assistants.presets.tag.agent')}</Tag>}
            {preset.id === 'new' && <Tag color="green">{t('assistants.presets.tag.new')}</Tag>}
          </AgentItem>
        ))}
      </Container>
      <Divider style={{ margin: '8px 0 0 0', borderBlockStartWidth: 0.5 }} />
      <CreationSettings className="assistant-creation-settings">
        <SettingsTitle>{t('assistants.create.settings.title', { defaultValue: 'Creation Settings' })}</SettingsTitle>
        <SettingsDescription>
          {t('assistants.create.settings.description', {
            defaultValue: 'Apply skill and context defaults before creating this assistant.'
          })}
        </SettingsDescription>

        <SectionTitle>{t('assistants.settings.skills.title', { defaultValue: 'Skills' })}</SectionTitle>
        <Select
          value={useGlobalSkillScope ? 'yes' : 'no'}
          options={[
            { value: 'yes', label: t('assistants.settings.skills.use_global', { defaultValue: 'Use Global Default' }) },
            { value: 'no', label: t('assistants.settings.skills.custom', { defaultValue: 'Use Custom Policy' }) }
          ]}
          onChange={(value) => setUseGlobalSkillScope(value === 'yes')}
        />

        {!useGlobalSkillScope && (
          <>
            <Select value={skillScope.mode} options={SKILL_MODE_OPTIONS} onChange={onSkillModeChange} />
            {skillScope.mode === 'selected' && (
              <Select
                mode="multiple"
                value={skillScope.selectedSkillIds ?? []}
                onChange={onSkillSelectionChange}
                options={availableSkills.map((skill) => ({
                  value: skill.id,
                  label: skill.name
                }))}
                placeholder={t('assistants.settings.skills.selected_placeholder', {
                  defaultValue: 'Choose skills available to this assistant'
                })}
              />
            )}
            <Select
              value={skillScope.strategy ?? '__inherit__'}
              options={SKILL_STRATEGY_OPTIONS}
              onChange={onSkillStrategyChange}
            />
          </>
        )}

        <Divider style={{ margin: '12px 0', borderBlockStartWidth: 0.5 }} />

        <SectionTitle>{t('assistants.settings.context.title', { defaultValue: 'Context Management' })}</SectionTitle>
        <ContextStrategySelector
          value={contextStrategy}
          onChange={setContextStrategy}
          showInheritOption
          inheritedStrategyType={globalContextStrategy?.type}
          inheritLabel={t('assistants.settings.context.use_global', { defaultValue: 'Use Global Default' })}
          useInherited={useGlobalContextStrategy}
          onInheritedChange={setUseGlobalContextStrategy}
          compact
        />
      </CreationSettings>
    </Modal>
  )
}

const Container = styled(Scrollbar)`
  padding: 0 12px;
  height: 38vh;
  margin-top: 10px;
`

const CreationSettings = styled.div`
  padding: 10px 12px 2px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const SettingsTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-1);
`

const SettingsDescription = styled.div`
  font-size: 12px;
  color: var(--color-text-2);
  line-height: 1.4;
`

const SectionTitle = styled.div`
  margin-top: 2px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-1);
`

const AgentItem = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 8px 15px;
  border-radius: 8px;
  user-select: none;
  margin-bottom: 8px;
  cursor: pointer;
  overflow: hidden;
  &.default {
    background-color: var(--color-background-mute);
  }
  &.keyboard-selected {
    background-color: var(--color-background-mute);
  }
  .anticon {
    font-size: 16px;
    color: var(--color-icon);
  }
  &:hover {
    background-color: var(--color-background-mute);
  }
`

const SearchIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  background-color: var(--color-background-mute);
  margin-right: 2px;
`

export default class AddAssistantPopup {
  static topviewId = 0
  static hide() {
    TopView.hide('AddAssistantPopup')
  }
  static show() {
    return new Promise<Assistant | undefined>((resolve) => {
      TopView.show(<PopupContainer resolve={resolve} />, 'AddAssistantPopup')
    })
  }
}
