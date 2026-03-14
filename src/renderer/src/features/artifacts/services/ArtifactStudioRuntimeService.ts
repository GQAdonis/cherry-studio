import { loggerService } from '@logger'
import { AiSdkToChunkAdapter } from '@renderer/aiCore/chunk/AiSdkToChunkAdapter'
import { AgentApiClient } from '@renderer/api/agent'
import type { ApiServerConfig, ContextStrategyConfig, CreateSessionForm, SkillScopeConfig } from '@renderer/types'
import type { GetAgentResponse } from '@renderer/types/agent'
import type { Chunk } from '@renderer/types/chunk'
import type { TextStreamPart } from 'ai'

const logger = loggerService.withContext('ArtifactStudioRuntimeService')

export const ARTIFACT_STUDIO_AGENT_ID = 'artifact-studio'

export const ARTIFACT_STUDIO_RUNTIME_ERROR_CODES = {
  AGENT_NOT_FOUND: 'artifact_agent_not_found',
  AGENT_MODEL_REQUIRED: 'artifact_agent_model_required'
} as const

export type ArtifactStudioRuntimeErrorCode =
  (typeof ARTIFACT_STUDIO_RUNTIME_ERROR_CODES)[keyof typeof ARTIFACT_STUDIO_RUNTIME_ERROR_CODES]

export class ArtifactStudioRuntimeError extends Error {
  public readonly code: ArtifactStudioRuntimeErrorCode

  constructor(code: ArtifactStudioRuntimeErrorCode, message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = 'ArtifactStudioRuntimeError'
    this.code = code
    if (options?.cause !== undefined) {
      ;(this as Error & { cause?: unknown }).cause = options.cause
    }
  }
}

export function isArtifactStudioRuntimeError(
  error: unknown,
  code?: ArtifactStudioRuntimeErrorCode
): error is ArtifactStudioRuntimeError {
  if (!(error instanceof ArtifactStudioRuntimeError)) {
    return false
  }
  return code ? error.code === code : true
}

const hasModelValue = (model?: string): model is string => typeof model === 'string' && model.trim().length > 0

const buildAgentBaseURL = (apiServer: ApiServerConfig): string => {
  const hasProtocol = apiServer.host.startsWith('http://') || apiServer.host.startsWith('https://')
  const baseHost = hasProtocol ? apiServer.host : `http://${apiServer.host}`
  const portSegment = apiServer.port ? `:${apiServer.port}` : ''
  return `${baseHost}${portSegment}`
}

const createAgentClient = (apiServer: ApiServerConfig): AgentApiClient => {
  if (!apiServer.enabled) {
    throw new Error('Agent API server is disabled')
  }
  if (!apiServer.apiKey) {
    throw new Error('Agent API key is missing')
  }

  return new AgentApiClient({
    baseURL: buildAgentBaseURL(apiServer),
    headers: {
      Authorization: `Bearer ${apiServer.apiKey}`
    }
  })
}

const toSessionForm = (params: {
  agent: GetAgentResponse
  sessionName: string
  modelOverride?: string
  skillScope?: SkillScopeConfig
  contextStrategy?: ContextStrategyConfig
}): CreateSessionForm => {
  const { agent, sessionName, modelOverride, skillScope, contextStrategy } = params
  const configuration: NonNullable<CreateSessionForm['configuration']> = {
    permission_mode: agent.configuration?.permission_mode ?? 'default',
    max_turns: agent.configuration?.max_turns ?? 100,
    env_vars: {},
    ...agent.configuration,
    ...(skillScope ? { skillScope } : {}),
    ...(contextStrategy ? { contextStrategy } : {})
  }

  return {
    name: sessionName,
    description: agent.description,
    instructions: agent.instructions,
    model: hasModelValue(modelOverride) ? modelOverride : agent.model,
    plan_model: agent.plan_model,
    small_model: agent.small_model,
    accessible_paths: agent.accessible_paths?.length ? agent.accessible_paths : ['/tmp'],
    allowed_tools: agent.allowed_tools || [],
    mcps: agent.mcps,
    configuration
  }
}

