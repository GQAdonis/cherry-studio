import { Provider } from '@renderer/types'

import AihubmixProvider from './AihubmixProvider'
import AnthropicProvider from './AnthropicProvider'
import BaseProvider from './BaseProvider'
import GeminiProvider from './GeminiProvider'
import HuggingfaceProvider from './HuggingfaceProvider'
import OpenAIProvider from './OpenAIProvider'
import OpenAIResponseProvider from './OpenAIResponseProvider'

export default class ProviderFactory {
  static create(provider: Provider): BaseProvider {
    if (provider.id === 'aihubmix') {
      return new AihubmixProvider(provider)
    }

    switch (provider.type) {
      case 'openai':
        return new OpenAIProvider(provider)
      case 'openai-response':
        return new OpenAIResponseProvider(provider)
      case 'anthropic':
        return new AnthropicProvider(provider)
      case 'gemini':
        return new GeminiProvider(provider)
      case 'huggingface':
        return new HuggingfaceProvider(provider)
      default:
        return new OpenAIProvider(provider)
    }
  }
}

export function isOpenAIProvider(provider: Provider) {
  return !['anthropic', 'gemini', 'huggingface'].includes(provider.type)
}

export function isHuggingfaceProvider(provider: Provider) {
  return provider.type === 'huggingface'
}
