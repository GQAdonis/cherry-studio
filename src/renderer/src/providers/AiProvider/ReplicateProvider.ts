import { ChunkType } from '@renderer/types/chunk'
import { Message } from '@renderer/types/newMessage'
import {
  Assistant,
  GenerateImageParams,
  MCPCallToolResponse,
  MCPTool,
  MCPToolResponse,
  Model,
  Provider,
  Suggestion
} from '@renderer/types'
import { getErrorMessage } from '@renderer/utils'
import FileManager from '@renderer/services/FileManager'
import { isEmpty } from 'lodash'
import OpenAI from 'openai'

import { CompletionsParams } from '.'
import BaseProvider from './BaseProvider'

/**
 * ReplicateProvider - Provider implementation for Replicate API
 */
export default class ReplicateProvider extends BaseProvider {
  private readonly DEFAULT_API_HOST = 'https://api.replicate.com'
  private readonly STABILITY_AI_MODEL_ID = 'stability-ai/sdxl'
  private readonly STABILITY_AI_TURBO_MODEL_ID = 'stability-ai/sdxl-turbo'
  private readonly LUMA_PHOTON_MODEL_ID = 'lumalabs/luma-photon'

  constructor(provider: Provider) {
    super(provider)
  }

  /**
   * Get the base URL for the Replicate API
   * @returns The base URL for the Replicate API
   */
  public getBaseURL(): string {
    return this.provider.apiHost || this.DEFAULT_API_HOST
  }

  /**
   * Get the default headers for the Replicate API
   * @returns The default headers for the Replicate API
   */
  public defaultHeaders() {
    return {
      'HTTP-Referer': 'https://cherry-ai.com',
      'X-Title': 'Prometheus Studio',
      'X-Api-Key': this.apiKey
    }
  }

