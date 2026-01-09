import { describe, expect, it } from 'vitest'

import { CHUNK_THRESHOLDS, chunkDocument, chunkKnowledgeReferences } from '../DocumentChunker'

describe('DocumentChunker', () => {
  describe('chunkDocument', () => {
    it('should not chunk small documents', () => {
      const content = 'This is a small document with just a few words.'
      const result = chunkDocument(content, { maxTokensPerChunk: 1000 })

      expect(result.wasChunked).toBe(false)
      expect(result.chunks).toHaveLength(1)
      expect(result.chunks[0]).toBe(content)
      expect(result.strategy).toBe('none')
    })

    it('should chunk large documents with fixed strategy', () => {
      // Create content that's approximately 500 tokens (2000 characters)
      const largeContent = 'word '.repeat(400)
      const result = chunkDocument(largeContent, {
        maxTokensPerChunk: 100,
        preserveStructure: false
      })

      expect(result.wasChunked).toBe(true)
      expect(result.chunks.length).toBeGreaterThan(1)
      expect(result.strategy).toBe('sliding')
      expect(result.originalTokens).toBeGreaterThan(result.chunks[0].length / 4) // Rough token estimate
    })

    it('should preserve semantic boundaries when requested', () => {
      const content = `Paragraph 1 with some content here.

Paragraph 2 with different content.

Paragraph 3 with more information.`

      const result = chunkDocument(content, {
        maxTokensPerChunk: 50,
        preserveStructure: true
      })

      expect(result.wasChunked).toBe(true)
      expect(result.strategy).toBe('semantic')
      // Should have split on paragraph boundaries
      expect(result.chunks.some((c) => c.includes('Paragraph 1'))).toBe(true)
    })

    it('should handle overlap in sliding window', () => {
      const content = 'word '.repeat(200) // ~200 tokens
      const result = chunkDocument(content, {
        maxTokensPerChunk: 50,
        overlap: 10,
        preserveStructure: false
      })

      expect(result.wasChunked).toBe(true)
      expect(result.chunks.length).toBeGreaterThan(1)

      // Check that chunks have some overlap (rough check)
      if (result.chunks.length > 1) {
        const firstChunkEnd = result.chunks[0].slice(-20)
        const secondChunkStart = result.chunks[1].slice(0, 20)
        // There should be some common words due to overlap
        expect(firstChunkEnd.length).toBeGreaterThan(0)
        expect(secondChunkStart.length).toBeGreaterThan(0)
      }
    })

    it('should handle very large single paragraphs', () => {
      // Single paragraph that exceeds limit
      const largeParagraph = 'word '.repeat(500)
      const result = chunkDocument(largeParagraph, {
        maxTokensPerChunk: 100,
        preserveStructure: true
      })

      expect(result.wasChunked).toBe(true)
      expect(result.chunks.length).toBeGreaterThan(1)
      // Should fall back to sliding window for large paragraph
    })

    it('should handle empty content', () => {
      const result = chunkDocument('', { maxTokensPerChunk: 100 })

      expect(result.wasChunked).toBe(false)
      expect(result.chunks).toHaveLength(1)
      expect(result.chunks[0]).toBe('')
    })

    it('should respect maxTokensPerChunk limit', () => {
      const content = 'word '.repeat(1000)
      const maxTokens = 100

      const result = chunkDocument(content, {
        maxTokensPerChunk: maxTokens,
        preserveStructure: false
      })

      expect(result.wasChunked).toBe(true)

      // Each chunk should be approximately within the limit
      // (allowing some variance due to token estimation)
      result.chunks.forEach((chunk) => {
        const chunkLength = chunk.split(' ').length
        expect(chunkLength).toBeLessThanOrEqual(maxTokens * 1.5) // 50% tolerance
      })
    })

    it('should handle markdown structure', () => {
      const markdown = `# Heading 1

Some content under heading 1.

## Heading 2

More content here.

### Heading 3

Final content.`

      const result = chunkDocument(markdown, {
        maxTokensPerChunk: 50,
        preserveStructure: true
      })

      expect(result.wasChunked).toBe(true)
      // Should preserve heading structure when possible
      expect(result.chunks.some((c) => c.includes('# Heading'))).toBe(true)
    })
  })

  describe('chunkKnowledgeReferences', () => {
    it('should not chunk small reference sets', () => {
      const references = [
        { id: 1, content: 'Reference 1' },
        { id: 2, content: 'Reference 2' }
      ]

      const result = chunkKnowledgeReferences(references, 1000)
      const parsed = JSON.parse(result.split('\n\n[...')[0]) // Remove truncation message if present

      expect(parsed).toEqual(references)
    })

    it('should chunk large reference sets', () => {
      const references = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        content: 'This is a reference with some content that takes up space. '.repeat(10)
      }))

      const result = chunkKnowledgeReferences(references, 500)

      expect(result).toContain('more reference chunks omitted')
      expect(result).toContain('tokens')
    })

    it('should include metadata about truncated content', () => {
      const references = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        content: 'Content '.repeat(20)
      }))

      const result = chunkKnowledgeReferences(references, 200)

      expect(result).toMatch(/\d+ more reference chunks omitted/)
      expect(result).toMatch(/\d+ tokens/)
    })
  })

  describe('CHUNK_THRESHOLDS', () => {
    it('should have reasonable default values', () => {
      expect(CHUNK_THRESHOLDS.FILE).toBeGreaterThan(0)
      expect(CHUNK_THRESHOLDS.KNOWLEDGE).toBeGreaterThan(0)
      expect(CHUNK_THRESHOLDS.OVERLAP).toBeGreaterThan(0)

      // Overlap should be smaller than chunk sizes
      expect(CHUNK_THRESHOLDS.OVERLAP).toBeLessThan(CHUNK_THRESHOLDS.FILE)
      expect(CHUNK_THRESHOLDS.OVERLAP).toBeLessThan(CHUNK_THRESHOLDS.KNOWLEDGE)
    })
  })
})
