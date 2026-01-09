/**
 * Document Chunking Service
 *
 * Intelligently splits large documents into smaller chunks to fit within token limits.
 * Supports multiple chunking strategies including semantic chunking (paragraph-aware),
 * sliding window with overlap, and fixed-size chunking.
 */

import { estimateTextTokens } from './TokenService'

export interface ChunkResult {
  chunks: string[]
  originalTokens: number
  chunkedTokens: number
  wasChunked: boolean
  strategy: 'none' | 'fixed' | 'semantic' | 'sliding'
}

export interface ChunkOptions {
  maxTokensPerChunk: number
  overlap?: number // For sliding window (in tokens)
  preserveStructure?: boolean // Try to split on paragraphs/sections
}

/**
 * Default chunking thresholds
 */
export const CHUNK_THRESHOLDS = {
  FILE: 8000, // Max tokens per file chunk
  KNOWLEDGE: 10000, // Max tokens for knowledge base results
  OVERLAP: 100 // Default tokens to overlap between chunks
}

/**
 * Split text into chunks based on token limits
 *
 * @param content - The text content to chunk
 * @param options - Chunking configuration options
 * @returns ChunkResult with chunks and metadata
 */
export function chunkDocument(content: string, options: ChunkOptions): ChunkResult {
  const { maxTokensPerChunk, overlap = CHUNK_THRESHOLDS.OVERLAP, preserveStructure = false } = options

  const originalTokens = estimateTextTokens(content)

  // If content is within limits, return as-is
  if (originalTokens <= maxTokensPerChunk) {
    return {
      chunks: [content],
      originalTokens,
      chunkedTokens: originalTokens,
      wasChunked: false,
      strategy: 'none'
    }
  }

  let chunks: string[]
  let strategy: ChunkResult['strategy']

  if (preserveStructure) {
    // Semantic chunking: try to split on paragraph boundaries
    chunks = semanticChunk(content, maxTokensPerChunk, overlap)
    strategy = 'semantic'
  } else {
    // Fixed-size chunking with sliding window
    chunks = slidingWindowChunk(content, maxTokensPerChunk, overlap)
    strategy = 'sliding'
  }

  const chunkedTokens = chunks.reduce((total, chunk) => total + estimateTextTokens(chunk), 0)

  return {
    chunks,
    originalTokens,
    chunkedTokens,
    wasChunked: true,
    strategy
  }
}

/**
 * Semantic chunking: split on paragraph boundaries when possible
 */
function semanticChunk(content: string, maxTokens: number, overlap: number): string[] {
  const chunks: string[] = []

  // Split on double newlines (paragraphs) or single newlines if no paragraphs
  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 0)

  if (paragraphs.length === 0) {
    // Fallback to sliding window if no paragraphs found
    return slidingWindowChunk(content, maxTokens, overlap)
  }

  let currentChunk = ''
  let currentTokens = 0

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTextTokens(paragraph)

    // If single paragraph exceeds limit, split it with sliding window
    if (paragraphTokens > maxTokens) {
      // Save current chunk if it exists
      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim())
        currentChunk = ''
        currentTokens = 0
      }

      // Split the large paragraph
      const subChunks = slidingWindowChunk(paragraph, maxTokens, overlap)
      chunks.push(...subChunks)
      continue
    }

    // Check if adding this paragraph would exceed limit
    if (currentTokens + paragraphTokens > maxTokens && currentChunk.trim().length > 0) {
      // Save current chunk
      chunks.push(currentChunk.trim())

      // Start new chunk with overlap from previous chunk
      if (overlap > 0) {
        const overlapText = getLastNTokens(currentChunk, overlap)
        currentChunk = overlapText + '\n\n' + paragraph
        currentTokens = estimateTextTokens(currentChunk)
      } else {
        currentChunk = paragraph
        currentTokens = paragraphTokens
      }
    } else {
      // Add paragraph to current chunk
      if (currentChunk.length > 0) {
        currentChunk += '\n\n' + paragraph
      } else {
        currentChunk = paragraph
      }
      currentTokens += paragraphTokens
    }
  }

  // Add final chunk
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

/**
 * Sliding window chunking: split text with overlap between chunks
 */
function slidingWindowChunk(content: string, maxTokens: number, overlap: number): string[] {
  const chunks: string[] = []

  // Estimate characters per token (rough approximation)
  const charsPerToken = content.length / estimateTextTokens(content)
  const maxChars = Math.floor(maxTokens * charsPerToken)
  const overlapChars = Math.floor(overlap * charsPerToken)

  let position = 0

  while (position < content.length) {
    const chunkEnd = Math.min(position + maxChars, content.length)
    let chunk = content.substring(position, chunkEnd)

    // Try to break on word boundary if not at end
    if (chunkEnd < content.length) {
      const lastSpace = chunk.lastIndexOf(' ')
      const lastNewline = chunk.lastIndexOf('\n')
      const breakPoint = Math.max(lastSpace, lastNewline)

      if (breakPoint > chunk.length * 0.8) {
        // Only break on word boundary if it's in the last 20% of the chunk
        chunk = chunk.substring(0, breakPoint)
      }
    }

    chunks.push(chunk.trim())

    // Move position forward, accounting for overlap
    position = chunkEnd - overlapChars

    // Ensure we make progress
    if (position <= chunks[chunks.length - 1].length) {
      position = chunkEnd
    }
  }

  return chunks
}

/**
 * Get the last N tokens from a text string
 */
function getLastNTokens(text: string, n: number): string {
  const tokens = estimateTextTokens(text)

  if (tokens <= n) {
    return text
  }

  // Estimate characters per token
  const charsPerToken = text.length / tokens
  const targetChars = Math.floor(n * charsPerToken)

  return text.substring(text.length - targetChars)
}

/**
 * Chunk knowledge base references for injection into prompts
 *
 * @param references - Knowledge base search results
 * @param maxTokens - Maximum tokens per chunk
 * @returns Chunked references as string
 */
export function chunkKnowledgeReferences(references: any[], maxTokens: number): string {
  const referencesText = JSON.stringify(references, null, 2)
  const tokens = estimateTextTokens(referencesText)

  if (tokens <= maxTokens) {
    return referencesText
  }

  // Chunk the references
  const chunkResult = chunkDocument(referencesText, {
    maxTokensPerChunk: maxTokens,
    preserveStructure: true
  })

  // Return first chunk with metadata about remaining content
  const firstChunk = chunkResult.chunks[0]
  const remainingChunks = chunkResult.chunks.length - 1
  const remainingTokens = chunkResult.chunkedTokens - estimateTextTokens(firstChunk)

  return (
    firstChunk +
    `\n\n[... ${remainingChunks} more reference chunks omitted, ` +
    `${remainingTokens} tokens. Showing first ${maxTokens} tokens.]`
  )
}
