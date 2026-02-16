export function injectSkillsIntoPrompt(params: any, skills: any[]): any {
  const enabledSkills = (skills || []).filter((skill) => skill?.enabled)
  if (enabledSkills.length === 0 || !Array.isArray(params.prompt)) {
    return params
  }

  const skillInstructions = enabledSkills.map((skill) => `### Skill: ${skill.name}\n${skill.instructions}`).join('\n\n')
  const fullSkillSection = `## Active Skills\n${skillInstructions}`
  const appendedSkillSection = `\n\n${fullSkillSection}`

  const prompt = [...params.prompt]
  const systemMessageIndex = prompt.findIndex((message: any) => message?.role === 'system')

  if (systemMessageIndex >= 0) {
    const systemMessage = prompt[systemMessageIndex] as any
    const existingContent = systemMessage?.content

    if (Array.isArray(existingContent)) {
      prompt[systemMessageIndex] = {
        ...systemMessage,
        content: [...existingContent, { type: 'text', text: appendedSkillSection }]
      }
    } else {
      prompt[systemMessageIndex] = {
        ...systemMessage,
        content: `${typeof existingContent === 'string' ? existingContent : ''}${appendedSkillSection}`
      }
    }
  } else {
    prompt.unshift({
      role: 'system',
      content: fullSkillSection
    } as any)
  }

  return {
    ...params,
    prompt
  }
}
