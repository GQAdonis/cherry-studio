/**
 * Configuration for Huggingface models
 * Contains URLs for downloading models and model configurations
 */

/**
 * URLs for downloading models from Huggingface
 */
import { Model } from '@renderer/types'

export const MODEL_URLS = {
  'HuggingFaceTB/SmolLM2-360M-Instruct': 'https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct/resolve/main/SmolLM2-360M-Instruct-GGUF/SmolLM2-360M-Instruct-q4_0.gguf',
  'HuggingFaceTB/SmolLM2-135M-Instruct': 'https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct/resolve/main/SmolLM2-135M-Instruct-GGUF/SmolLM2-135M-Instruct-q4_0.gguf'
}

/**
 * Model configurations for Huggingface models
 */
export const HUGGINGFACE_MODELS: Model[] = [
  {
    id: 'HuggingFaceTB/SmolLM2-360M-Instruct',
    name: 'SmolLM2-360M-Instruct',
    description: 'A 360M parameter instruction-tuned model optimized for CPU inference',
    provider: 'huggingface',
    group: 'SmolLM2',
    type: ['text']
  },
  {
    id: 'HuggingFaceTB/SmolLM2-135M-Instruct',
    name: 'SmolLM2-135M-Instruct',
    description: 'A 135M parameter instruction-tuned model optimized for CPU inference',
    provider: 'huggingface',
    group: 'SmolLM2',
    type: ['text']
  }
]

/**
 * Default model ID to use if none is specified
 */
export const DEFAULT_MODEL_ID = 'HuggingFaceTB/SmolLM2-360M-Instruct'

/**
 * Performance settings for different models
 */
export const MODEL_PERFORMANCE_SETTINGS = {
  'HuggingFaceTB/SmolLM2-360M-Instruct': {
    threads: 4,
    gpuLayers: 0, // Run on CPU
    batchSize: 512
  },
  'HuggingFaceTB/SmolLM2-135M-Instruct': {
    threads: 4,
    gpuLayers: 0, // Run on CPU
    batchSize: 512
  }
}