import { isEmbeddingModel } from '@renderer/config/models'
import type { Model, Provider } from '@renderer/types'
import { isOpenAIModelId } from '@renderer/utils/model'

import { provider2Provider } from './helper'
import type { RuleSet } from './types'

/**
 * Azure AI Foundry supports ALL model providers through unified inference API
 *
 * Three-tier routing strategy:
 * 1. Provider-Specific Routes: OpenAI and Anthropic use dedicated endpoints
 * 2. Unified Inference API: All other models (Meta, Mistral, Cohere, DeepSeek, xAI, Microsoft, AI21, etc.)
 * 3. Fallback: Unknown models default to unified inference API
 *
 * Reference:
 * - https://learn.microsoft.com/en-us/azure/ai-foundry/foundry-models/
 * - https://ai.azure.com/explore/models
 */
const AZURE_FOUNDRY_RULES: RuleSet = {
  rules: [
    {
      // Tier 1: Anthropic Claude models - use dedicated anthropic endpoint
      // Supports: Claude Sonnet, Claude Opus, Claude Haiku
      match: (model: Model) => /claude/i.test(model.id),
      provider: (provider: Provider) => ({
        ...provider,
        type: 'anthropic',
        apiHost: provider.apiHost + '/anthropic/v1',
        id: 'azure-foundry-anthropic'
      })
    },
    {
      // Tier 1: OpenAI models - use dedicated OpenAI endpoint
      // Supports: GPT-4, GPT-5, o1, o3, DALL-E, text-embedding models
      // Note: These can also use unified inference API, but dedicated endpoint provides more features
      match: (model: Model) => isOpenAIModelId(model.id),
      provider: (provider: Provider, model?: Model) => {
        const normalizedOpenAIHost = provider.openaiApiHost?.trim() || provider.apiHost
        const isEmbedding = model ? isEmbeddingModel(model) : false
        return {
          ...provider,
          type: 'azure-openai',
          apiHost: normalizedOpenAIHost,
          id: isEmbedding ? 'azure-foundry-openai-embedding' : 'azure-foundry-openai'
        }
      }
    },
    {
      // Tier 2: ALL OTHER MODELS use unified Azure AI Model Inference API
      // Supports: Meta (Llama), Mistral, Cohere, DeepSeek, xAI (Grok), Microsoft (Phi), AI21 (Jamba), etc.
      // Uses standardized OpenAI-compatible schema via /models endpoint
      match: () => true,
      provider: (provider: Provider) => ({
        ...provider,
        type: 'openai-compatible', // Uses OpenAI-compatible schema
        apiHost: provider.apiHost, // Base project endpoint, /models added in providerConfig
        id: 'azure-foundry-inference'
      })
    }
  ],
  // Tier 3: Fallback - default to unified inference API for unknown models
  fallbackRule: (provider: Provider) => ({
    ...provider,
    type: 'openai-compatible',
    apiHost: provider.apiHost,
    id: 'azure-foundry-inference'
  })
}

/**
 * Provider creator function for Azure Foundry
 * Intelligently routes models to appropriate endpoints based on model family
 */
export const azureFoundryProviderCreator = provider2Provider.bind(null, AZURE_FOUNDRY_RULES)
