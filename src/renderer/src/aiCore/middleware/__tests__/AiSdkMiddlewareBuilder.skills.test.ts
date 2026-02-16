import { AnthropicMessagesLanguageModel } from '@ai-sdk/anthropic/internal'
import { OpenAIResponsesLanguageModel } from '@ai-sdk/openai/internal'
import { describe, expect, it } from 'vitest'

import { type AiSdkMiddlewareConfig, buildAiSdkMiddlewares } from '../AiSdkMiddlewareBuilder'

function createBaseConfig(): AiSdkMiddlewareConfig {
  return {
    streamOutput: true,
    enableReasoning: false,
    isPromptToolUse: false,
    isSupportedToolUse: false,
    isImageGenerationEndpoint: false,
    enableWebSearch: false,
    enableGenerateImage: false,
    enableUrlContext: false
  }
}

describe('AiSdkMiddlewareBuilder skill middleware', () => {
  async function injectPromptWithSkills() {
    const middlewares = buildAiSdkMiddlewares({
      ...createBaseConfig(),
      getSkills: async () => [
        {
          id: 'skill-integration',
          name: 'Integration Guard',
          enabled: true,
          instructions: 'Preserve prompt array shape.'
        }
      ]
    })

    const skillMiddleware = middlewares[0]
    const inputParams = {
      prompt: [{ role: 'user', content: [{ type: 'text', text: 'test prompt' }] }]
    }

    const transformed = await skillMiddleware.transformParams!({ params: inputParams } as any)
    return transformed.prompt
  }

  it('keeps prompt as iterable message array when injecting skills', async () => {
    const middlewares = buildAiSdkMiddlewares({
      ...createBaseConfig(),
      getSkills: async () => [
        {
          id: 'skill-1',
          name: 'Production Debugging',
          enabled: true,
          instructions: 'Investigate root cause before making fixes.'
        }
      ]
    })

    const skillMiddleware = middlewares[0]
    expect(skillMiddleware?.transformParams).toBeTypeOf('function')

    const inputParams = {
      prompt: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }]
    }

    const transformed = await skillMiddleware.transformParams!({ params: inputParams } as any)

    expect(Array.isArray(transformed.prompt)).toBe(true)
    expect(transformed.prompt[0].role).toBe('system')
    expect(transformed.prompt[0].content).toContain('## Active Skills')
    expect(transformed.prompt[0].content).toContain('Production Debugging')
    expect(transformed.prompt[1].role).toBe('user')
  })

  it('keeps params unchanged when fetching skills fails', async () => {
    const middlewares = buildAiSdkMiddlewares({
      ...createBaseConfig(),
      getSkills: async () => {
        throw new Error('failed to load skills')
      }
    })

    const skillMiddleware = middlewares[0]
    const inputParams = {
      prompt: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }]
    }

    const transformed = await skillMiddleware.transformParams!({ params: inputParams } as any)

    expect(transformed).toEqual(inputParams)
    expect(Array.isArray(transformed.prompt)).toBe(true)
  })

  it('appends skills to an existing system message', async () => {
    const middlewares = buildAiSdkMiddlewares({
      ...createBaseConfig(),
      getSkills: async () => [
        {
          id: 'skill-2',
          name: 'Memory Rules',
          enabled: true,
          instructions: 'Keep context concise.'
        }
      ]
    })

    const skillMiddleware = middlewares[0]
    const inputParams = {
      prompt: [
        { role: 'system', content: 'Original system rules.' },
        { role: 'user', content: [{ type: 'text', text: 'Hi' }] }
      ]
    }

    const transformed = await skillMiddleware.transformParams!({ params: inputParams } as any)

    expect(transformed.prompt[0].role).toBe('system')
    expect(transformed.prompt[0].content).toContain('Original system rules.')
    expect(transformed.prompt[0].content).toContain('## Active Skills')
    expect(transformed.prompt[0].content).toContain('Memory Rules')
  })

  it('keeps prompt compatible with OpenAI responses conversion', async () => {
    const prompt = await injectPromptWithSkills()

    const model = new OpenAIResponsesLanguageModel('gpt-4o-mini', {
      provider: 'openai.responses',
      url: ({ path }) => `https://example.invalid${path}`,
      headers: () => ({})
    })

    const result = await (model as any).getArgs({
      prompt,
      mode: { type: 'regular' },
      maxOutputTokens: undefined,
      temperature: undefined,
      topP: undefined,
      topK: undefined,
      frequencyPenalty: undefined,
      presencePenalty: undefined,
      stopSequences: undefined,
      responseFormat: undefined,
      seed: undefined,
      tools: undefined,
      toolChoice: undefined,
      providerOptions: undefined,
      headers: undefined,
      abortSignal: undefined
    })

    expect(Array.isArray(result.args.input)).toBe(true)
    expect(result.args.input.length).toBeGreaterThan(0)
  })

  it('keeps prompt compatible with Anthropic messages conversion', async () => {
    const prompt = await injectPromptWithSkills()

    const model = new AnthropicMessagesLanguageModel('claude-3-5-haiku-latest', {
      provider: 'anthropic.messages',
      baseURL: 'https://example.invalid',
      headers: () => ({})
    })

    const result = await (model as any).getArgs({
      prompt,
      mode: { type: 'regular' },
      maxOutputTokens: undefined,
      temperature: undefined,
      topP: undefined,
      topK: undefined,
      frequencyPenalty: undefined,
      presencePenalty: undefined,
      stopSequences: undefined,
      responseFormat: undefined,
      seed: undefined,
      tools: undefined,
      toolChoice: undefined,
      providerOptions: undefined,
      headers: undefined,
      abortSignal: undefined,
      stream: true,
      userSuppliedBetas: new Set()
    })

    expect(Array.isArray(result.args.messages)).toBe(true)
    expect(result.args.messages.length).toBeGreaterThan(0)
  })
})
