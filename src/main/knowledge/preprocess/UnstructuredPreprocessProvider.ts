import fs from 'node:fs'
import path from 'node:path'

import { loggerService } from '@logger'
import { fileStorage } from '@main/services/FileStorage'
import type { FileMetadata, PreprocessProvider } from '@types'
import mime from 'mime-types'
import { UnstructuredClient } from 'unstructured-client'
import type { PartitionResponse } from 'unstructured-client/sdk/models/operations'
import type { Strategy } from 'unstructured-client/sdk/models/shared'

import BasePreprocessProvider from './BasePreprocessProvider'

const logger = loggerService.withContext('UnstructuredPreprocessProvider')

export default class UnstructuredPreprocessProvider extends BasePreprocessProvider {
  private client: UnstructuredClient

  constructor(provider: PreprocessProvider, userId?: string) {
    super(provider, userId)

    if (!this.provider.apiKey) {
      throw new Error('Unstructured API key is required')
    }

    this.client = new UnstructuredClient({
      serverURL: this.provider.apiHost || 'https://api.unstructured.io',
      security: {
        apiKeyAuth: this.provider.apiKey
      }
    })
  }

  /**
   * Check if file MIME type is enabled for processing
   */
  private isFileTypeEnabled(filePath: string): boolean {
    const mimeType = mime.lookup(filePath)
    if (!mimeType) {
      logger.warn(`Could not determine MIME type for file: ${filePath}`)
      return false
    }

    const enabledTypes = (this.provider.options?.enabledMimeTypes as string[]) || []
    const isEnabled = enabledTypes.includes(mimeType)

    if (!isEnabled) {
      logger.info(`File type ${mimeType} not enabled for processing: ${filePath}`)
    }

    return isEnabled
  }

  /**
   * Parse and process a file using Unstructured.io
   */
  public async parseFile(
    sourceId: string,
    file: FileMetadata
  ): Promise<{ processedFile: FileMetadata; quota?: number }> {
    try {
      const filePath = fileStorage.getFilePathById(file)
      logger.info(`Unstructured preprocessing started: ${filePath}`)

      // Check if file type is enabled
      if (!this.isFileTypeEnabled(filePath)) {
        throw new Error(`File type not enabled for Unstructured processing: ${file.ext}`)
      }

      // Read file as buffer
      const fileBuffer = await fs.promises.readFile(filePath)
      const fileBlob = new Blob([new Uint8Array(fileBuffer)])

      // Prepare partition parameters
      const strategy = (this.provider.options?.strategy as string) || 'auto'
      const chunkingStrategy = (this.provider.options?.chunkingStrategy as string) || 'by_title'
      const splitPdfPage = this.provider.options?.splitPdfPage ?? true
      const splitPdfConcurrencyLevel = this.provider.options?.splitPdfConcurrencyLevel || 5

      logger.info(`Processing with strategy: ${strategy}, chunking: ${chunkingStrategy}`)

      // Send progress update
      await this.sendPreprocessProgress(sourceId, 30)

      // Call Unstructured API
      const result = await this.client.general.partition({
        partitionParameters: {
          files: {
            content: fileBlob,
            fileName: file.origin_name
          },
          strategy: strategy as Strategy,
          chunkingStrategy: chunkingStrategy as any,
          splitPdfPage: splitPdfPage,
          splitPdfConcurrencyLevel: splitPdfConcurrencyLevel
        }
      })

      await this.sendPreprocessProgress(sourceId, 70)

      // In v0.29.1+, PartitionResponse is string | Array<elements>
      const elements = Array.isArray(result) ? result : []

      if (elements.length === 0) {
        throw new Error('No elements returned from Unstructured API')
      }

      logger.info(`Unstructured returned ${elements.length} elements`)

      // Convert elements to markdown
      const markdown = this.elementsToMarkdown(result)

      // Save processed content
      const processedFilePath = await this.saveProcessedContent(file, markdown)

      await this.sendPreprocessProgress(sourceId, 100)

      const processedStats = await fs.promises.stat(processedFilePath)

      const processedFile: FileMetadata = {
        ...file,
        name: file.name.replace(file.ext, '.md'),
        path: processedFilePath,
        ext: '.md',
        size: processedStats.size,
        created_at: processedStats.birthtime.toISOString()
      }

      logger.info(`Unstructured preprocessing completed: ${processedFilePath}`)

      return { processedFile }
    } catch (error) {
      logger.error('Unstructured preprocessing failed:', error as Error)
      throw error
    }
  }

  /**
   * Convert Unstructured elements to markdown format
   */
  private elementsToMarkdown(result: PartitionResponse): string {
    // In v0.29.1+, PartitionResponse is string | Array<elements>
    const elements = Array.isArray(result) ? result : []

    if (elements.length === 0) {
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
          // Tables are already in text format from Unstructured
          lines.push(`\n${text}\n`)
          break
        case 'Image':
          // Image metadata
          lines.push(`![Image](${text})\n`)
          break
        default:
          lines.push(`${text}\n`)
      }
    }

    return lines.join('\n')
  }

  /**
   * Save processed content to file
   */
  private async saveProcessedContent(file: FileMetadata, content: string): Promise<string> {
    const preprocessDir = path.join(this.storageDir, file.id)

    if (!fs.existsSync(preprocessDir)) {
      await fs.promises.mkdir(preprocessDir, { recursive: true })
    }

    const outputFileName = `${file.name.replace(file.ext, '')}.md`
    const outputPath = path.join(preprocessDir, outputFileName)

    await fs.promises.writeFile(outputPath, content, 'utf-8')

    return outputPath
  }

  /**
   * Check quota (not implemented for Unstructured as it doesn't provide quota API)
   */
  public async checkQuota(): Promise<number> {
    // Unstructured doesn't provide a quota API endpoint
    // Return -1 to indicate unlimited/unknown
    return -1
  }
}
