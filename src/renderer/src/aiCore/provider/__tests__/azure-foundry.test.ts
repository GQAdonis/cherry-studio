import type { Model, Provider } from '@renderer/types'
import { describe, expect, it } from 'vitest'

import { azureFoundryProviderCreator } from '../config/azure-foundry'

/**
 * Helper to create a test Azure Foundry provider
 */
function createAzureFoundryProvider(): Provider {
  return {
    id: 'azure-foundry',
    type: 'azure-foundry',
    name: 'Test Azure Foundry',
    apiKey: 'test-key',
    apiHost: 'https://test-resource.services.ai.azure.com/api/projects/test-project',
    openaiApiHost: 'https://test-resource.openai.azure.com',
    apiVersion: '2024-10-21',
    models: [],
    enabled: true,
    isSystem: true
  }
}

/**
 * Helper to create a test model
 */
function createTestModel(modelId: string): Model {
  return {
    id: modelId,
    name: modelId,
    provider: 'azure-foundry'
  } as Model
}

describe('Azure Foundry Universal Provider Support', () => {
  describe('Anthropic Claude Models', () => {
    const testCases = ['claude-sonnet-4-5', 'claude-opus-4-5', 'claude-haiku-4', 'Claude-3.5-Sonnet']

    testCases.forEach((modelId) => {
      it(`should route ${modelId} to anthropic endpoint`, () => {
        const provider = createAzureFoundryProvider()
        const model = createTestModel(modelId)
        const routed = azureFoundryProviderCreator(model, provider)

        expect(routed.type).toBe('anthropic')
        expect(routed.apiHost).toContain('/anthropic/v1')
        expect(routed.id).toBe('azure-foundry-anthropic')
      })
    })
  })

  describe('OpenAI Models', () => {
    const testCases = [
      { id: 'gpt-5.1-chat', desc: 'GPT-5', embedding: false },
      { id: 'gpt-5-mini', desc: 'GPT-5 Mini', embedding: false },
      { id: 'gpt-4o', desc: 'GPT-4o', embedding: false },
      { id: 'o1', desc: 'o1', embedding: false },
      { id: 'o3-mini', desc: 'o3-mini', embedding: false },
      { id: 'dall-e-3', desc: 'DALL-E', embedding: false },
      { id: 'text-embedding-3-large', desc: 'embeddings', embedding: true }
    ]

    testCases.forEach(({ id, desc, embedding }) => {
      it(`should route ${desc} (${id}) to OpenAI endpoint with ${embedding ? 'embedding' : 'chat'} mode`, () => {
        const provider = createAzureFoundryProvider()
        const model = createTestModel(id)
        const routed = azureFoundryProviderCreator(model, provider)

        expect(routed.type).toBe('azure-openai')
        expect(routed.apiHost).toBe(provider.openaiApiHost)
        expect(routed.id).toBe(embedding ? 'azure-foundry-openai-embedding' : 'azure-foundry-openai')
      })
    })
  })

  describe('Meta Llama Models', () => {
    const testCases = [
      'Meta-Llama-3.3-70B-Instruct',
      'Meta-Llama-3.1-405B-Instruct',
      'Meta-Llama-3.1-70B-Instruct',
      'llama-3.2-90b'
    ]

    testCases.forEach((modelId) => {
      it(`should route ${modelId} to unified inference API`, () => {
        const provider = createAzureFoundryProvider()
        const model = createTestModel(modelId)
        const routed = azureFoundryProviderCreator(model, provider)

        expect(routed.type).toBe('openai-compatible')
        expect(routed.id).toBe('azure-foundry-inference')
        // Should preserve base endpoint (no /openai or /anthropic suffix)
        expect(routed.apiHost).not.toContain('/openai')
        expect(routed.apiHost).not.toContain('/anthropic')
      })
    })
  })

  describe('Mistral AI Models', () => {
    const testCases = ['Mistral-large-2411', 'Ministral-3B', 'Mistral-Nemo', 'mistral-small-latest']

    testCases.forEach((modelId) => {
      it(`should route ${modelId} to unified inference API`, () => {
        const provider = createAzureFoundryProvider()
        const model = createTestModel(modelId)
        const routed = azureFoundryProviderCreator(model, provider)

        expect(routed.type).toBe('openai-compatible')
        expect(routed.id).toBe('azure-foundry-inference')
      })
    })
  })

  describe('Microsoft Phi Models', () => {
    const testCases = ['Phi-4', 'Phi-3.5-vision-instruct', 'phi-3-medium']

    testCases.forEach((modelId) => {
      it(`should route ${modelId} to unified inference API`, () => {
        const provider = createAzureFoundryProvider()
        const model = createTestModel(modelId)
        const routed = azureFoundryProviderCreator(model, provider)

        expect(routed.type).toBe('openai-compatible')
        expect(routed.id).toBe('azure-foundry-inference')
      })
    })
  })

  describe('Cohere Models', () => {
    const testCases = ['command-r-plus', 'command-r', 'embed-v3-english', 'cohere-embed-multilingual']

    testCases.forEach((modelId) => {
      it(`should route ${modelId} to unified inference API`, () => {
        const provider = createAzureFoundryProvider()
        const model = createTestModel(modelId)
        const routed = azureFoundryProviderCreator(model, provider)

        expect(routed.type).toBe('openai-compatible')
        expect(routed.id).toBe('azure-foundry-inference')
      })
    })
  })

  describe('DeepSeek Models', () => {
    const testCases = ['DeepSeek-V3', 'DeepSeek-R1', 'deepseek-coder-v2']

    testCases.forEach((modelId) => {
      it(`should route ${modelId} to unified inference API`, () => {
        const provider = createAzureFoundryProvider()
        const model = createTestModel(modelId)
        const routed = azureFoundryProviderCreator(model, provider)

        expect(routed.type).toBe('openai-compatible')
        expect(routed.id).toBe('azure-foundry-inference')
      })
    })
  })

  describe('xAI Grok Models', () => {
    const testCases = ['grok-2', 'grok-beta']

    testCases.forEach((modelId) => {
      it(`should route ${modelId} to unified inference API`, () => {
        const provider = createAzureFoundryProvider()
        const model = createTestModel(modelId)
        const routed = azureFoundryProviderCreator(model, provider)

        expect(routed.type).toBe('openai-compatible')
        expect(routed.id).toBe('azure-foundry-inference')
      })
    })
  })

  describe('AI21 Labs Models', () => {
    const testCases = ['jamba-1.5-large', 'jamba-instruct']

    testCases.forEach((modelId) => {
      it(`should route ${modelId} to unified inference API`, () => {
        const provider = createAzureFoundryProvider()
        const model = createTestModel(modelId)
        const routed = azureFoundryProviderCreator(model, provider)

        expect(routed.type).toBe('openai-compatible')
        expect(routed.id).toBe('azure-foundry-inference')
      })
    })
  })

  describe('Unknown/Other Models', () => {
    const testCases = ['some-unknown-model', 'custom-model-v1', 'test-model']

    testCases.forEach((modelId) => {
      it(`should route ${modelId} to unified inference API (fallback)`, () => {
        const provider = createAzureFoundryProvider()
        const model = createTestModel(modelId)
        const routed = azureFoundryProviderCreator(model, provider)

        expect(routed.type).toBe('openai-compatible')
        expect(routed.id).toBe('azure-foundry-inference')
      })
    })
  })

  describe('Provider Configuration Preservation', () => {
    it('should preserve original provider properties', () => {
      const provider = createAzureFoundryProvider()
      const model = createTestModel('Meta-Llama-3.3-70B-Instruct')
      const routed = azureFoundryProviderCreator(model, provider)

      expect(routed.apiKey).toBe(provider.apiKey)
      expect(routed.apiVersion).toBe(provider.apiVersion)
      expect(routed.name).toBe(provider.name)
      expect(routed.enabled).toBe(provider.enabled)
    })

    it('should maintain base API host for inference models', () => {
      const provider = createAzureFoundryProvider()
      const originalHost = provider.apiHost
      const model = createTestModel('Mistral-large-2411')
      const routed = azureFoundryProviderCreator(model, provider)

      expect(routed.apiHost).toBe(originalHost)
    })

    it('should append /anthropic/v1 for Claude models', () => {
      const provider = createAzureFoundryProvider()
      const originalHost = provider.apiHost
      const model = createTestModel('claude-sonnet-4-5')
      const routed = azureFoundryProviderCreator(model, provider)

      expect(routed.apiHost).toBe(originalHost + '/anthropic/v1')
    })

    it('should use dedicated OpenAI endpoint when configured', () => {
      const provider = createAzureFoundryProvider()
      const model = createTestModel('gpt-4o')
      const routed = azureFoundryProviderCreator(model, provider)

      expect(routed.apiHost).toBe(provider.openaiApiHost)
    })

    it('should fallback to project host when OpenAI endpoint missing', () => {
      const provider = createAzureFoundryProvider()
      delete (provider as any).openaiApiHost
      const model = createTestModel('gpt-4o')
      const routed = azureFoundryProviderCreator(model, provider)

      expect(routed.apiHost).toBe(provider.apiHost)
    })
  })

  describe('Case Insensitivity', () => {
    it('should handle uppercase model IDs for Claude', () => {
      const provider = createAzureFoundryProvider()
      const model = createTestModel('CLAUDE-SONNET-4-5')
      const routed = azureFoundryProviderCreator(model, provider)

      expect(routed.type).toBe('anthropic')
      expect(routed.id).toBe('azure-foundry-anthropic')
    })

    it('should handle mixed case model IDs for GPT', () => {
      const provider = createAzureFoundryProvider()
      const model = createTestModel('GPT-4O')
      const routed = azureFoundryProviderCreator(model, provider)

      expect(routed.type).toBe('azure-openai')
      expect(routed.id).toBe('azure-foundry-openai')
    })

    it('should handle mixed case model IDs for other providers', () => {
      const provider = createAzureFoundryProvider()
      const model = createTestModel('MISTRAL-LARGE-2411')
      const routed = azureFoundryProviderCreator(model, provider)

      expect(routed.type).toBe('openai-compatible')
      expect(routed.id).toBe('azure-foundry-inference')
    })
  })
})
