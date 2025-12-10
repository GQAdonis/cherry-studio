import type { KnowledgeBaseParams, KnowledgeSearchResult } from '@types'

import GeneralReranker, { RerankModelNotSupportedError } from './GeneralReranker'

export default class Reranker {
  private sdk: GeneralReranker
  constructor(base: KnowledgeBaseParams) {
    this.sdk = new GeneralReranker(base)
  }
  public async rerank(query: string, searchResults: KnowledgeSearchResult[]): Promise<KnowledgeSearchResult[]> {
    try {
      return await this.sdk.rerank(query, searchResults)
    } catch (error) {
      // If the model is not supported for reranking, return original results
      if (error instanceof RerankModelNotSupportedError) {
        return searchResults
      }
      throw error
    }
  }
}
