import type { Skill, SkillMatchResult } from '@types'

/**
 * Interface for skill matching providers.
 * Duplicated here to avoid coupling the aiCore package to main process imports.
 */
export interface SkillMatchingProvider {
  readonly name: string
  initialize(skills: Skill[]): Promise<void>
  match(query: string, skills: Skill[], topK?: number): Promise<SkillMatchResult[]>
  onSkillsChanged?(skills: Skill[]): Promise<void>
  dispose?(): Promise<void>
}

export interface SkillPluginConfig {
  getSkills: () => Promise<Skill[]>
  getTools?: () => Promise<Record<string, any>>
  /** Optional skill matching provider for intelligent routing */
  matchingProvider?: SkillMatchingProvider
  /** Minimum score threshold for skill matching (default: 0.5) */
  matchThreshold?: number
  /** Maximum number of skills to inject when matching is active (default: 3) */
  maxMatchedSkills?: number
  /** Minimum number of enabled skills before matching kicks in (default: 3) */
  minSkillsForMatching?: number
}

/**
 * Extract the last user message text from AI SDK params.
 */
function extractLastUserMessage(params: any): string | null {
  if (params.messages) {
    for (let i = params.messages.length - 1; i >= 0; i--) {
      const msg = params.messages[i]
      if (msg.role === 'user') {
        if (typeof msg.content === 'string') return msg.content
        if (Array.isArray(msg.content)) {
          const textPart = msg.content.find((p: any) => p.type === 'text')
          if (textPart) return textPart.text
        }
      }
    }
  }
  if (params.prompt && typeof params.prompt === 'string') {
    return params.prompt
  }
  return null
}

export const createSkillPlugin = (config: SkillPluginConfig) => {
  const matchThreshold = config.matchThreshold ?? 0.5
  const maxMatchedSkills = config.maxMatchedSkills ?? 3
  const minSkillsForMatching = config.minSkillsForMatching ?? 3

  return {
    name: 'skill',
    enforce: 'pre',

    transformParams: async (params: any, _context: any) => {
      const skills = await config.getSkills()
      const enabledSkills = skills.filter((s) => s.enabled)

      if (enabledSkills.length === 0) {
        return params
      }

      let activeSkills: Skill[]

      // Use matching provider when available and enough skills are enabled
      if (config.matchingProvider && enabledSkills.length >= minSkillsForMatching) {
        const userQuery = extractLastUserMessage(params)

        if (userQuery) {
          try {
            const matches = await config.matchingProvider.match(userQuery, enabledSkills, maxMatchedSkills)
            // Filter by threshold and extract skills
            activeSkills = matches.filter((m) => m.score >= matchThreshold).map((m) => m.skill)

            // If no matches above threshold, fall back to all enabled skills
            if (activeSkills.length === 0) {
              activeSkills = enabledSkills
            }
          } catch {
            // On matcher error, fall back to all enabled skills
            activeSkills = enabledSkills
          }
        } else {
          // No user message to match against, inject all
          activeSkills = enabledSkills
        }
      } else {
        // No matching provider or too few skills, inject all enabled
        activeSkills = enabledSkills
      }

      const skillInstructions = activeSkills.map((s) => `### Skill: ${s.name}\n${s.instructions}`).join('\n\n')

      const systemPrompt = params.messages?.find((m: any) => m.role === 'system')?.content || ''

      const newSystemPrompt = systemPrompt
        ? `${systemPrompt}\n\n## Active Skills\n${skillInstructions}`
        : `## Active Skills\n${skillInstructions}`

      if (params.messages) {
        const systemMessageIndex = params.messages.findIndex((m: any) => m.role === 'system')
        if (systemMessageIndex !== -1) {
          params.messages[systemMessageIndex].content = newSystemPrompt
        } else {
          params.messages.unshift({ role: 'system', content: newSystemPrompt })
        }
      } else {
        params.system = newSystemPrompt
      }

      if (config.getTools) {
        const tools = await config.getTools()
        if (tools) {
          params.tools = { ...params.tools, ...tools }
        }
      }

      return params
    },

    transformStream: (_params: any, _context: any) => {
      // @ts-ignore
      return (options: any) => {
        const transformStream = new TransformStream({
          async start(controller) {
            const skills = await config.getSkills()
            const enabledSkills = skills.filter((s: any) => s.enabled)

            for (const skill of enabledSkills) {
              controller.enqueue({
                type: 'data',
                value: {
                  type: 'skill.activation',
                  skillName: skill.name,
                  action: 'activated'
                }
              })
            }
          },
          transform(chunk, controller) {
            controller.enqueue(chunk)
          }
        })
        return transformStream
      }
    }
  }
}
export default createSkillPlugin
