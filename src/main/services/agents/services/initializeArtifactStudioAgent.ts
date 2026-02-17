import { loggerService } from '@logger'
import { agentService } from '@main/services/agents/services/AgentService'
import { reduxService } from '@main/services/ReduxService'
import { skillService } from '@main/services/SkillService'
import type { CreateAgentRequest } from '@types'

const logger = loggerService.withContext('ArtifactStudioInit')

export const ARTIFACT_STUDIO_AGENT_ID = 'artifact-studio'
const ARTIFACT_REFINER_SKILL_ID = 'artifact-refiner'

const ARTIFACT_STUDIO_DEFAULTS: Omit<CreateAgentRequest, 'model'> = {
  type: 'claude-code',
  name: 'Artifact Studio',
  description: 'Specialized agent for artifact creation and refinement with real-time code streaming',
  accessible_paths: ['/tmp'],
  instructions: `You are the Artifact Studio agent, specialized in creating and refining interactive artifacts.

## Core Capabilities
- Create React components, HTML pages, SVG graphics, Mermaid diagrams, and Markdown documents
- Stream code directly to the code editor using the <cs-studio-code> protocol
- Handle compilation errors with automatic fixes
- Provide clear explanations alongside code

## Output Protocol
**CRITICAL**: You MUST wrap ALL code output in <cs-studio-code> tags with proper metadata:

<cs-studio-code identifier="unique-id" type="react|html|svg|mermaid|markdown" title="Display Title">
// Your complete, production-ready code here
</cs-studio-code>

### Metadata Requirements
- identifier: Unique kebab-case ID (e.g., "todo-app", "dashboard-component")
- type: One of: react, html, xhtml, htmx, svg, mermaid, markdown, code
- title: Human-readable title for the artifact

### Code Quality Standards
- **React**: Use TypeScript (.tsx), functional components, proper hooks
- **HTML**: Valid HTML5, semantic markup
- **Complete**: Always provide full, runnable code - never placeholders or "// rest of code"
- **Self-contained**: Include all necessary imports and dependencies

## Error Handling
When you receive a compilation error:
1. Analyze the error message and context
2. Explain what went wrong in plain text
3. Provide the complete fixed code in a new <cs-studio-code> block

## Communication Style
- Provide brief explanations OUTSIDE the code tags
- Keep explanations concise and focused on what changed
- Let the code speak for itself when possible`
}

interface LlmModelShape {
  id?: string
  provider?: string
}

interface LlmProviderShape {
  id?: string
  enabled?: boolean
  apiKey?: string
  models?: Array<{ id?: string }>
}

const hasValue = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

async function resolveArtifactStudioDefaultModelId(): Promise<string | undefined> {
  try {
    const [defaultModel, providers] = await Promise.all([
      reduxService.select<LlmModelShape | undefined>('state.llm.defaultModel'),
      reduxService.select<LlmProviderShape[] | undefined>('state.llm.providers')
    ])

    if (!defaultModel || !hasValue(defaultModel.provider) || !hasValue(defaultModel.id)) {
      return undefined
    }

    const provider = providers?.find((candidate) => candidate?.id === defaultModel.provider && candidate.enabled)
    if (!provider || !hasValue(provider.apiKey)) {
      logger.warn('Skipping Artifact Studio default model assignment because provider is missing or disabled', {
        providerId: defaultModel.provider
      })
      return undefined
    }

    const modelExists = provider.models?.some((model) => model.id === defaultModel.id)
    if (!modelExists) {
      logger.warn('Skipping Artifact Studio default model assignment because model is not available in provider', {
        providerId: defaultModel.provider,
        modelId: defaultModel.id
      })
      return undefined
    }

    return `${defaultModel.provider}:${defaultModel.id}`
  } catch (error) {
    logger.warn('Unable to resolve default model during Artifact Studio initialization', error as Error)
    return undefined
  }
}

async function buildArtifactStudioDefaults(): Promise<CreateAgentRequest> {
  const defaultModelId = await resolveArtifactStudioDefaultModelId()
  return {
    ...ARTIFACT_STUDIO_DEFAULTS,
    ...(defaultModelId ? { model: defaultModelId } : {})
  } as CreateAgentRequest
}

export async function initializeArtifactStudioAgent(): Promise<void> {
  try {
    const defaults = await buildArtifactStudioDefaults()
    const agent = await agentService.upsertAgent(ARTIFACT_STUDIO_AGENT_ID, defaults)
    if (!agent.model && defaults.model) {
      await agentService.updateAgent(ARTIFACT_STUDIO_AGENT_ID, { model: defaults.model })
      logger.info('Artifact Studio agent model assigned from global default model', {
        model: defaults.model
      })
    }
    await ensureArtifactRefinerBinding()
    logger.info('Artifact Studio agent initialized')
  } catch (error) {
    logger.error('Failed to initialize Artifact Studio agent:', error as Error)
  }
}

async function ensureArtifactRefinerBinding(): Promise<void> {
  const allSkills = await skillService.getSkills()
  const artifactRefiner = allSkills.find((skill) => skill.id === ARTIFACT_REFINER_SKILL_ID)

  if (!artifactRefiner) {
    logger.warn('artifact-refiner skill not found; default Artifact Studio skill binding skipped')
    return
  }

  if (!artifactRefiner.enabled) {
    await skillService.toggleSkill(ARTIFACT_REFINER_SKILL_ID, true)
    logger.info('Enabled artifact-refiner skill globally for Artifact Studio default')
  }

  const configuredSkills = await skillService.getAgentSkills(ARTIFACT_STUDIO_AGENT_ID)
  if (!configuredSkills.includes(ARTIFACT_REFINER_SKILL_ID)) {
    await skillService.setAgentSkills(ARTIFACT_STUDIO_AGENT_ID, [
      ...new Set([...configuredSkills, ARTIFACT_REFINER_SKILL_ID])
    ])
    logger.info('Bound artifact-refiner skill to artifact-studio agent')
  } else {
    logger.info('artifact-refiner skill already bound to artifact-studio agent')
  }
}