interface EnsureSessionParams {
  apiServer: ApiServerConfig
  preferredSessionId?: string | null
  sessionName: string
  preferredModelId?: string
  fallbackModelId?: string
  skillScope?: SkillScopeConfig
  contextStrategy?: ContextStrategyConfig
}

interface EnsureSessionResult {
  agentId: string
  sessionId: string
  modelId?: string
}

const ensureAgentModel = async (params: {
  client: AgentApiClient
  agent: GetAgentResponse
  fallbackModelId?: string
}): Promise<GetAgentResponse> => {
  const { client, agent, fallbackModelId } = params

  if (hasModelValue(agent.model)) {
    return agent
  }

  if (!hasModelValue(fallbackModelId)) {
    throw new ArtifactStudioRuntimeError(
      ARTIFACT_STUDIO_RUNTIME_ERROR_CODES.AGENT_MODEL_REQUIRED,
      'No AI providers or models are configured. Please:\n1. Go to Settings → Providers\n2. Add at least one provider (OpenAI, Anthropic, etc.)\n3. Configure a default model\n4. Try again'
    )
  }

  try {
    const updatedAgent = await client.updateAgent({
      id: ARTIFACT_STUDIO_AGENT_ID,
      model: fallbackModelId
    })
    logger.info('Assigned Artifact Studio agent model from global default model', {
      modelId: fallbackModelId
    })
    return updatedAgent
  } catch (error) {
    throw new ArtifactStudioRuntimeError(
      ARTIFACT_STUDIO_RUNTIME_ERROR_CODES.AGENT_MODEL_REQUIRED,
      'Failed to assign model to Artifact Studio agent. Please configure a default model in Settings → Models.',
      { cause: error }
    )
  }
}

export async function ensureArtifactStudioSession(params: EnsureSessionParams): Promise<EnsureSessionResult> {
  const { apiServer, preferredSessionId, sessionName, preferredModelId, fallbackModelId, skillScope, contextStrategy } =
    params
  const client = createAgentClient(apiServer)

  if (preferredSessionId) {
    try {
      const existing = await client.getSession(ARTIFACT_STUDIO_AGENT_ID, preferredSessionId)
      if (hasModelValue(preferredModelId) && existing.model !== preferredModelId) {
        logger.info('Discarding preferred Artifact Studio session due to model override change', {
          sessionId: preferredSessionId,
          existingModel: existing.model,
          preferredModelId
        })
      } else {
        return {
          agentId: ARTIFACT_STUDIO_AGENT_ID,
          sessionId: existing.id,
          modelId: existing.model
        }
      }
    } catch (error) {
      logger.warn('Preferred Artifact Studio session not available, creating a new one', error as Error)
    }
  }

  let agent: GetAgentResponse
  try {
    agent = await client.getAgent(ARTIFACT_STUDIO_AGENT_ID)
  } catch (error) {
    // Agent doesn't exist - create it automatically
    logger.info('Artifact Studio agent not found, creating default agent')
    try {
      agent = await client.createAgent({
        type: 'claude-code',
        name: 'Artifact Studio',
        description: 'Agent for artifact creation and refinement with PMPO support',
        instructions: 'You are a helpful assistant that creates and refines artifacts using the PMPO methodology.',
        model: fallbackModelId || '', // Will be set/validated by ensureAgentModel
        accessible_paths: ['/tmp'],
        allowed_tools: [],
        mcps: []
      })
      logger.info('Created Artifact Studio agent', { agentId: agent.id })

      // If the auto-generated ID doesn't match our expected ID, we have a problem
      if (agent.id !== ARTIFACT_STUDIO_AGENT_ID) {
        logger.warn('Created agent ID does not match expected ARTIFACT_STUDIO_AGENT_ID', {
          expected: ARTIFACT_STUDIO_AGENT_ID,
          actual: agent.id
        })
      }
    } catch (createError) {
      throw new ArtifactStudioRuntimeError(
        ARTIFACT_STUDIO_RUNTIME_ERROR_CODES.AGENT_NOT_FOUND,
        'Failed to create Artifact Studio agent. Check API server connectivity and configuration.',
        { cause: createError }
      )
    }
  }

  const hydratedAgent = await ensureAgentModel({
    client,
    agent,
    fallbackModelId
  })

  const sessionForm = toSessionForm({
    agent: hydratedAgent,
    sessionName,
    modelOverride: preferredModelId,
    skillScope,
    contextStrategy
  })

  const created = await client.createSession(ARTIFACT_STUDIO_AGENT_ID, sessionForm)

  return {
    agentId: ARTIFACT_STUDIO_AGENT_ID,
    sessionId: created.id,
    modelId: created.model
  }
}

