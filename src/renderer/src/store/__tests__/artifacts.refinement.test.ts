import { describe, expect, it } from 'vitest'

import reducer, { addRefinementMessage, updateRefinementMessage } from '../artifacts'

describe('artifacts refinement message identity', () => {
  it('preserves provided assistant message id so streaming updates can target it', () => {
    const created = reducer(
      undefined,
      addRefinementMessage({
        id: 'assistant-stream-1',
        role: 'assistant',
        content: '',
        isStreaming: true
      } as any)
    )

    const updated = reducer(
      created,
      updateRefinementMessage({
        id: 'assistant-stream-1',
        content: 'streamed update'
      })
    )

    expect(updated.refinementMessages).toHaveLength(1)
    expect(updated.refinementMessages[0].id).toBe('assistant-stream-1')
    expect(updated.refinementMessages[0].content).toBe('streamed update')
  })
})
