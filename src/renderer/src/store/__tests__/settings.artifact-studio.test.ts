import settingsReducer, {
  initialState,
  selectArtifactStudioSettings,
  setArtifactStudioDefaultContextManagement,
  setArtifactStudioDefaultKnowledge,
  setArtifactStudioDefaultLlm,
  setArtifactStudioDefaultSkills,
  setArtifactStudioOverridePolicy
} from '@renderer/store/settings'
import { describe, expect, it } from 'vitest'

describe('settings artifact studio governance', () => {
  it('updates override policy and defaults independently', () => {
    let state = settingsReducer(initialState, setArtifactStudioOverridePolicy({ allowConversationOverride: false }))

    expect(state.artifacts.studio.overridePolicy.allowConversationOverride).toBe(false)
    expect(state.artifacts.studio.overridePolicy.allowProjectOverride).toBe(true)

    state = settingsReducer(
      state,
      setArtifactStudioDefaultSkills({
        mode: 'selected',
        selectedSkillIds: ['skill-a', 'skill-b'],
        strategy: 'hybrid'
      })
    )

    expect(state.artifacts.studio.defaults.skills).toEqual({
      mode: 'selected',
      selectedSkillIds: ['skill-a', 'skill-b'],
      strategy: 'hybrid'
    })
  })

  it('stores llm/context/knowledge defaults for artifact studio', () => {
    let state = settingsReducer(
      initialState,
      setArtifactStudioDefaultLlm({
        modelId: 'gpt-5.2',
        providerId: 'openai',
        temperature: 0.4,
        streamOutput: true
      })
    )

    state = settingsReducer(
      state,
      setArtifactStudioDefaultContextManagement({
        ...state.artifacts.studio.defaults.contextManagement,
        type: 'summarize',
        summarizeThreshold: 10
      })
    )

    state = settingsReducer(
      state,
      setArtifactStudioDefaultKnowledge({
        knowledgeBaseIds: ['kb-a', 'kb-b'],
        autoCreateFromChatHistory: true
      })
    )

    expect(state.artifacts.studio.defaults.llm.modelId).toBe('gpt-5.2')
    expect(state.artifacts.studio.defaults.llm.providerId).toBe('openai')
    expect(state.artifacts.studio.defaults.contextManagement.type).toBe('summarize')
    expect(state.artifacts.studio.defaults.knowledge).toEqual({
      knowledgeBaseIds: ['kb-a', 'kb-b'],
      autoCreateFromChatHistory: true
    })
  })

  it('exposes artifact studio settings selector', () => {
    const state = {
      settings: initialState
    }

    const studio = selectArtifactStudioSettings(state)
    expect(studio.overridePolicy).toEqual({
      allowConversationOverride: true,
      allowProjectOverride: true
    })
  })
})
