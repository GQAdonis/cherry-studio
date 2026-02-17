import type { Chunk } from '@renderer/types/chunk'
import { ChunkType } from '@renderer/types/chunk'
import { describe, expect, it } from 'vitest'

import AiSdkToChunkAdapter from '../AiSdkToChunkAdapter'

function createAiSdkResult(streamParts: any[]) {
  const fullStream = new ReadableStream({
    start(controller) {
      for (const part of streamParts) {
        controller.enqueue(part)
      }
      controller.close()
    }
  })

  return {
    fullStream,
    text: Promise.resolve('')
  }
}

describe('AiSdkToChunkAdapter skill activation', () => {
  it('converts `data.value` skill activation parts into skill chunks', async () => {
    const emitted: Chunk[] = []
    const adapter = new AiSdkToChunkAdapter((chunk) => emitted.push(chunk))

    await adapter.processStream(
      createAiSdkResult([
        {
          type: 'data',
          value: {
            type: 'skill.activation',
            skillName: 'ui-ux-pro-max',
            action: 'activated'
          }
        }
      ])
    )

    expect(emitted).toContainEqual({
      type: ChunkType.SKILL_ACTIVATION,
      skillName: 'ui-ux-pro-max',
      action: 'activated',
      toolName: undefined,
      result: undefined,
      error: undefined
    })
  })

  it('converts `data.data` skill activation parts into skill chunks', async () => {
    const emitted: Chunk[] = []
    const adapter = new AiSdkToChunkAdapter((chunk) => emitted.push(chunk))

    await adapter.processStream(
      createAiSdkResult([
        {
          type: 'data',
          data: {
            type: 'skill.activation',
            skillName: 'artifact-refiner',
            action: 'activated'
          }
        }
      ])
    )

    expect(emitted).toContainEqual({
      type: ChunkType.SKILL_ACTIVATION,
      skillName: 'artifact-refiner',
      action: 'activated',
      toolName: undefined,
      result: undefined,
      error: undefined
    })
  })

  it('converts artifact lifecycle data parts into artifact lifecycle chunks', async () => {
    const emitted: Chunk[] = []
    const adapter = new AiSdkToChunkAdapter((chunk) => emitted.push(chunk))

    await adapter.processStream(
      createAiSdkResult([
        {
          type: 'data',
          value: {
            type: 'artifact.lifecycle',
            stage: 'completed',
            summary: 'Artifact was packaged'
          }
        }
      ])
    )

    expect(emitted).toContainEqual({
      type: ChunkType.ARTIFACT_LIFECYCLE,
      stage: 'completed',
      summary: 'Artifact was packaged'
    })
  })
})