  /**
   * Get the Replicate specific headers
   * @returns The Replicate specific headers
   */
  private getReplicateHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Token ${this.apiKey}`
    }
  }

  /**
   * Get the model version ID for a given model name
   * @param model The model name
   * @returns The model version ID
   */
  private getModelVersionId(model: string): string {
    // Default model versions - these should be updated as new versions are released
    const MODEL_VERSIONS = {
      'stability-ai/sdxl': 'a00d0b7dcbb9c3fbb34ba87d2d5b46c56969c84a628bf778a7fdaec30b1b99c5',
      'stability-ai/sdxl-turbo': '8beff3369e81422112d93b89ca01426147de542cd4684c244b673b105188fe5f',
      'lumalabs/luma-photon': '1a1a8a71fd165b5151a1594943d36f16c10f0b76c8a2b44f0cbb0ad97042cd85'
    }

    if (model.includes('sdxl-turbo')) {
      return MODEL_VERSIONS['stability-ai/sdxl-turbo']
    } else if (model.includes('sdxl')) {
      return MODEL_VERSIONS['stability-ai/sdxl']
    } else if (model.includes('luma-photon')) {
      return MODEL_VERSIONS['lumalabs/luma-photon']
    }

    // Default to SDXL if model is not recognized
    return MODEL_VERSIONS['stability-ai/sdxl']
  }

  /**
   * Get the model ID for a given model name
   * @param model The model name
   * @returns The model ID
   */
  private getModelId(model: string): string {
    if (model.includes('sdxl-turbo')) {
      return this.STABILITY_AI_TURBO_MODEL_ID
    } else if (model.includes('sdxl')) {
      return this.STABILITY_AI_MODEL_ID
    } else if (model.includes('luma-photon')) {
      return this.LUMA_PHOTON_MODEL_ID
    }

    // Default to SDXL if model is not recognized
    return this.STABILITY_AI_MODEL_ID
  }

  /**
   * Generate an image using the Replicate API
   * @param params The parameters for image generation
   * @returns An array of image URLs
   */
  public async generateImage(params: GenerateImageParams): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error('API key is required for Replicate')
    }

    const { model, prompt, negativePrompt, imageSize, seed, guidanceScale, numInferenceSteps, signal } = params

    // Get the model ID and version
    const modelId = this.getModelId(model)
    const versionId = this.getModelVersionId(model)

    // Parse image size
    const [width, height] = imageSize.split('x').map(Number)

    // Prepare the request body
    const requestBody: Record<string, any> = {
      version: versionId,
      input: {
        prompt,
        negative_prompt: negativePrompt || '',
        num_outputs: params.batchSize || 1
      }
    }

    // Add model-specific parameters
    if (modelId === this.STABILITY_AI_MODEL_ID || modelId === this.STABILITY_AI_TURBO_MODEL_ID) {
      // SDXL model parameters
      requestBody.input.width = width || 1024
      requestBody.input.height = height || 1024
      
      if (seed) requestBody.input.seed = parseInt(seed)
      if (guidanceScale) requestBody.input.guidance_scale = guidanceScale
      if (numInferenceSteps) requestBody.input.num_inference_steps = numInferenceSteps
    } else if (modelId === this.LUMA_PHOTON_MODEL_ID) {
      // Luma Photon model parameters
      requestBody.input.width = width || 1024
      requestBody.input.height = height || 1024
      
      if (seed) requestBody.input.seed = parseInt(seed)
      // Luma Photon specific parameters
      requestBody.input.apply_watermark = false
    }

    try {
      // Create the prediction
      const createResponse = await fetch(`${this.getBaseURL()}/v1/predictions`, {
        method: 'POST',
        headers: this.getReplicateHeaders(),
        body: JSON.stringify(requestBody),
        signal
      })

      if (!createResponse.ok) {
        const errorData = await createResponse.json()
        throw new Error(errorData.error || 'Failed to create prediction')
      }

      const createData = await createResponse.json()
      const predictionId = createData.id

      // Poll for the prediction result
      let imageUrls: string[] = []
      let status = 'starting'
      
      while (status !== 'succeeded' && status !== 'failed' && status !== 'canceled') {
        // Check if the request has been aborted
        if (signal?.aborted) {
          // Cancel the prediction
          await fetch(`${this.getBaseURL()}/v1/predictions/${predictionId}/cancel`, {
            method: 'POST',
            headers: this.getReplicateHeaders()
          })
          throw new Error('Request aborted')
        }

        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Get the prediction status
        const statusResponse = await fetch(`${this.getBaseURL()}/v1/predictions/${predictionId}`, {
          method: 'GET',
          headers: this.getReplicateHeaders(),
          signal
        })

        if (!statusResponse.ok) {
          const errorData = await statusResponse.json()
          throw new Error(errorData.error || 'Failed to get prediction status')
        }

        const statusData = await statusResponse.json()
        status = statusData.status

        // If the prediction has completed, get the output
        if (status === 'succeeded') {
          // Extract image URLs from the output
          if (Array.isArray(statusData.output)) {
            imageUrls = statusData.output
          } else if (typeof statusData.output === 'string') {
            imageUrls = [statusData.output]
          }
        } else if (status === 'failed') {
          throw new Error(statusData.error || 'Prediction failed')
        }
      }

      return imageUrls
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Replicate image generation error:', error)
        throw error
      }
      return []
    }
  }

  /**
   * Generate an image using the chat interface
   * @param params The parameters for image generation
   */
  public async generateImageByChat({ messages, assistant, onChunk }: CompletionsParams): Promise<void> {
    try {
      // Extract the prompt from the last user message
      const lastUserMessage = messages.findLast(m => m.role === 'user')
      if (!lastUserMessage) {
        throw new Error('No user message found')
      }

      const prompt = await this.getMessageContent(lastUserMessage)
      if (!prompt) {
        throw new Error('Empty prompt')
      }

      // Extract parameters from the assistant settings
      const model = assistant.model?.id || 'stability-ai/sdxl'
      const negativePrompt = assistant.settings?.customParameters?.find(p => p.name === 'negative_prompt')?.value as string || ''
      const imageSize = assistant.settings?.customParameters?.find(p => p.name === 'image_size')?.value as string || '1024x1024'
      const seed = assistant.settings?.customParameters?.find(p => p.name === 'seed')?.value as string || ''
      const guidanceScale = assistant.settings?.customParameters?.find(p => p.name === 'guidance_scale')?.value as number || 7.5
      const numInferenceSteps = assistant.settings?.customParameters?.find(p => p.name === 'num_inference_steps')?.value as number || 30
      const batchSize = assistant.settings?.customParameters?.find(p => p.name === 'batch_size')?.value as number || 1

      // Notify that generation has started
      onChunk({ type: ChunkType.LLM_RESPONSE_CREATED })

      // Generate the image
      const imageUrls = await this.generateImage({
        model,
        prompt,
        negativePrompt,
        imageSize,
        seed,
        guidanceScale,
        numInferenceSteps,
        batchSize,
        promptEnhancement: false
      })

      if (isEmpty(imageUrls)) {
        throw new Error('No images generated')
      }

      // Download the images
      const downloadedFiles = await Promise.all(
        imageUrls.map(async (url) => {
          try {
            return await window.api.file.download(url)
          } catch (error) {
            console.error('Failed to download image:', error)
            return null
          }
        })
      )

      const validFiles = downloadedFiles.filter(Boolean)

      // Add the files to the file manager
      await FileManager.addFiles(validFiles)

      // Create a response with the generated images
      onChunk({
        response: {
          text: `Generated ${validFiles.length} image(s) with prompt: "${prompt}"`,
          generateImage: {
            type: 'url',
            images: imageUrls
          }
        },
        type: ChunkType.BLOCK_COMPLETE
      })
    } catch (error) {
      console.error('Replicate image generation error:', error)
      onChunk({
        response: {
          text: `Error generating image: ${getErrorMessage(error)}`,
          error: error instanceof Error ? error : new Error(String(error))
        },
        type: ChunkType.BLOCK_COMPLETE
      })
    }
  }

  // The following methods are required by the BaseProvider abstract class
  // but are not used for image generation providers

  public async completions({ messages, assistant, onChunk }: CompletionsParams): Promise<void> {
    return this.generateImageByChat({ messages, assistant, onChunk, onFilterMessages: () => {} })
  }

  public async translate(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _content: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _assistant: Assistant,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _onResponse?: (text: string, isComplete: boolean) => void
  ): Promise<string> {
    throw new Error('Method not implemented for Replicate provider')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async summaries(_messages: Message[], _assistant: Assistant): Promise<string> {
    throw new Error('Method not implemented for Replicate provider')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async summaryForSearch(_messages: Message[], _assistant: Assistant): Promise<string | null> {
    throw new Error('Method not implemented for Replicate provider')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async suggestions(_messages: Message[], _assistant: Assistant): Promise<Suggestion[]> {
    throw new Error('Method not implemented for Replicate provider')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async generateText(_params: { prompt: string; content: string }): Promise<string> {
    throw new Error('Method not implemented for Replicate provider')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async check(_model: Model, _stream: boolean = false): Promise<{ valid: boolean; error: Error | null }> {
    try {
      if (!this.apiKey) {
        return { valid: false, error: new Error('API key is required for Replicate') }
      }

      // Make a simple API request to check if the API key is valid
      const response = await fetch(`${this.getBaseURL()}/v1/models`, {
        method: 'GET',
        headers: this.getReplicateHeaders()
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { valid: false, error: new Error(errorData.error || 'Failed to validate API key') }
      }

      return { valid: true, error: null }
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error : new Error(String(error)) }
    }
  }

  public async models(): Promise<OpenAI.Models.Model[]> {
    // Return a list of supported models
    return [
      {
        id: 'stability-ai/sdxl',
        object: 'model',
        created: Date.now(),
        owned_by: 'stability-ai',
        permission: [],
        root: 'stability-ai/sdxl',
        parent: null
      },
      {
        id: 'stability-ai/sdxl-turbo',
        object: 'model',
        created: Date.now(),
        owned_by: 'stability-ai',
        permission: [],
        root: 'stability-ai/sdxl-turbo',
        parent: null
      },
      {
        id: 'lumalabs/luma-photon',
        object: 'model',
        created: Date.now(),
        owned_by: 'lumalabs',
        permission: [],
        root: 'lumalabs/luma-photon',
        parent: null
      }
    ] as unknown as OpenAI.Models.Model[]
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async getEmbeddingDimensions(_model: Model): Promise<number> {
    return 0 // Not applicable for image generation
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public convertMcpTools<T>(_mcpTools: MCPTool[]): T[] {
    return [] as unknown as T[] // Not applicable for image generation
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public mcpToolCallResponseToMessage(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _mcpToolResponse: MCPToolResponse,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _resp: MCPCallToolResponse,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _model: Model
  ): any {
    return null // Not applicable for image generation
  }
}