const createSSEReadableStream = (
  source: ReadableStream<Uint8Array>,
  signal: AbortSignal
): ReadableStream<TextStreamPart<Record<string, any>>> => {
  return new ReadableStream<TextStreamPart<Record<string, any>>>({
    start(controller) {
      const reader = source.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const cancelReader = (reason?: unknown) => reader.cancel(reason).catch(() => {})

      const abortHandler = () => {
        cancelReader(signal.reason ?? 'aborted')
        controller.error(new DOMException('Aborted', 'AbortError'))
      }

      if (signal.aborted) {
        abortHandler()
        return
      }

      signal.addEventListener('abort', abortHandler, { once: true })

      const emitEvent = (eventString: string): boolean => {
        const lines = eventString.split(/\r?\n/)
        let dataPayload = ''

        for (const line of lines) {
          if (line.startsWith('data:')) {
            dataPayload += line.slice(5).trimStart()
          }
        }

        if (!dataPayload) {
          return false
        }

        if (dataPayload === '[DONE]') {
          signal.removeEventListener('abort', abortHandler)
          cancelReader()
          controller.close()
          return true
        }

        try {
          const parsed = JSON.parse(dataPayload) as TextStreamPart<Record<string, any>>
          controller.enqueue(parsed)
        } catch (_error) {
          logger.warn('Failed to parse Artifact Studio SSE chunk', { dataPayload })
        }

        return false
      }

      const pump = async () => {
        try {
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })

            let separatorIndex = buffer.indexOf('\n\n')
            while (separatorIndex !== -1) {
              const rawEvent = buffer.slice(0, separatorIndex).trim()
              buffer = buffer.slice(separatorIndex + 2)
              if (rawEvent) {
                const shouldStop = emitEvent(rawEvent)
                if (shouldStop) {
                  return
                }
              }
              separatorIndex = buffer.indexOf('\n\n')
            }
          }

          buffer += decoder.decode()
          if (buffer.trim()) {
            emitEvent(buffer.trim())
          }

          signal.removeEventListener('abort', abortHandler)
          controller.close()
        } catch (error) {
          signal.removeEventListener('abort', abortHandler)
          controller.error(error)
        }
      }

      pump().catch((error) => {
        signal.removeEventListener('abort', abortHandler)
        controller.error(error)
      })
    },
    cancel(reason) {
      return source.cancel(reason).catch(() => {})
    }
  })
}

interface StreamParams {
  apiServer: ApiServerConfig
  agentId: string
  sessionId: string
  content: string
  signal?: AbortSignal
  onChunk: (chunk: Chunk) => void
  onSessionUpdate?: (sessionId: string) => void
}

export async function streamArtifactStudioSessionMessage(params: StreamParams): Promise<void> {
  const { apiServer, agentId, sessionId, content, signal, onChunk, onSessionUpdate } = params

  if (!apiServer.enabled) {
    throw new Error('Agent API server is disabled')
  }

  const controller = signal ? null : new AbortController()
  const resolvedSignal = signal || controller!.signal
  const baseURL = buildAgentBaseURL(apiServer)
  const url = `${baseURL}/v1/agents/${agentId}/sessions/${sessionId}/messages`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiServer.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache'
    },
    body: JSON.stringify({ content }),
    signal: resolvedSignal
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(errorText || `Failed to stream artifact message: ${response.status}`)
  }

  if (!response.body) {
    throw new Error('Artifact runtime stream has no body')
  }

  const stream = createSSEReadableStream(response.body, resolvedSignal)
  const adapter = new AiSdkToChunkAdapter(onChunk, [], false, false, onSessionUpdate)
  await adapter.processStream({
    fullStream: stream,
    text: Promise.resolve('')
  })
}
