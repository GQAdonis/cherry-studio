import { configureStore } from '@reduxjs/toolkit'
import type { Artifact } from '@renderer/features/artifacts/types'
import artifactsReducer from '@renderer/store/artifacts'
import { ChunkType } from '@renderer/types/chunk'
import { act, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ensureArtifactStudioSession,
  streamArtifactStudioSessionMessage
} from '../../services/ArtifactStudioRuntimeService'
import { useArtifactRefinement } from '../useArtifactRefinement'

vi.mock('../../services/ArtifactStudioRuntimeService', () => ({
  ARTIFACT_STUDIO_AGENT_ID: 'artifact-studio',
  ensureArtifactStudioSession: vi.fn(),
  streamArtifactStudioSessionMessage: vi.fn()
}))

describe('useArtifactRefinement diagnostics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(ensureArtifactStudioSession).mockResolvedValue({
      agentId: 'artifact-studio',
      sessionId: 'session-1',
      modelId: 'test-model'
    })
  })

  it('routes refinement through artifact-studio agent/session runtime and surfaces diagnostics', async () => {
    vi.mocked(streamArtifactStudioSessionMessage).mockImplementation(async ({ onChunk }: any) => {
      onChunk({
        type: ChunkType.SKILL_ACTIVATION,
        skillName: 'artifact-refiner',
        action: 'activated'
      })
      onChunk({
        type: ChunkType.CONTEXT_ACTION,
        action: 'summarized',
        summary: 'Summarized prior chat context',
        removedCount: 4
      })
      onChunk({
        type: ChunkType.TEXT_DELTA,
        text: 'Refinement complete.\n<cs-studio-code identifier="artifact-1" type="html" title="Artifact 1"><div>updated</div></cs-studio-code>'
      })
      onChunk({
        type: ChunkType.LLM_RESPONSE_COMPLETE
      })
    })

    const store = configureStore({
      reducer: {
        artifacts: artifactsReducer,
        llm: (state = { providers: [] }) => state,
        knowledge: (state = { bases: [] }) => state,
        settings: (
          state = {
            contextStrategy: { type: 'sliding_window' },
            apiServer: {
              enabled: true,
              host: 'localhost',
              port: 23333,
              apiKey: 'test-key'
            }
          }
        ) => state
      }
    })

    const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>

    const artifact: Artifact = {
      id: 'artifact-1',
      identifier: 'artifact-1',
      type: 'html',
      title: 'Artifact 1',
      content: '<div>initial</div>',
      version: 1,
      conversationId: 'conv-1',
      messageId: 'msg-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      saved: false,
      tags: [],
      metadata: {
        tailwind: true,
        theme: 'auto'
      },
      status: 'complete' as any
    }

    const { result } = renderHook(() => useArtifactRefinement({ artifact }), { wrapper })

    await act(async () => {
      await result.current.sendRefinement('improve this')
    })

    expect(ensureArtifactStudioSession).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionName: 'Artifact Studio - Artifact 1'
      })
    )
    expect(streamArtifactStudioSessionMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: 'artifact-studio',
        sessionId: 'session-1'
      })
    )

    const state = store.getState().artifacts
    const assistantMessage = state.refinementMessages.find((message) => message.role === 'assistant')

    expect(assistantMessage).toBeDefined()
    expect(assistantMessage?.skillActivations).toEqual(
      expect.arrayContaining([expect.objectContaining({ skillName: 'artifact-refiner', action: 'activated' })])
    )
    expect(assistantMessage?.contextActions).toEqual(
      expect.arrayContaining([expect.objectContaining({ action: 'summarized', removedCount: 4 })])
    )
    expect(assistantMessage?.artifactLifecycle).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ stage: 'started' }),
        expect.objectContaining({ stage: 'completed' })
      ])
    )
    expect(assistantMessage?.pmpoPhases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ phase: 'spec' }),
        expect.objectContaining({ phase: 'plan' }),
        expect.objectContaining({ phase: 'execute' }),
        expect.objectContaining({ phase: 'reflect' })
      ])
    )
  })
})
