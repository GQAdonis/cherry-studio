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
 * FALProvider - Provider implementation for FAL.ai image generation API
 */
export default class FALProvider extends BaseProvider {
  private readonly DEFAULT_API_HOST = 'https://api.fal.ai'
  private readonly FLUX_MODEL_ID = 'fal-ai/flux/dev'
  private readonly SDXL_MODEL_ID = 'fal-ai/fast-sdxl'
  private readonly LIGHTNING_SDXL_MODEL_ID = 'fal-ai/fast-lightning-sdxl'

  constructor(provider: Provider) {
    super(provider)
  }

  /**
   * Get the base URL for the FAL.ai API
   * @returns The base URL for the FAL.ai API
   */
  public getBaseURL(): string {
    return this.provider.apiHost || this.DEFAULT_API_HOST
  }

  /**
   * Get the default headers for the FAL.ai API
   * @returns The default headers for the FAL.ai API
   */
  public defaultHeaders() {
    return {
      'HTTP-Referer': 'https://cherry-ai.com',
      'X-Title': 'Prometheus Studio',
      'X-Api-Key': this.apiKey
    }
  }

  /**
   * Get the FAL.ai specific headers
   * @returns The FAL.ai specific headers
   */
  private getFALHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Key ${this.apiKey}`
    }
  }

  /**
   * Generate an image using the FAL.ai API
   * @param params The parameters for image generation
   * @returns An array of image URLs
   */
  public async generateImage(params: GenerateImageParams): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error('API key is required for FAL.ai')
    }

    const { model, prompt, negativePrompt, imageSize, seed, guidanceScale, numInferenceSteps, signal } = params

    // Determine which FAL.ai model to use based on the selected model
    let modelId = this.FLUX_MODEL_ID
    if (model.includes('sdxl')) {
      modelId = model.includes('lightning') ? this.LIGHTNING_SDXL_MODEL_ID : this.SDXL_MODEL_ID
    }

    // Parse image size
    const [width, height] = imageSize.split('x').map(Number)

    // Prepare the request body
    const requestBody: Record<string, any> = {
      prompt,
      negative_prompt: negativePrompt || '',
      num_images: params.batchSize || 1
    }

    // Add model-specific parameters
    if (modelId === this.FLUX_MODEL_ID) {
      // FLUX model parameters
      requestBody.width = width
      requestBody.height = height
      if (seed) requestBody.seed = parseInt(seed)
    } else {
      // SDXL model parameters
      if (width && height) {
        requestBody.width = width
        requestBody.height = height
      } else {
        // Use a preset size if width and height are not specified
        requestBody.image_size = 'square_hd'
      }
      
      if (seed) requestBody.seed = parseInt(seed)
      if (guidanceScale) requestBody.guidance_scale = guidanceScale
      if (numInferenceSteps) requestBody.num_inference_steps = numInferenceSteps
    }

    try {
      // Make the API request
      const response = await fetch(`${this.getBaseURL()}/v1/models/${modelId}/text-to-image`, {
        method: 'POST',
        headers: this.getFALHeaders(),
        body: JSON.stringify(requestBody),
        signal
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to generate image')
      }

      const data = await response.json()
      
      // Extract image URLs from the response
      let imageUrls: string[] = []
      
      if (data.images) {
        // FLUX model response format
        imageUrls = data.images.map((img: any) => img.url)
      } else if (data.image) {
        // Single image response format
        imageUrls = [data.image.url]
      } else if (data.images_urls) {
        // Multiple images response format
        imageUrls = data.images_urls
      } else if (Array.isArray(data)) {
        // Array response format
        imageUrls = data.map((item: any) => item.url || item.image?.url).filter(Boolean)
      }

      return imageUrls
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('FAL.ai image generation error:', error)
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
      const model = assistant.model?.id || 'flux'
      const negativePrompt = assistant.settings?.customParameters?.find(p => p.name === 'negative_prompt')?.value as string || ''
      const imageSize = assistant.settings?.customParameters?.find(p => p.name === 'image_size')?.value as string || '512x512'
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
      console.error('FAL.ai image generation error:', error)
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
    throw new Error('Method not implemented for FAL.ai provider')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async summaries(_messages: Message[], _assistant: Assistant): Promise<string> {
    throw new Error('Method not implemented for FAL.ai provider')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async summaryForSearch(_messages: Message[], _assistant: Assistant): Promise<string | null> {
    throw new Error('Method not implemented for FAL.ai provider')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async suggestions(_messages: Message[], _assistant: Assistant): Promise<Suggestion[]> {
    throw new Error('Method not implemented for FAL.ai provider')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async generateText(_params: { prompt: string; content: string }): Promise<string> {
    throw new Error('Method not implemented for FAL.ai provider')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async check(_model: Model, _stream: boolean = false): Promise<{ valid: boolean; error: Error | null }> {
    try {
      if (!this.apiKey) {
        return { valid: false, error: new Error('API key is required for FAL.ai') }
      }

      // Make a simple API request to check if the API key is valid
      const response = await fetch(`${this.getBaseURL()}/v1/models`, {
        method: 'GET',
        headers: this.getFALHeaders()
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { valid: false, error: new Error(errorData.error?.message || 'Failed to validate API key') }
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
        id: 'flux',
        object: 'model',
        created: Date.now(),
        owned_by: 'fal.ai',
        permission: [],
        root: 'flux',
        parent: null
      },
      {
        id: 'sdxl',
        object: 'model',
        created: Date.now(),
        owned_by: 'fal.ai',
        permission: [],
        root: 'sdxl',
        parent: null
      },
      {
        id: 'lightning-sdxl',
        object: 'model',
        created: Date.now(),
        owned_by: 'fal.ai',
        permission: [],
        root: 'lightning-sdxl',
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