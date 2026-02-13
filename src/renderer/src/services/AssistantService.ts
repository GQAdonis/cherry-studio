import { loggerService } from '@logger'
import {
  DEFAULT_CONTEXTCOUNT,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TEMPERATURE,
  MAX_CONTEXT_COUNT,
  UNLIMITED_CONTEXT_COUNT
} from '@renderer/config/constant'
import { getModelSupportedReasoningEffortOptions } from '@renderer/config/models'
import { isQwenMTModel } from '@renderer/config/models/qwen'
import { CHERRYAI_PROVIDER } from '@renderer/config/providers'
import { SKILLS_CREATOR_SYSTEM_PROMPT } from '@renderer/config/skillsCreatorPrompt'
import { UNKNOWN } from '@renderer/config/translate'
import i18n from '@renderer/i18n'
import type {
  Assistant,
  AssistantPreset,
  AssistantSettings,
  Model,
  Provider,
  Topic,
  TranslateAssistant,
  TranslateLanguage
} from '@renderer/types'
import { uuid } from '@renderer/utils'

const logger = loggerService.withContext('AssistantService')

const safeT = (key: string) => {
  try {
    return i18n.t(key)
  } catch {
    return key
  }
}

const getReduxStore = () => {
  return (globalThis as any).store as {
    getState: () => any
    dispatch: (action: any) => any
  }
}

const getStoreProviders = () => {
  return getReduxStore().getState().llm.providers.concat([CHERRYAI_PROVIDER])
}

export const DEFAULT_ASSISTANT_SETTINGS = {
  temperature: DEFAULT_TEMPERATURE,
  enableTemperature: true,
  contextCount: DEFAULT_CONTEXTCOUNT,
  enableMaxTokens: false,
  maxTokens: 0,
  streamOutput: true,
  topP: 1,
  enableTopP: false,
  // It would gracefully fallback to prompt if not supported by model.
  toolUseMode: 'function',
  customParameters: [],
  reasoning_effort: 'default'
} as const satisfies AssistantSettings

export function getDefaultAssistant(): Assistant {
  return {
    id: 'default',
    name: safeT('chat.default.name'),
    emoji: '😀',
    prompt: '',
    topics: [getDefaultTopic('default')],
    messages: [],
    type: 'assistant',
    regularPhrases: [], // Added regularPhrases
    settings: DEFAULT_ASSISTANT_SETTINGS
  }
}

/**
 * Returns the built-in Skills Creator assistant.
 *
 * This assistant guides users through the 6-step skill creation
 * process from the Anthropic skills-creator specification, adapted
 * for Cherry Studio's skill storage provider architecture.
 */
export function getSkillsCreatorAssistant(): Assistant {
  return {
    id: 'skills-creator',
    name: safeT('settings.skills.creator.assistantName'),
    emoji: '🛠️',
    prompt: SKILLS_CREATOR_SYSTEM_PROMPT,
    topics: [getDefaultTopic('skills-creator')],
    messages: [],
    type: 'assistant',
    regularPhrases: [],
    settings: {
      ...DEFAULT_ASSISTANT_SETTINGS,
      temperature: 0.7,
      contextCount: 20
    }
  }
}

export function getDefaultTranslateAssistant(
  targetLanguage: TranslateLanguage,
  text: string,
  _settings?: Partial<AssistantSettings>
): TranslateAssistant {
  const model = getTranslateModel()
  const assistant: Assistant = getDefaultAssistant()

  if (!model) {
    logger.error('No translate model')
    throw new Error(safeT('translate.error.not_configured'))
  }

  if (targetLanguage.langCode === UNKNOWN.langCode) {
    logger.error('Unknown target language', targetLanguage)
    throw new Error('Unknown target language')
  }

  const supportedOptions = getModelSupportedReasoningEffortOptions(model)
  // disable reasoning if it could be disabled, otherwise no configuration
  const reasoningEffort = supportedOptions?.includes('none') ? 'none' : 'default'
  const settings = {
    reasoning_effort: reasoningEffort,
    ..._settings
  } satisfies Partial<AssistantSettings>

  const getTranslateContent = (model: Model, text: string, targetLanguage: TranslateLanguage): string => {
    if (isQwenMTModel(model)) {
      return text // QwenMT models handle raw text directly
    }

    return getReduxStore()
      .getState()
      .settings.translateModelPrompt.replaceAll('{{target_language}}', targetLanguage.value)
      .replaceAll('{{text}}', text)
  }

  const content = getTranslateContent(model, text, targetLanguage)
  const translateAssistant = {
    ...assistant,
    model,
    settings,
    prompt: '',
    targetLanguage,
    content
  } satisfies TranslateAssistant
  return translateAssistant
}

