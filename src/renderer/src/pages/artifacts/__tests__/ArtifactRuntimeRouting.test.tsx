import { configureStore } from '@reduxjs/toolkit'
import type { Artifact } from '@renderer/features/artifacts/types'
import artifactsReducer, { setActiveProjectResolvedContext } from '@renderer/store/artifacts'
import { ChunkType } from '@renderer/types/chunk'
import { act, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useArtifactRefinement } from '../../../features/artifacts/hooks/useArtifactRefinement'
import {
  ensureArtifactStudioSession,
  streamArtifactStudioSessionMessage
} from '../../../features/artifacts/services/ArtifactStudioRuntimeService'

vi.mock('../../../features/artifacts/services/ArtifactStudioRuntimeService', () => ({
  ARTIFACT_STUDIO_AGENT_ID: 'artifact-studio',
  ensureArtifactStudioSession: vi.fn(),
  streamArtifactStudioSessionMessage: vi.fn()
}))

describe('Artifact Studio runtime routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(ensureArtifactStudioSession).mockResolvedValue({
      agentId: 'artifact-studio',
      sessionId: 'artifact-session-1',
      modelId: 'runtime-model'
    })
  })

  it('sends refinement requests through agent/session runtime instead of direct completion', async () => {
    vi.mocked(streamArtifactStudioSessionMessage).mockImplementation(async ({ onChunk }: any) => {
      onChunk({
        type: ChunkType.TEXT_DELTA,
        text: '<cs-studio-code identifier="artifact-1" type="html" title="Artifact"><div>ok</div></cs-studio-code>'
      })
      onChunk({ type: ChunkType.LLM_RESPONSE_COMPLETE })
    })

    const store = configureStore({
      reducer: {
        artifacts: artifactsReducer,
        llm: (state = { providers: [], defaultModel: { provider: 'openai', id: 'gpt-4.1' } }) => state,
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
      title: 'Artifact',
      content: '<div>initial</div>',
      version: 1,
      conversationId: 'conv-1',
      messageId: 'msg-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      saved: false,
      tags: [],
      metadata: { tailwind: true, theme: 'auto' },
      status: 'complete' as any
    }

    const { result } = renderHook(() => useArtifactRefinement({ artifact }), { wrapper })

    await act(async () => {
      await result.current.sendRefinement('update')
    })

    expect(ensureArtifactStudioSession).toHaveBeenCalledTimes(1)
    expect(streamArtifactStudioSessionMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: 'artifact-studio',
        sessionId: 'artifact-session-1'
      })
    )
  })

  it('uses global default model fallback and applies saved skill/context strategy when creating runtime session', async () => {
    vi.mocked(streamArtifactStudioSessionMessage).mockImplementation(async ({ onChunk }: any) => {
      onChunk({
        type: ChunkType.TEXT_DELTA,
        text: '<cs-studio-code identifier="artifact-1" type="html" title="Artifact"><div>ok</div></cs-studio-code>'
      })
      onChunk({ type: ChunkType.LLM_RESPONSE_COMPLETE })
    })

    const store = configureStore({
      reducer: {
        artifacts: artifactsReducer,
        llm: (state = { providers: [], defaultModel: { provider: 'openai', id: 'gpt-4.1' } }) => state,
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
    store.dispatch(
      setActiveProjectResolvedContext({
        llm: { modelId: 'configured-model' },
        skills: { mode: 'strict', strategy: 'always', skillIds: ['artifact-refiner'] },
        contextManagement: { type: 'summary_window', maxMessages: 16 }
      } as any)
    )

    const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>

    const artifact: Artifact = {
      id: 'artifact-1',
      identifier: 'artifact-1',
      type: 'html',
      title: 'Artifact',
      content: '<div>initial</div>',
      version: 1,
      conversationId: 'conv-1',
      messageId: 'msg-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      saved: false,
      tags: [],
      metadata: { tailwind: true, theme: 'auto' },
      status: 'complete' as any
    }

    const { result } = renderHook(() => useArtifactRefinement({ artifact }), { wrapper })

    await act(async () => {
      await result.current.sendRefinement('update')
    })

    expect(ensureArtifactStudioSession).toHaveBeenCalledWith(
      expect.objectContaining({
        fallbackModelId: 'openai:gpt-4.1',
        skillScope: expect.objectContaining({ mode: 'strict', strategy: 'always' }),
        contextStrategy: expect.objectContaining({ type: 'summary_window' })
      })
    )
  })
})
