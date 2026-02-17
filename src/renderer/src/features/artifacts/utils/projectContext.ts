import type {
  ArtifactProjectContextEnvelope,
  ArtifactProjectContextOverridePolicy,
  ArtifactProjectRuntimeResolvedContext
} from '../types'

export interface ArtifactStudioGlobalDefaults {
  llm?: ArtifactProjectContextEnvelope['llm']
  skills?: ArtifactProjectContextEnvelope['skills']
  contextManagement?: ArtifactProjectContextEnvelope['contextManagement']
  knowledge?: ArtifactProjectContextEnvelope['knowledge']
}

const DEFAULT_OVERRIDE_POLICY: ArtifactProjectContextOverridePolicy = {
  allowConversationOverride: true,
  allowProjectOverride: true
}

function nowIso(): string {
  return new Date().toISOString()
}

export function normalizeContextEnvelope(
  envelope?: ArtifactProjectContextEnvelope | null
): ArtifactProjectContextEnvelope {
  return {
    llm: envelope?.llm,
    skills: envelope?.skills,
    contextManagement: envelope?.contextManagement,
    knowledge: envelope?.knowledge,
    source: {
      sourceType: envelope?.source?.sourceType ?? 'unknown',
      assistantId: envelope?.source?.assistantId,
      topicId: envelope?.source?.topicId,
      conversationId: envelope?.source?.conversationId,
      messageId: envelope?.source?.messageId,
      capturedAt: envelope?.source?.capturedAt ?? nowIso()
    }
  }
}

export function serializeContextEnvelope(
  envelope?: ArtifactProjectContextEnvelope | null
): ArtifactProjectContextEnvelope {
  return normalizeContextEnvelope(envelope)
}

export function deserializeContextEnvelope(raw: unknown): ArtifactProjectContextEnvelope {
  if (!raw || typeof raw !== 'object') {
    return normalizeContextEnvelope(undefined)
  }

  const candidate = raw as ArtifactProjectContextEnvelope
  return normalizeContextEnvelope(candidate)
}

export function resolveArtifactProjectRuntimeContext(params: {
  sourceEnvelope?: ArtifactProjectContextEnvelope | null
  projectOverrides?: Partial<ArtifactProjectContextEnvelope> | null
  conversationOverrides?: Partial<ArtifactProjectContextEnvelope> | null
  globalDefaults?: ArtifactStudioGlobalDefaults | null
  overridePolicy?: Partial<ArtifactProjectContextOverridePolicy> | null
}): ArtifactProjectRuntimeResolvedContext {
  const { sourceEnvelope, projectOverrides, conversationOverrides, globalDefaults, overridePolicy } = params

  const policy: ArtifactProjectContextOverridePolicy = {
    ...DEFAULT_OVERRIDE_POLICY,
    ...overridePolicy
  }

  const source = normalizeContextEnvelope(sourceEnvelope)

  const choose = <T>(
    key: 'llm' | 'skills' | 'contextManagement' | 'knowledge'
  ): { value: T | undefined; from: 'conversation' | 'project' | 'source' | 'global' } => {
    if (policy.allowConversationOverride) {
      const conversationValue = conversationOverrides?.[key] as T | undefined
      if (conversationValue !== undefined) {
        return { value: conversationValue, from: 'conversation' }
      }
    }

    if (policy.allowProjectOverride) {
      const projectValue = projectOverrides?.[key] as T | undefined
      if (projectValue !== undefined) {
        return { value: projectValue, from: 'project' }
      }
    }

    const sourceValue = source[key] as T | undefined
    if (sourceValue !== undefined) {
      return { value: sourceValue, from: 'source' }
    }

    return {
      value: globalDefaults?.[key] as T | undefined,
      from: 'global'
    }
  }

  const llm = choose<ArtifactProjectRuntimeResolvedContext['llm']>('llm')
  const skills = choose<ArtifactProjectRuntimeResolvedContext['skills']>('skills')
  const contextManagement = choose<ArtifactProjectRuntimeResolvedContext['contextManagement']>('contextManagement')
  const knowledge = choose<ArtifactProjectRuntimeResolvedContext['knowledge']>('knowledge')

  return {
    llm: llm.value,
    skills: skills.value,
    contextManagement: contextManagement.value,
    knowledge: knowledge.value,
    resolvedFrom: {
      llm: llm.from,
      skills: skills.from,
      contextManagement: contextManagement.from,
      knowledge: knowledge.from
    }
  }
}
