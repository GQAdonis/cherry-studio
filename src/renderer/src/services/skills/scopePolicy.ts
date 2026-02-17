import store from '@renderer/store'
import type { Assistant, Skill, Topic } from '@renderer/types'
import type { SkillScopeConfig } from '@renderer/types/skillScope'

export const DEFAULT_SKILL_SCOPE: SkillScopeConfig = {
  mode: 'inherit'
}

export function normalizeSkillScope(scope?: SkillScopeConfig): SkillScopeConfig {
  return {
    mode: scope?.mode ?? 'inherit',
    selectedSkillIds: scope?.selectedSkillIds,
    strategy: scope?.strategy
  }
}

export function resolveEffectiveSkillScope(topic?: Topic, assistant?: Assistant): SkillScopeConfig {
  if (topic?.skillScope) {
    return normalizeSkillScope(topic.skillScope)
  }
  if (assistant?.settings?.skillScope) {
    return normalizeSkillScope(assistant.settings.skillScope)
  }
  return DEFAULT_SKILL_SCOPE
}

export function filterSkillsForScope(skills: Skill[], scope?: SkillScopeConfig): Skill[] {
  const normalized = normalizeSkillScope(scope)

  switch (normalized.mode) {
    case 'none':
      return []
    case 'all':
      return skills
    case 'selected': {
      const selected = new Set(normalized.selectedSkillIds ?? [])
      if (selected.size === 0) {
        return []
      }
      return skills.filter((skill) => selected.has(skill.id))
    }
    case 'inherit':
    default:
      return skills.filter((skill) => !!skill.enabled)
  }
}

export function findTopicById(topicId?: string): Topic | undefined {
  if (!topicId) {
    return undefined
  }
  const assistants = store.getState().assistants.assistants
  for (const assistant of assistants) {
    const topic = assistant.topics?.find((item) => item.id === topicId)
    if (topic) {
      return topic
    }
  }
  return undefined
}
