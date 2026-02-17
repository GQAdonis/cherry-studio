import { configureStore } from '@reduxjs/toolkit'
import type { Artifact } from '@renderer/features/artifacts/types'
import { fetchChatCompletion } from '@renderer/services/ApiService'
import artifactsReducer from '@renderer/store/artifacts'
import { ChunkType } from '@renderer/types/chunk'
import { act, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { Provider } from 'react-redux'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useArtifactRefinement } from '../useArtifactRefinement'

vi.mock('@renderer/services/ApiService', () => ({
  fetchChatCompletion: vi.fn()
}))

vi.mock('@renderer/services/AssistantService', () => {
  const defaultAssistant = {
    id: 'default-assistant',
    name: 'Default Assistant',
    type: 'assistant',
    prompt: '',
    topics: [],
    messages: [],
    regularPhrases: [],
    settings: {
      streamOutput: true,
      temperature: 0.7
    }
  }

  const defaultModel = {
    id: 'test-model',
    name: 'Test Model',
    provider: 'openai'
  }

  return {
    DEFAULT_ASSISTANT_SETTINGS: defaultAssistant.settings,
    getDefaultAssistant: vi.fn(() => defaultAssistant),
    getSkillsCreatorAssistant: vi.fn(() => ({ ...defaultAssistant, id: 'skills-creator' })),
    getDefaultModel: vi.fn(() => defaultModel),
    getQuickModel: vi.fn(() => defaultModel),
    getTranslateModel: vi.fn(() => defaultModel),
    getDefaultTopic: vi.fn(() => ({
      id: 'topic-1',
      assistantId: defaultAssistant.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      name: 'Default Topic',
      messages: [],
      isNameManuallyEdited: false
    })),
    getDefaultProvider: vi.fn(() => null),
    getAssistantProvider: vi.fn(() => null),
    getProviderByModel: vi.fn(() => null),
    getProviderByModelId: vi.fn(() => null),
    getDefaultAssistantSettings: vi.fn(() => defaultAssistant.settings),
    getAssistantSettings: vi.fn(() => defaultAssistant.settings),
    getAssistantById: vi.fn(() => defaultAssistant),
    createAssistantFromAgent: vi.fn(),
    createAssistantFromAgentWithOptions: vi.fn(),
    getDefaultTranslateAssistant: vi.fn()
  }
})

describe('useArtifactRefinement diagnostics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('surfaces skill activation, context actions, and lifecycle events on assistant message', async () => {
    const mockFetch = vi.mocked(fetchChatCompletion)
    mockFetch.mockImplementation(async ({ onChunkReceived }: any) => {
      onChunkReceived({
        type: ChunkType.SKILL_ACTIVATION,
        skillName: 'artifact-refiner',
        action: 'activated'
      })
      onChunkReceived({
        type: ChunkType.CONTEXT_ACTION,
        action: 'summarized',
        summary: 'Summarized prior chat context',
        removedCount: 4
      })
      onChunkReceived({
        type: ChunkType.TEXT_DELTA,
        text: 'Refinement complete.'
      })
      onChunkReceived({
        type: ChunkType.LLM_RESPONSE_COMPLETE
      })
    })

    const store = configureStore({
      reducer: {
        artifacts: artifactsReducer
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

    const state = store.getState().artifacts
    const assistantMessage = state.refinementMessages.find((message) => message.role === 'assistant')

    expect(assistantMessage).toBeDefined()
    expect(assistantMessage?.skillActivations).toEqual([
      expect.objectContaining({ skillName: 'artifact-refiner', action: 'activated' })
    ])
    expect(assistantMessage?.contextActions).toEqual([
      expect.objectContaining({ action: 'summarized', removedCount: 4 })
    ])
    expect(assistantMessage?.artifactLifecycle).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ stage: 'started' }),
        expect.objectContaining({ stage: 'completed' })
      ])
    )
  })
})
