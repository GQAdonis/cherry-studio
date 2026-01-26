import {
  isEmbeddingModel,
  isFunctionCallingModel,
  isReasoningModel,
  isRerankModel,
  isVisionModel,
  isWebSearchModel
} from '@renderer/config/models'
import type { AdaptedApiModel, ApiModel, Model, ModelTag } from '@renderer/types'
import { objectKeys } from '@renderer/types'

/**
 * 获取模型标签的状态
 * @param models - 模型列表
 * @returns 包含各个标签布尔值的对象，表示是否存在具有该标签的模型
 */
export const getModelTags = (models: Model[]): Record<ModelTag, boolean> => {
  const result: Record<ModelTag, boolean> = {
    vision: false,
    embedding: false,
    reasoning: false,
    function_calling: false,
    web_search: false,
    rerank: false,
    free: false
  }
  const total = objectKeys(result).length
  let satisfied = 0

  for (const model of models) {
    // 如果所有标签都已满足，提前退出
    if (satisfied === total) break

    if (!result.vision && isVisionModel(model)) {
      satisfied += 1
      result.vision = true
    }
    if (!result.embedding && isEmbeddingModel(model)) {
      satisfied += 1
      result.embedding = true
    }
    if (!result.reasoning && isReasoningModel(model)) {
      satisfied += 1
      result.reasoning = true
    }
    if (!result.function_calling && isFunctionCallingModel(model)) {
      satisfied += 1
      result.function_calling = true
    }
    if (!result.web_search && isWebSearchModel(model)) {
      satisfied += 1
      result.web_search = true
    }
    if (!result.rerank && isRerankModel(model)) {
      satisfied += 1
      result.rerank = true
    }
    if (!result.free && isFreeModel(model)) {
      satisfied += 1
      result.free = true
    }
  }

  return result
}

export function isFreeModel(model: Model) {
  if (model.provider === 'cherryai') {
    return true
  }

  return (model.id + model.name).toLocaleLowerCase().includes('free')
}

export const apiModelAdapter = (model: ApiModel): AdaptedApiModel => {
  return {
    id: model.provider_model_id ?? model.id,
    provider: model.provider ?? '',
    name: model.name,
    group: '',
    origin: model
  }
}

/**
 * Model family detection utilities for Azure AI Foundry and other multi-provider systems
 */

export type ModelFamily =
  | 'openai'
  | 'anthropic'
  | 'meta'
  | 'mistral'
  | 'microsoft'
  | 'cohere'
  | 'deepseek'
  | 'xai'
  | 'ai21'
  | 'other'

/**
 * Detects the model family based on model ID
 * Used for routing in Azure AI Foundry and other multi-provider systems
 */
export function getModelFamily(modelId: string): ModelFamily {
  const id = modelId.toLowerCase()

  // Anthropic Claude models
  if (/claude/i.test(id)) return 'anthropic'

  // OpenAI models (GPT, o1, o3, DALL-E, embeddings)
  if (/gpt|o1|o3|dall-e|text-embedding/i.test(id)) return 'openai'

  // Meta models (Llama)
  if (/llama|meta/i.test(id)) return 'meta'

  // Mistral AI models
  if (/mistral|ministral/i.test(id)) return 'mistral'

  // Microsoft models (Phi, MAI)
  if (/phi|mai-/i.test(id)) return 'microsoft'

  // Cohere models (Command, Embed)
  if (/command|cohere|embed.*cohere/i.test(id)) return 'cohere'

  // DeepSeek models
  if (/deepseek/i.test(id)) return 'deepseek'

  // xAI models (Grok)
  if (/grok/i.test(id)) return 'xai'

  // AI21 Labs models (Jamba)
  if (/jamba/i.test(id)) return 'ai21'

  return 'other'
}

/**
 * Labels for each model family (for UI display)
 */
export const MODEL_FAMILY_LABELS: Record<ModelFamily, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  meta: 'Meta',
  mistral: 'Mistral AI',
  microsoft: 'Microsoft',
  cohere: 'Cohere',
  deepseek: 'DeepSeek',
  xai: 'xAI',
  ai21: 'AI21 Labs',
  other: 'Other'
}

/**
 * Check if a model ID belongs to Anthropic
 */
export function isAnthropicModelId(modelId: string): boolean {
  return /claude/i.test(modelId)
}

/**
 * Check if a model ID belongs to OpenAI
 */
export function isOpenAIModelId(modelId: string): boolean {
  return /gpt|o1|o3|dall-e|text-embedding/i.test(modelId)
}

/**
 * Check if a model ID belongs to Meta
 */
export function isMetaModelId(modelId: string): boolean {
  return /llama|meta/i.test(modelId)
}

/**
 * Check if a model ID belongs to Mistral AI
 */
export function isMistralModelId(modelId: string): boolean {
  return /mistral|ministral/i.test(modelId)
}

/**
 * Check if a model ID belongs to Microsoft
 */
export function isMicrosoftModelId(modelId: string): boolean {
  return /phi|mai-/i.test(modelId)
}

/**
 * Check if a model ID belongs to Cohere
 */
export function isCohereModelId(modelId: string): boolean {
  return /command|cohere|embed.*cohere/i.test(modelId)
}

/**
 * Check if a model ID belongs to DeepSeek
 */
export function isDeepSeekModelId(modelId: string): boolean {
  return /deepseek/i.test(modelId)
}

/**
 * Check if a model ID belongs to xAI
 */
export function isXAIModelId(modelId: string): boolean {
  return /grok/i.test(modelId)
}

/**
 * Check if a model ID belongs to AI21 Labs
 */
export function isAI21ModelId(modelId: string): boolean {
  return /jamba/i.test(modelId)
}
