/**
 * Knowledge Service Module
 *
 * Provides access to Cherry Studio knowledge bases.
 */

import type {
  KnowledgeAddOptions,
  KnowledgeBase,
  KnowledgeSearchOptions,
  KnowledgeSearchResult,
  KnowledgeService,
  Transport
} from '../types'

export function createKnowledgeService(transport: Transport): KnowledgeService {
  return {
    /**
     * List all available knowledge bases
     */
    async list(): Promise<KnowledgeBase[]> {
      return transport.request<KnowledgeBase[]>('knowledge:list', {})
    },

    /**
     * Search a knowledge base
     */
    async search(
      knowledgeBaseId: string,
      query: string,
      options: KnowledgeSearchOptions = {}
    ): Promise<KnowledgeSearchResult[]> {
      return transport.request<KnowledgeSearchResult[]>('knowledge:search', {
        knowledgeBaseId,
        query,
        ...options
      })
    },

    /**
     * Add content to a knowledge base
     */
    async add(knowledgeBaseId: string, content: string, options: KnowledgeAddOptions = {}): Promise<{ id: string }> {
      return transport.request<{ id: string }>('knowledge:add', {
        knowledgeBaseId,
        content,
        ...options
      })
    }
  }
}
