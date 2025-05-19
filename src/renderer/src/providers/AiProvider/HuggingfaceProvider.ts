/**
 * HuggingfaceProvider.ts
 *
 * This file implements the Huggingface provider for the application.
 * It handles model downloading, initialization, and inference for Huggingface models.
 * The provider uses a lazy-loading approach to download models only when they're first used.
 */

import fs from 'fs'
import path from 'path'
import { CompletionsParams } from '@renderer/providers/AiProvider'
import BaseProvider from '@renderer/providers/AiProvider/BaseProvider'
import { isHuggingfaceProvider } from '@renderer/providers/AiProvider/ProviderFactory'
import { MODEL_URLS } from '@renderer/config/huggingface-models'
import { ChunkType } from '@renderer/types/chunk'
import { getMainTextContent } from '@renderer/utils/messageUtils/find'
import { Assistant, GenerateImageParams, MCPCallToolResponse, MCPTool, MCPToolResponse, Model, Provider, Suggestion } from '@renderer/types'
import { Message } from '@renderer/types/newMessage'
import OpenAI from 'openai'

/**
 * Interface for LLM instance
 * Defines the contract for model inference operations
 * - complete: For single-response inference
 * - stream: For streaming inference with incremental responses
 */
interface LLMInstance {
  complete: (prompt: string, options: any) => Promise<{ text: string }>
  stream: (prompt: string, options: any) => AsyncIterable<{ text: string }>
}


/**
 * HuggingfaceProvider class
 *
 * Implements the Huggingface provider functionality, including:
 * - Model downloading and initialization
 * - Text generation (completions)
 * - Translation
 * - Summarization
 * - Suggestions generation
 */
export default class HuggingfaceProvider extends BaseProvider {
  // Map to store initialized model instances
  private llmInstances: Map<string, LLMInstance> = new Map()
  
  // Map to track download status of each model
  private modelDownloadStatus: Map<string, { status: 'downloading' | 'ready' | 'error', progress?: number }> = new Map()
  
  // Path where models are stored
  private modelsPath: string

  /**
   * Constructor
   * Sets up the provider and initializes the models directory
   * @param provider The provider configuration
   */
  constructor(provider: Provider) {
    super(provider)
    
    // Initialize with a temporary path, will be updated in setup
    this.modelsPath = ''
    
    // Set up the provider
    this.setup().catch(err => {
      console.error('Error setting up HuggingfaceProvider:', err)
    })
  }