export function getDefaultAssistantSettings() {
  return getReduxStore().getState().assistants.defaultAssistant.settings
}

export function getDefaultTopic(assistantId: string): Topic {
  return {
    id: uuid(),
    assistantId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    name: safeT('chat.default.topic.name'),
    messages: [],
    isNameManuallyEdited: false
  }
}

export function getDefaultProvider() {
  return getProviderByModel(getDefaultModel())
}

export function getDefaultModel() {
  return getReduxStore().getState().llm.defaultModel
}

export function getQuickModel() {
  return getReduxStore().getState().llm.quickModel
}

export function getTranslateModel() {
  return getReduxStore().getState().llm.translateModel
}

export function getAssistantProvider(assistant: Assistant): Provider {
  const providers = getStoreProviders()
  const provider = providers.find((p) => p.id === assistant.model?.provider)
  return provider || getDefaultProvider()
}

// FIXME: This function fails in silence.
// TODO: Refactor it to make it return exactly valid value or null, and update all usage.
export function getProviderByModel(model?: Model): Provider {
  const providers = getStoreProviders()
  const provider = providers.find((p) => p.id === model?.provider)

  if (!provider) {
    const defaultProvider = providers.find((p) => p.id === getDefaultModel()?.provider)
    return defaultProvider || providers[0]
  }

  return provider
}

// FIXME: This function may return undefined but as Provider
export function getProviderByModelId(modelId?: string) {
  const providers = getStoreProviders()
  const _modelId = modelId || getDefaultModel().id
  return providers.find((p) => p.models.find((m) => m.id === _modelId)) as Provider
}

export const getAssistantSettings = (assistant: Assistant): AssistantSettings => {
  const contextCount = assistant?.settings?.contextCount ?? DEFAULT_CONTEXTCOUNT
  const getAssistantMaxTokens = () => {
    if (assistant.settings?.enableMaxTokens) {
      const maxTokens = assistant.settings.maxTokens
      if (typeof maxTokens === 'number') {
        return maxTokens > 0 ? maxTokens : DEFAULT_MAX_TOKENS
      }
      return DEFAULT_MAX_TOKENS
    }
    return undefined
  }

  return {
    contextCount: contextCount === MAX_CONTEXT_COUNT ? UNLIMITED_CONTEXT_COUNT : contextCount,
    temperature: assistant?.settings?.temperature ?? DEFAULT_TEMPERATURE,
    enableTemperature: assistant?.settings?.enableTemperature ?? true,
    topP: assistant?.settings?.topP ?? 1,
    enableTopP: assistant?.settings?.enableTopP ?? false,
    enableMaxTokens: assistant?.settings?.enableMaxTokens ?? false,
    maxTokens: getAssistantMaxTokens(),
    streamOutput: assistant?.settings?.streamOutput ?? true,
    toolUseMode: assistant?.settings?.toolUseMode ?? 'function',
    defaultModel: assistant?.defaultModel ?? undefined,
    reasoning_effort: assistant?.settings?.reasoning_effort ?? 'default',
    customParameters: assistant?.settings?.customParameters ?? []
  }
}

export function getAssistantById(id: string) {
  const assistants = getReduxStore().getState().assistants.assistants
  return assistants.find((a) => a.id === id)
}

export async function createAssistantFromAgent(agent: AssistantPreset) {
  const assistantId = uuid()
  const topic = getDefaultTopic(assistantId)

  const assistant: Assistant = {
    ...agent,
    id: assistantId,
    name: agent.name,
    emoji: agent.emoji,
    topics: [topic],
    model: agent.defaultModel,
    type: 'assistant',
    regularPhrases: agent.regularPhrases || [], // Ensured regularPhrases
    settings: agent.settings || DEFAULT_ASSISTANT_SETTINGS
  }

  const { addAssistant } = await import('@renderer/store/assistants')
  getReduxStore().dispatch(addAssistant(assistant))

  window.toast.success(safeT('message.assistant.added.content'))

  return assistant
}
