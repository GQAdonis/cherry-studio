import fs from 'node:fs'
import path from 'node:path'

import { loggerService } from '@logger'
import { getAllMimeTypeStrings } from '@main/config/unstructuredMimeTypes'
import type { UnstructuredOptions } from '@types'
import type { IpcMainInvokeEvent } from 'electron'
import mime from 'mime-types'
import { UnstructuredClient } from 'unstructured-client'
import { Strategy } from 'unstructured-client/sdk/models/shared'

import { reduxService } from './ReduxService'

const logger = loggerService.withContext('UnstructuredService')

interface UnstructuredProcessOptions {
  strategy?: 'auto' | 'fast' | 'hi_res' | 'ocr_only'
  chunkingStrategy?: 'basic' | 'by_title'
  splitPdfPage?: boolean
  splitPdfConcurrencyLevel?: number
  apiKey?: string
  apiHost?: string
}

interface ProcessDocumentResult {
  content: string
  metadata: {
    fileType: string
    mimeType: string
    strategy: string
    elementCount: number
    originalFileName: string
  }
}

class UnstructuredService {
  private static instance: UnstructuredService

  private constructor() {}

  public static getInstance(): UnstructuredService {
    if (!UnstructuredService.instance) {
      UnstructuredService.instance = new UnstructuredService()
    }
    return UnstructuredService.instance
  }

  /**
   * Initialize client with provider configuration
   */
  private async initializeClient(options?: UnstructuredProcessOptions): Promise<UnstructuredClient> {
    const state = await reduxService.getState()
    const providers = state.preprocess?.providers || []
    const unstructuredProvider = providers.find((p: any) => p.id === 'unstructured')

    const apiKey = options?.apiKey || unstructuredProvider?.apiKey
    const apiHost =
      options?.apiHost || unstructuredProvider?.apiHost || 'https://api.unstructuredapp.io/general/v0/general'

    if (!apiKey) {
      throw new Error('Unstructured API key is required. Please configure it in settings.')
    }

    return new UnstructuredClient({
      serverURL: apiHost,
      security: {
        apiKeyAuth: apiKey
      }
    })
  }

  /**
   * Get enabled MIME types from provider settings
   */
  private async getEnabledMimeTypes(): Promise<string[]> {
    const state = await reduxService.getState()
    const providers = state.preprocess?.providers || []
    const unstructuredProvider = providers.find((p: any) => p.id === 'unstructured')

    const providerOptions = unstructuredProvider?.options as UnstructuredOptions | undefined
    return providerOptions?.enabledMimeTypes || []
  }

  /**
   * Check if file MIME type is enabled for processing
   */
  private async isFileTypeEnabled(filePath: string): Promise<boolean> {
    const mimeType = mime.lookup(filePath)
    if (!mimeType) {
      logger.warn(`Could not determine MIME type for file: ${filePath}`)
      return false
    }

    const enabledTypes = await this.getEnabledMimeTypes()
    return enabledTypes.includes(mimeType)
  }

  /**
   * Convert Unstructured elements to markdown format
   */
  private elementsToMarkdown(elements: any[]): string {
    if (!Array.isArray(elements) || elements.length === 0) {
      return ''
    }

    const lines: string[] = []

    for (const element of elements) {
      const text = element.text?.trim()
      if (!text) continue

      const type = element.type

      // Format based on element type
      switch (type) {
        case 'Title':
          lines.push(`# ${text}\n`)
          break
        case 'NarrativeText':
        case 'UncategorizedText':
          lines.push(`${text}\n`)
          break
        case 'ListItem':
          lines.push(`- ${text}`)
          break
        case 'Table':
          lines.push(`\n${text}\n`)
          break
        case 'Image':
          lines.push(`![Image](${text})\n`)
          break
        default:
          lines.push(`${text}\n`)
      }
    }

    return lines.join('\n')
  }