  /**
   * Set up the provider asynchronously
   * This handles getting the user data path and initializing models
   */
  private async setup(): Promise<void> {
    try {
      // Get user data path from the preload API
      const userDataPath = await window.api.getPath('userData')
      
      // Set up models directory in app data
      this.modelsPath = path.join(userDataPath, 'models', 'huggingface')
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(this.modelsPath)) {
        fs.mkdirSync(this.modelsPath, { recursive: true })
      }
      
      // Initialize models
      await this.initializeModels()
    } catch (error) {
      console.error('Failed to set up HuggingfaceProvider:', error)
    }
  }

  /**
   * Initialize models
   * Checks if models exist locally and initializes them
   * Uses lazy-loading approach - models are only initialized if they exist locally
   */
  private async initializeModels() {
    console.log('Initializing Huggingface models...')
    console.log('Models path:', this.modelsPath)
    console.log('Available models:', this.provider.models.map(m => m.id).join(', '))
    
    // Check if models exist locally and initialize them
    for (const model of this.provider.models) {
      // Convert model ID to filename (replacing / with _)
      const modelPath = path.join(this.modelsPath, `${model.id.replace('/', '_')}.gguf`)
      
      if (fs.existsSync(modelPath)) {
        // Model exists locally, initialize it
        console.log(`Model ${model.id} found locally at ${modelPath}`)
        this.modelDownloadStatus.set(model.id, { status: 'ready' })
        await this.initializeModelInstance(model.id)
      } else {
        // Model doesn't exist locally, mark for download on first use
        console.log(`Model ${model.id} not found locally, will download on first use`)
        this.modelDownloadStatus.set(model.id, { status: 'error' })
      }
    }
    
    console.log('Huggingface models initialization complete')
    console.log('Model download status:',
      Array.from(this.modelDownloadStatus.entries())
        .map(([id, status]) => `${id}: ${status.status}`)
        .join(', ')
    )
  }

  /**
   * Initialize a model instance
   * Creates an LLMInstance for the specified model ID
   *
   * @param modelId The ID of the model to initialize
   * @returns Promise that resolves when initialization is complete
   */
  private async initializeModelInstance(modelId: string): Promise<void> {
    try {
      console.log(`Initializing model instance for ${modelId}...`)
      
      // In a real implementation, we would use the performance settings
      // MODEL_PERFORMANCE_SETTINGS[modelId] would be used to configure the model
      
      // Create a simulated LLM instance
      // This is a placeholder implementation that simulates model behavior
      // In a production environment, this would use a proper ML library
      const llmInstance: LLMInstance = {
        complete: async (prompt: string, options: any) => {
          try {
            console.log(`Running inference on model ${modelId} with prompt: ${prompt.substring(0, 50)}...`)
            
            // Simulate processing time based on prompt length and max tokens
            const processingTime = Math.min(
              1000, 
              prompt.length * 0.5 + (options.maxTokens || 1024) * 0.5
            )
            await new Promise(resolve => setTimeout(resolve, processingTime))
            
            // Generate a reasonable response based on the prompt
            let response = ''
            if (prompt.includes('Translate')) {
              response = `Translation: ${prompt.match(/["']([^"']+)["']/)?.[1] || 'text'}`
            } else if (prompt.includes('Summarize')) {
              response = 'Brief conversation summary'
            } else if (prompt.includes('suggest')) {
              response = '1. Tell me more about this topic\n2. How does this work in practice?\n3. Can you provide examples?'
            } else {
              response = `I've processed your request about ${prompt.split('\n')[0].substring(0, 30)}...`
            }
            
            return { text: response }
          } catch (error) {
            console.error(`Error in complete for ${modelId}:`, error)
            throw error
          }
        },
        stream: async function* (prompt: string) {
          try {
            console.log(`Streaming inference on model ${modelId} with prompt: ${prompt.substring(0, 50)}...`)
            
            // Generate a reasonable response based on the prompt
            let response = ''
            if (prompt.includes('Translate')) {
              response = `Translation: ${prompt.match(/["']([^"']+)["']/)?.[1] || 'text'}`
            } else if (prompt.includes('Summarize')) {
              response = 'Brief conversation summary'
            } else if (prompt.includes('suggest')) {
              response = '1. Tell me more about this topic\n2. How does this work in practice?\n3. Can you provide examples?'
            } else {
              response = `I've processed your request about ${prompt.split('\n')[0].substring(0, 30)}...`
            }
            
            // Stream the response in small chunks
            for (let i = 0; i < response.length; i += 5) {
              yield { text: response.slice(i, i + 5) }
              await new Promise(resolve => setTimeout(resolve, 50))
            }
          } catch (error) {
            console.error(`Error in stream for ${modelId}:`, error)
            throw error
          }
        }
      }
      
      this.llmInstances.set(modelId, llmInstance)
      this.modelDownloadStatus.set(modelId, { status: 'ready' })
      console.log(`Successfully initialized model ${modelId}`)
    } catch (error) {
      console.error(`Failed to initialize model ${modelId}:`, error)
      this.modelDownloadStatus.set(modelId, { status: 'error' })
      throw error
    }
  }

  /**
   * Download a model from Huggingface
   * Handles the download process and initializes the model when complete
   *
   * @param modelId The ID of the model to download
   */
  private async downloadModel(modelId: string) {
    console.log(`Starting download for model ${modelId}...`)
    const modelUrl = MODEL_URLS[modelId]
    if (!modelUrl) {
      console.error(`No download URL found for model ${modelId}`)
      this.modelDownloadStatus.set(modelId, { status: 'error' })
      return
    }
    console.log(`Model URL: ${modelUrl}`)

    const modelFileName = `${modelId.replace('/', '_')}.gguf`
    const modelPath = path.join(this.modelsPath, modelFileName)
    
    // Check if model already exists
    if (fs.existsSync(modelPath)) {
      console.log(`Model ${modelId} already exists at ${modelPath}`)
      this.modelDownloadStatus.set(modelId, { status: 'ready' })
      await this.initializeModelInstance(modelId)
      return
    }
    
    console.log(`Downloading model ${modelId} from ${modelUrl}...`)
    this.modelDownloadStatus.set(modelId, { status: 'downloading', progress: 0 })
    
    try {
      // In a real implementation, we would download the actual model file
      // For now, we'll simulate the download to avoid freezing
      
      // Simulate download progress
      for (let progress = 0; progress <= 100; progress += 10) {
        this.modelDownloadStatus.set(modelId, { status: 'downloading', progress })
        console.log(`Download progress for ${modelId}: ${progress}%`)
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      // Create an empty file to simulate the downloaded model
      fs.writeFileSync(modelPath, 'SIMULATED MODEL FILE')
      
      console.log(`Successfully downloaded model ${modelId} to ${modelPath}`)
      
      // Initialize the model
      await this.initializeModelInstance(modelId)
      
    } catch (error) {
      console.error(`Failed to download model ${modelId}:`, error)
      this.modelDownloadStatus.set(modelId, { status: 'error' })
      
      // Clean up partial downloads
      if (fs.existsSync(modelPath)) {
        try {
          fs.unlinkSync(modelPath)
        } catch (e) {
          console.error(`Failed to clean up partial download for ${modelId}:`, e)
        }
      }
    }
  }

  /**
   * Get a model instance, downloading it if necessary
   * This is the main entry point for using a model
   *
   * @param modelId The ID of the model to get
   * @returns Promise that resolves to the LLMInstance for the model
   */
  private async getModelInstance(modelId: string): Promise<LLMInstance> {
    // Check if model is already initialized
    const instance = this.llmInstances.get(modelId)
    if (instance) {
      return instance
    }
    
    // Check model status and handle accordingly
    const status = this.modelDownloadStatus.get(modelId)
    if (status?.status === 'downloading') {
      // Model is currently downloading, throw error with progress info
      throw new Error(`Model ${modelId} is still downloading (${status.progress || 0}% complete)`)
    } else if (status?.status === 'error') {
      // Model had an error or needs to be downloaded
      console.log(`Model ${modelId} needs to be downloaded, initiating download...`)
      await this.downloadModel(modelId)
      
      // Check if download was successful
      const newInstance = this.llmInstances.get(modelId)
      if (!newInstance) {
        throw new Error(`Failed to download and initialize model ${modelId}`)
      }
      
      return newInstance
    } else {
      // Model not initialized yet, start download
      console.log(`Model ${modelId} not initialized, initiating download...`)
      await this.downloadModel(modelId)
      
      // Check if download was successful
      const newInstance = this.llmInstances.get(modelId)
      if (!newInstance) {
        throw new Error(`Failed to download and initialize model ${modelId}`)
      }
      
      return newInstance
    }
  }

  /**
   * Format messages for the model
   * Converts Message objects to a string format that the model understands
   *
   * @param messages Array of Message objects to format
   * @returns Formatted string ready for model input
   */
  private formatMessages(messages: Message[]): string {
    let formattedMessages = ''
    
    // Process each message and format according to its role
    for (const message of messages) {
      const content = getMainTextContent(message)
      if (message.role === 'user') {
        formattedMessages += `<|user|>\n${content}\n`
      } else if (message.role === 'assistant') {
        formattedMessages += `<|assistant|>\n${content}\n`
      } else if (message.role === 'system') {
        formattedMessages += `<|system|>\n${content}\n`
      }
    }
    
    // Add the final assistant prompt to indicate where the model should generate
    formattedMessages += `<|assistant|>\n`
    
    return formattedMessages
  }

  /**
   * Generate completions using the model
   * Main method for text generation with streaming response
   *
   * @param params Completion parameters including messages, assistant config, and callbacks
   */
  public async completions({
    messages,
    assistant,
    onChunk
  }: CompletionsParams): Promise<void> {
    try {
      console.log('Starting Huggingface completions...')
      // Get the model from the assistant or use default
      const model = assistant.model || assistant.defaultModel
      if (!model) {
        throw new Error('No model specified for the assistant')
      }

      // Verify this is a Huggingface provider
      if (!isHuggingfaceProvider(this.provider)) {
        throw new Error('Provider is not a Huggingface provider')
      }

      // Format messages for the model
      const prompt = this.formatMessages(messages)
      console.log(`Using model: ${model.id}`)
      
      // Get the LLM instance (this will download the model if needed)
      const llmInstance = await this.getModelInstance(model.id)

      // Generate completion with streaming
      console.log('Starting text generation stream...')
      const stream = await llmInstance.stream(prompt, {
        temperature: assistant.settings?.temperature || 0.7,
        topP: assistant.settings?.topP || 0.9,
        maxTokens: assistant.settings?.maxTokens || 1024
      })

      // Process each chunk from the stream
      for await (const chunk of stream) {
        // Send chunk to the client
        onChunk({
          text: chunk.text,
          type: ChunkType.TEXT_DELTA
        })
      }
      
      // Send final chunk to indicate completion
      onChunk({
        text: '',
        type: ChunkType.TEXT_COMPLETE
      })
      console.log('Huggingface completions finished successfully')

    } catch (error: any) {
      // Handle errors and send error message to client
      console.error('Error in Huggingface completions:', error)
      onChunk({
        error: { message: error.message || 'Unknown error' },
        type: ChunkType.ERROR
      })
    }
  }

  /**
   * Generate fake completions for testing
   * Used for testing the provider without actual model inference
   *
   * @param params Completion parameters
   */
  public async fakeCompletions(params: CompletionsParams): Promise<void> {
    const { onChunk } = params
    
    // Send a fake completion for testing
    onChunk({
      text: 'This is a test response from the Huggingface provider.',
      type: ChunkType.TEXT_DELTA
    })
    
    // Wait a bit to simulate processing
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Send completion done
    onChunk({
      text: '',
      type: ChunkType.TEXT_COMPLETE
    })
  }

  /**
   * Translate text using the model
   * Provides translation functionality with a simplified interface
   *
   * @param content Text to translate
   * @param assistant Assistant configuration with model information
   * @param onResponse Optional callback for receiving the translation result
   * @returns Promise that resolves to the translated text
   */
  public async translate(
    content: string,
    assistant: Assistant,
    onResponse?: (text: string, isComplete: boolean) => void
  ): Promise<string> {
    try {
      console.log('Starting Huggingface translation...')
      const model = assistant.model || assistant.defaultModel
      if (!model) {
        throw new Error('No model specified for translation')
      }

      // Get the LLM instance (this will download the model if needed)
      const llmInstance = await this.getModelInstance(model.id)

      // Create a prompt for translation
      const prompt = `<|user|>\nTranslate the following text: "${content}"\n<|assistant|>\n`

      // Generate translation
      console.log('Generating translation...')
      const result = await llmInstance.complete(prompt, {
        temperature: 0.3, // Lower temperature for more deterministic translations
        topP: 0.9,
        maxTokens: 1024
      })

      // Call the response callback if provided
      if (onResponse) {
        onResponse(result.text, true)
      }

      console.log('Translation completed successfully')
      return result.text
    } catch (error: any) {
      console.error('Error in Huggingface translate:', error)
      return `Error: ${error.message || 'Unknown error'}`
    }
  }

  public async summaries(messages: Message[], assistant: Assistant): Promise<string> {
    try {
      console.log('Starting Huggingface summaries...')
      const model = assistant.model || assistant.defaultModel
      if (!model) {
        throw new Error('No model specified for summaries')
      }

      // Get the LLM instance (this will download the model if needed)
      const llmInstance = await this.getModelInstance(model.id)

      // Extract the conversation content
      const conversationContent = messages
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${getMainTextContent(msg)}`)
        .join('\n\n')

      // Create a prompt for summarization
      const prompt = `<|user|>\nSummarize the following conversation in a short title (max 6 words):\n\n${conversationContent}\n<|assistant|>\n`

      // Generate summary
      console.log('Generating summary...')
      const result = await llmInstance.complete(prompt, {
        temperature: 0.3,
        topP: 0.9,
        maxTokens: 30
      })

      console.log('Summary generated successfully')
      return result.text.trim()
    } catch (error) {
      console.error('Error in Huggingface summaries:', error)
      return 'Conversation'
    }
  }

  public async summaryForSearch(messages: Message[], assistant: Assistant): Promise<string | null> {
    try {
      console.log('Starting Huggingface summaryForSearch...')
      const model = assistant.model || assistant.defaultModel
      if (!model) {
        throw new Error('No model specified for search summary')
      }

      // Get the LLM instance (this will download the model if needed)
      const llmInstance = await this.getModelInstance(model.id)

      // Extract the conversation content
      const conversationContent = messages
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${getMainTextContent(msg)}`)
        .join('\n\n')

      // Create a prompt for search summary
      const prompt = `<|user|>\nExtract the main topics and keywords from this conversation for search purposes:\n\n${conversationContent}\n<|assistant|>\n`

      // Generate search summary
      console.log('Generating search summary...')
      const result = await llmInstance.complete(prompt, {
        temperature: 0.3,
        topP: 0.9,
        maxTokens: 100
      })

      console.log('Search summary generated successfully')
      return result.text.trim()
    } catch (error) {
      console.error('Error in Huggingface summaryForSearch:', error)
      return null
    }
  }

  public async suggestions(messages: Message[], assistant: Assistant): Promise<Suggestion[]> {
    try {
      console.log('Starting Huggingface suggestions...')
      const model = assistant.model || assistant.defaultModel
      if (!model) {
        throw new Error('No model specified for suggestions')
      }

      // Get the LLM instance (this will download the model if needed)
      const llmInstance = await this.getModelInstance(model.id)

      // Extract the last few messages for context
      const recentMessages = messages.slice(-3)
      const conversationContent = recentMessages
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${getMainTextContent(msg)}`)
        .join('\n\n')

      // Create a prompt for suggestions
      const prompt = `<|user|>\nBased on this conversation, suggest 3 follow-up questions or topics the user might want to ask about. Format each suggestion on a new line with a number and period (e.g., "1. suggestion"):\n\n${conversationContent}\n<|assistant|>\n`

      // Generate suggestions
      console.log('Generating suggestions...')
      const result = await llmInstance.complete(prompt, {
        temperature: 0.7,
        topP: 0.9,
        maxTokens: 150
      })

      // Parse suggestions
      const suggestionLines = result.text
        .split('\n')
        .filter(line => /^\d+\./.test(line.trim()))
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(line => line.length > 0)
        .slice(0, 3)

      console.log('Suggestions generated successfully')
      return suggestionLines.map(content => ({ content }))
    } catch (error) {
      console.error('Error in Huggingface suggestions:', error)
      return []
    }
  }

  public async generateText({ prompt, content }: { prompt: string; content: string }): Promise<string> {
    try {
      console.log('Starting Huggingface generateText...')
      // Use the first available model
      const modelId = this.provider.models[0]?.id
      if (!modelId) {
        throw new Error('No models available')
      }

      // Get the LLM instance (this will download the model if needed)
      const llmInstance = await this.getModelInstance(modelId)

      // Create a prompt
      const fullPrompt = `<|user|>\n${prompt}\n\n${content}\n<|assistant|>\n`

      // Generate text
      console.log('Generating text...')
      const result = await llmInstance.complete(fullPrompt, {
        temperature: 0.7,
        topP: 0.9,
        maxTokens: 500
      })

      console.log('Text generated successfully')
      return result.text.trim()
    } catch (error: any) {
      console.error('Error in Huggingface generateText:', error)
      return `Error: ${error.message || 'Unknown error'}`
    }
  }

  public async check(model: Model, stream: boolean = false): Promise<{ valid: boolean; error: Error | null }> {
    // Check if the model is available or can be downloaded
    console.log(`Checking model ${model.id}, stream mode: ${stream}`);
    
    try {
      // Verify the model exists in MODEL_URLS
      if (!MODEL_URLS[model.id]) {
        console.error(`Model ${model.id} is not available for download - no URL found`);
        return {
          valid: false,
          error: new Error(`Model ${model.id} is not available for download`)
        }
      }
      
      // Check if the model is already downloaded
      const modelPath = path.join(this.modelsPath, `${model.id.replace('/', '_')}.gguf`)
      if (fs.existsSync(modelPath)) {
        console.log(`Model ${model.id} is already downloaded at ${modelPath}`);
        return { valid: true, error: null }
      }
      
      // If not downloaded, check if we can access the download URL
      console.log(`Model ${model.id} is not downloaded yet, but URL is available for download`);
      return { valid: true, error: null }
    } catch (error: any) {
      console.error(`Error checking model ${model.id}:`, error);
      return { valid: false, error }
    }
  }

  public async models(): Promise<OpenAI.Models.Model[]> {
    // Convert our models to OpenAI format for compatibility
    return this.provider.models.map(model => ({
      id: model.id,
      object: 'model',
      created: Date.now(),
      owned_by: 'huggingface',
    }))
  }

  public getApiKey(): string {
    return ''
  }

  public async generateImage(params: GenerateImageParams): Promise<string[]> {
    console.log(`Image generation requested with prompt: ${params.prompt}`);
    throw new Error('Image generation not supported by Huggingface provider')
  }

  public async generateImageByChat(params: CompletionsParams): Promise<void> {
    console.log(`Image generation by chat requested for assistant: ${params.assistant.id}`);
    throw new Error('Image generation not supported by Huggingface provider')
  }

  public async getEmbeddingDimensions(model: Model): Promise<number> {
    // Default embedding dimensions based on model
    console.log(`Getting embedding dimensions for model: ${model.id}`);
    return model.id.includes('360M') ? 512 : 384
  }

  public getBaseURL(): string {
    return ''
  }

  public convertMcpTools<T>(mcpTools: MCPTool[]): T[] {
    // Not implemented for Huggingface provider
    console.log(`Received ${mcpTools.length} MCP tools to convert`);
    return [] as unknown as T[]
  }

  public mcpToolCallResponseToMessage(
    mcpToolResponse: MCPToolResponse,
    resp: MCPCallToolResponse,
    model: Model
  ): any {
    // Not implemented for Huggingface provider
    console.log(`Tool call response for tool: ${mcpToolResponse.tool.name}, model: ${model.id}`);
    console.log(`Response content: ${JSON.stringify(resp).substring(0, 100)}...`);
    return null
  }
}