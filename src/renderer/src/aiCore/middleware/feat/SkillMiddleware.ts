import type { LanguageModelMiddleware } from 'ai'

export interface SkillMiddlewareConfig {
  getSkills: () => Promise<any[]>
  getTools?: () => Promise<Record<string, any>>
}

export const createSkillMiddleware = (config: SkillMiddlewareConfig): LanguageModelMiddleware => ({
  specificationVersion: 'v3',
  transformParams: async ({ params }) => {
    const skills = await config.getSkills()
    const enabledSkills = skills.filter((s) => s.enabled)

    if (enabledSkills.length === 0) {
      return params
    }

    const skillInstructions = enabledSkills.map((s) => `### Skill: ${s.name}\n${s.instructions}`).join('\n\n')

    const newSystemPrompt = `## Active Skills\n${skillInstructions}`

    // Inject system prompt
    if (params.prompt) {
      const systemMessage = params.prompt.find((m) => m.role === 'system')
      if (systemMessage && 'content' in systemMessage) {
        // Modify existing system message if it's a simple string content
        // But logic can be complex with multi-part content.
        // Simpler to append a new system message? No, usually one system message.
        // We can assume it's string for now or handle parts.
        if (typeof systemMessage.content === 'string') {
          systemMessage.content += `\n\n${newSystemPrompt}`
        }
      } else {
        // Insert at beginning
        params.prompt.unshift({ role: 'system', content: newSystemPrompt })
      }
    }

    return params
  }
})
