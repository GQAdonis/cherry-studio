import type { OpenAIProviderSettings } from '@ai-sdk/openai'
import { createOpenAI } from '@ai-sdk/openai'
import type {
  EmbeddingModelV3,
  ImageModelV3,
  LanguageModelV3,
  ProviderV3,
  SpeechModelV3,
  TranscriptionModelV3
} from '@ai-sdk/provider'
import type { FetchFunction } from '@ai-sdk/provider-utils'
import { loadApiKey } from '@ai-sdk/provider-utils'

export const CHERRYIN_PROVIDER_NAME = 'cherryin' as const
export const DEFAULT_CHERRYIN_BASE_URL = 'https://open.cherryin.net/v1'

type HeaderValue = string | undefined

type HeadersInput = Record<string, HeaderValue> | (() => Record<string, HeaderValue>)

export interface CherryInProviderSettings {
  /**
   * CherryIN API key.
   *
   * If omitted, the provider will read the `CHERRYIN_API_KEY` environment variable.
   */
  apiKey?: string
  /**
   * Optional custom fetch implementation.
   */
  fetch?: FetchFunction
  /**
   * Base URL for OpenAI-compatible CherryIN endpoints.
   *
   * Defaults to `https://open.cherryin.net/v1`.
   */
  baseURL?: string
  /**
   * Optional static headers applied to every request.
   */
  headers?: HeadersInput
}

export interface CherryInProvider extends ProviderV3 {
  (modelId: string, settings?: OpenAIProviderSettings): LanguageModelV3
  languageModel(modelId: string, settings?: OpenAIProviderSettings): LanguageModelV3
  embeddingModel(modelId: string, settings?: OpenAIProviderSettings): EmbeddingModelV3
  chat(modelId: string, settings?: OpenAIProviderSettings): LanguageModelV3
  responses(modelId: string): LanguageModelV3
  completion(modelId: string, settings?: OpenAIProviderSettings): LanguageModelV3
  embedding(modelId: string, settings?: OpenAIProviderSettings): EmbeddingModelV3
  textEmbedding(modelId: string, settings?: OpenAIProviderSettings): EmbeddingModelV3
  textEmbeddingModel(modelId: string, settings?: OpenAIProviderSettings): EmbeddingModelV3
  image(modelId: string, settings?: OpenAIProviderSettings): ImageModelV3
  imageModel(modelId: string, settings?: OpenAIProviderSettings): ImageModelV3
  transcription(modelId: string): TranscriptionModelV3
  transcriptionModel(modelId: string): TranscriptionModelV3
  speech(modelId: string): SpeechModelV3
  speechModel(modelId: string): SpeechModelV3
}

const resolveApiKey = (options: CherryInProviderSettings): string => {
  // In browser environments, we can't access environment variables
  // so we only use the explicitly provided apiKey
  if (options.apiKey) {
    return options.apiKey
  }

  // Try to use loadApiKey only if we're in a Node.js environment
  try {
    return loadApiKey({
      apiKey: options.apiKey,
      environmentVariableName: 'CHERRYIN_API_KEY',
      description: 'CherryIN'
    })
  } catch (error) {
    // If we can't load from environment variables (browser environment)
    // return empty string - the provider will need an explicit API key
    return ''
  }
}

const createCustomFetch = (originalFetch: FetchFunction): FetchFunction => {
  return async (input: string | URL | Request, init?: RequestInit) => {
    if (init?.body && typeof init.body === 'string') {
      try {
        const body = JSON.parse(init.body)
        if (body.tools && Array.isArray(body.tools) && body.tools.length === 0 && body.tool_choice) {
          delete body.tool_choice
          init.body = JSON.stringify(body)
        }
      } catch (error) {
        // ignore error
      }
    }

    return originalFetch(input, init)
  }
}

const resolveConfiguredHeaders = (headers?: HeadersInput): Record<string, HeaderValue> => {
  if (typeof headers === 'function') {
    return { ...headers() }
  }
  return headers ? { ...headers } : {}
}

const createJsonHeaders = (options: CherryInProviderSettings): Record<string, string> => {
  const configuredHeaders = resolveConfiguredHeaders(options.headers)
  const apiKey = resolveApiKey(options)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...Object.fromEntries(
      Object.entries(configuredHeaders)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, value!])
    )
  }

  // Only add Authorization header if we have an API key
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }

  return headers
}

export const createCherryIn = (options: CherryInProviderSettings = {}): CherryInProvider => {
  const { baseURL = DEFAULT_CHERRYIN_BASE_URL, fetch } = options

  const headers = createJsonHeaders(options)

  // Create a single OpenAI provider for all models
  const openaiProvider = createOpenAI({
    baseURL,
    headers,
    fetch: fetch ? createCustomFetch(fetch) : undefined
  })

  const createChatModel = (modelId: string, _settings?: OpenAIProviderSettings) => openaiProvider.languageModel(modelId)

  const createEmbeddingModel = (modelId: string, _settings?: OpenAIProviderSettings) =>
    openaiProvider.embeddingModel(modelId)

  const provider: CherryInProvider = Object.assign(
    function (modelId: string, settings?: OpenAIProviderSettings) {
      if (new.target) {
        throw new Error('CherryIN provider function cannot be called with the new keyword.')
      }
      return createChatModel(modelId, settings)
    },
    {
      specificationVersion: 'v3' as const,
      languageModel: createChatModel,
      embeddingModel: createEmbeddingModel,
      chat: createChatModel,
      responses: (modelId: string) => openaiProvider.responses(modelId),
      completion: (modelId: string) => openaiProvider.completion(modelId),
      embedding: createEmbeddingModel,
      textEmbedding: createEmbeddingModel,
      textEmbeddingModel: createEmbeddingModel,
      image: (modelId: string) => openaiProvider.imageModel(modelId),
      imageModel: (modelId: string) => openaiProvider.imageModel(modelId),
      transcription: (modelId: string) => openaiProvider.transcription(modelId),
      transcriptionModel: (modelId: string) => openaiProvider.transcription(modelId),
      speech: (modelId: string) => openaiProvider.speech(modelId),
      speechModel: (modelId: string) => openaiProvider.speech(modelId)
    }
  )

  return provider
}

export const cherryIn = createCherryIn()