  /**
   * Process a single document
   */
  public async processDocument(
    _event: IpcMainInvokeEvent,
    filePath: string,
    options?: UnstructuredProcessOptions
  ): Promise<ProcessDocumentResult> {
    try {
      logger.info(`Processing document: ${filePath}`)

      // Validate file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`)
      }

      // Check if file type is enabled
      if (!(await this.isFileTypeEnabled(filePath))) {
        const mimeType = mime.lookup(filePath) || 'unknown'
        throw new Error(
          `File type ${mimeType} is not enabled for processing. Please enable it in Unstructured settings.`
        )
      }

      // Initialize client
      const client = await this.initializeClient(options)

      // Read file
      const fileBuffer = await fs.promises.readFile(filePath)
      const fileBlob = new Blob([fileBuffer])
      const fileName = path.basename(filePath)

      // Get provider options
      const state = await reduxService.getState()
      const providers = state.preprocess?.providers || []
      const unstructuredProvider = providers.find((p: any) => p.id === 'unstructured')
      const providerOptions = unstructuredProvider?.options as UnstructuredOptions | undefined

      const strategy = options?.strategy || providerOptions?.strategy || 'auto'
      const chunkingStrategy = options?.chunkingStrategy || providerOptions?.chunkingStrategy || 'by_title'
      const splitPdfPage = options?.splitPdfPage ?? providerOptions?.splitPdfPage ?? true
      const splitPdfConcurrencyLevel =
        options?.splitPdfConcurrencyLevel || providerOptions?.splitPdfConcurrencyLevel || 5

      logger.info(`Processing with strategy: ${strategy}, chunking: ${chunkingStrategy}`)

      // Call Unstructured API
      const response = await client.general.partition({
        partitionParameters: {
          files: {
            content: fileBlob,
            fileName: fileName
          },
          strategy: strategy as Strategy,
          chunkingStrategy: chunkingStrategy as any,
          splitPdfPage: splitPdfPage,
          splitPdfConcurrencyLevel: splitPdfConcurrencyLevel
        }
      })

      // Extract elements from SDK response
      // The SDK returns a response object with elements property
      const elements = (response as any).elements || []

      if (!Array.isArray(elements) || elements.length === 0) {
        throw new Error('No elements returned from Unstructured API')
      }

      logger.info(`Unstructured returned ${elements.length} elements`)

      // Convert to markdown
      const content = this.elementsToMarkdown(elements)

      const mimeType = mime.lookup(filePath) || 'unknown'

      return {
        content,
        metadata: {
          fileType: path.extname(filePath),
          mimeType: mimeType,
          strategy: strategy,
          elementCount: elements.length,
          originalFileName: fileName
        }
      }
    } catch (error) {
      logger.error('Document processing failed:', error as Error)
      throw error
    }
  }

  /**
   * Process multiple documents in batch
   */
  public async batchProcessDocuments(
    _event: IpcMainInvokeEvent,
    filePaths: string[],
    options?: UnstructuredProcessOptions
  ): Promise<ProcessDocumentResult[]> {
    const results: ProcessDocumentResult[] = []

    for (const filePath of filePaths) {
      try {
        const result = await this.processDocument(_event, filePath, options)
        results.push(result)
      } catch (error) {
        logger.error(`Failed to process ${filePath}:`, error as Error)
        // Continue with next file even if one fails
      }
    }

    return results
  }

  /**
   * Test connection to Unstructured API
   */
  public async testConnection(_event: IpcMainInvokeEvent, apiKey?: string, apiHost?: string): Promise<boolean> {
    try {
      const client = await this.initializeClient({ apiKey, apiHost })

      // Create a simple test by attempting to partition a tiny text file
      const testContent = 'Test connection'
      const testBlob = new Blob([testContent])

      const response = await client.general.partition({
        partitionParameters: {
          files: {
            content: testBlob,
            fileName: 'test.txt'
          },
          strategy: Strategy.Fast
        }
      })

      // Check if the response is successful
      // The SDK returns a response object with elements and statusCode properties
      if (response && typeof response === 'object') {
        const statusCode = (response as any).statusCode || (response as any).status_code
        const elements = (response as any).elements

        // Check for successful status code and valid elements
        return statusCode === 200 && Array.isArray(elements) && elements.length > 0
      }

      return false
    } catch (error) {
      logger.error('Connection test failed:', error as Error)
      throw error
    }
  }

  /**
   * Get all supported MIME types
   */
  public async getSupportedMimeTypes(): Promise<string[]> {
    return getAllMimeTypeStrings()
  }

  /**
   * Process document for chat tool use
   */
  public async processDocumentForTool(
    _event: IpcMainInvokeEvent,
    params: {
      file_path: string
      strategy?: 'auto' | 'fast' | 'hi_res' | 'ocr_only'
      chunking_strategy?: 'basic' | 'by_title'
    }
  ): Promise<{ content: string; metadata: any }> {
    try {
      // Check if chat tool is enabled
      const state = await reduxService.getState()
      const providers = state.preprocess?.providers || []
      const unstructuredProvider = providers.find((p: any) => p.id === 'unstructured')
      const providerOptions = unstructuredProvider?.options as UnstructuredOptions | undefined

      if (!providerOptions?.enableChatTool) {
        throw new Error('Unstructured chat tool is not enabled. Please enable it in settings.')
      }

      const result = await this.processDocument(_event, params.file_path, {
        strategy: params.strategy,
        chunkingStrategy: params.chunking_strategy
      })

      return result
    } catch (error) {
      logger.error('Tool processing failed:', error as Error)
      throw error
    }
  }
}

export const unstructuredService = UnstructuredService.getInstance()
