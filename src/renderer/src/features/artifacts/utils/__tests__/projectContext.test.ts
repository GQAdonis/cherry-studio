import { describe, expect, it } from 'vitest'

import {
  deserializeContextEnvelope,
  normalizeContextEnvelope,
  resolveArtifactProjectRuntimeContext,
  serializeContextEnvelope
} from '../projectContext'

describe('projectContext utils', () => {
  it('serializes and deserializes context envelope with safe defaults', () => {
    const serialized = serializeContextEnvelope(undefined)
    expect(serialized.source.sourceType).toBe('unknown')
    expect(serialized.source.capturedAt).toBeTruthy()

    const deserialized = deserializeContextEnvelope(null)
    expect(deserialized.source.sourceType).toBe('unknown')
    expect(deserialized.source.capturedAt).toBeTruthy()
  })

  it('preserves provided source snapshot fields when normalizing', () => {
    const normalized = normalizeContextEnvelope({
      llm: { modelId: 'gpt-5', providerId: 'openai' },
      source: {
        sourceType: 'conversation',
        conversationId: 'topic-1',
        capturedAt: '2026-01-01T00:00:00.000Z'
      }
    })

    expect(normalized.llm?.modelId).toBe('gpt-5')
    expect(normalized.source.sourceType).toBe('conversation')
    expect(normalized.source.conversationId).toBe('topic-1')
    expect(normalized.source.capturedAt).toBe('2026-01-01T00:00:00.000Z')
  })

  it('resolves context with precedence conversation > project > source > global', () => {
    const resolved = resolveArtifactProjectRuntimeContext({
      sourceEnvelope: {
        llm: { modelId: 'source-model' },
        skills: { mode: 'inherit' },
        contextManagement: { type: 'sliding_window' },
        source: { sourceType: 'conversation', capturedAt: '2026-01-01T00:00:00.000Z' }
      },
      projectOverrides: {
        llm: { modelId: 'project-model' },
        skills: { mode: 'selected', selectedSkillIds: ['skill-a'] }
      },
      conversationOverrides: {
        llm: { modelId: 'conversation-model' }
      },
      globalDefaults: {
        knowledge: { knowledgeBaseIds: ['kb-global'] }
      }
    })

    expect(resolved.llm?.modelId).toBe('conversation-model')
    expect(resolved.skills?.mode).toBe('selected')
    expect(resolved.contextManagement?.type).toBe('sliding_window')
    expect(resolved.knowledge?.knowledgeBaseIds).toEqual(['kb-global'])
    expect(resolved.resolvedFrom).toEqual({
      llm: 'conversation',
      skills: 'project',
      contextManagement: 'source',
      knowledge: 'global'
    })
  })

  it('disables conversation/project overrides when override policy forbids them', () => {
    const resolved = resolveArtifactProjectRuntimeContext({
      sourceEnvelope: {
        llm: { modelId: 'source-model' },
        source: { sourceType: 'conversation', capturedAt: '2026-01-01T00:00:00.000Z' }
      },
      projectOverrides: {
        llm: { modelId: 'project-model' }
      },
      conversationOverrides: {
        llm: { modelId: 'conversation-model' }
      },
      overridePolicy: {
        allowConversationOverride: false,
        allowProjectOverride: false
      }
    })

    expect(resolved.llm?.modelId).toBe('source-model')
    expect(resolved.resolvedFrom.llm).toBe('source')
  })
})
