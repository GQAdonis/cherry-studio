/**
 * Memory Service Module
 *
 * Provides access to Cherry Studio memory storage.
 */

import type { MemoryEntry, MemorySearchOptions, MemoryService, Transport } from '../types'

export function createMemoryService(transport: Transport): MemoryService {
  return {
    /**
     * Search memories
     */
    async search(query: string, options: MemorySearchOptions = {}): Promise<MemoryEntry[]> {
      return transport.request<MemoryEntry[]>('memory:search', {
        query,
        ...options
      })
    },

    /**
     * Add a new memory
     */
    async add(content: string, metadata?: Record<string, unknown>): Promise<MemoryEntry> {
      return transport.request<MemoryEntry>('memory:add', {
        content,
        metadata
      })
    },

    /**
     * Get a specific memory
     */
    async get(id: string): Promise<MemoryEntry | null> {
      return transport.request<MemoryEntry | null>('memory:get', { id })
    },

    /**
     * Delete a memory
     */
    async delete(id: string): Promise<boolean> {
      return transport.request<boolean>('memory:delete', { id })
    }
  }
}
