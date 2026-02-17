import { beforeEach, describe, expect, it, vi } from 'vitest'

const upsertAgentMock = vi.fn()
const updateAgentMock = vi.fn()
const getSkillsMock = vi.fn()
const toggleSkillMock = vi.fn()
const getAgentSkillsMock = vi.fn()
const setAgentSkillsMock = vi.fn()
const reduxSelectMock = vi.fn()

vi.mock('@logger', () => ({
  loggerService: {
    withContext: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }))
  }
}))

vi.mock('@main/services/agents/services/AgentService', () => ({
  agentService: {
    upsertAgent: upsertAgentMock,
    updateAgent: updateAgentMock
  }
}))

vi.mock('@main/services/SkillService', () => ({
  skillService: {
    getSkills: getSkillsMock,
    toggleSkill: toggleSkillMock,
    getAgentSkills: getAgentSkillsMock,
    setAgentSkills: setAgentSkillsMock
  }
}))

vi.mock('@main/services/ReduxService', () => ({
  reduxService: {
    select: reduxSelectMock
  }
}))

describe('initializeArtifactStudioAgent', () => {
  let createdAgentIds: Set<string>

  beforeEach(() => {
    vi.clearAllMocks()
    createdAgentIds = new Set<string>()

    const agentSkillMap = new Map<string, string[]>()
    getAgentSkillsMock.mockImplementation(async (agentId: string) => agentSkillMap.get(agentId) || [])
    setAgentSkillsMock.mockImplementation(async (agentId: string, skillIds: string[]) => {
      agentSkillMap.set(agentId, skillIds)
    })

    upsertAgentMock.mockImplementation(async (agentId: string, request: { model?: string }) => {
      createdAgentIds.add(agentId)
      return { id: agentId, model: request?.model }
    })
    updateAgentMock.mockResolvedValue(null)
    getSkillsMock.mockResolvedValue([
      { id: 'artifact-refiner', enabled: true },
      { id: 'ui-ux-pro-max', enabled: true }
    ])
    reduxSelectMock.mockImplementation(async (selector: string) => {
      if (selector === 'state.llm.defaultModel') {
        return { provider: 'openai', id: 'gpt-4.1' }
      }
      if (selector === 'state.llm.providers') {
        return [{ id: 'openai', enabled: true, apiKey: 'test-key', models: [{ id: 'gpt-4.1' }] }]
      }
      return undefined
    })
  })

  it('upserts deterministic artifact-studio id and applies global default model when available', async () => {
    const { ARTIFACT_STUDIO_AGENT_ID, initializeArtifactStudioAgent } = await import('../initializeArtifactStudioAgent')

    await initializeArtifactStudioAgent()

    expect(upsertAgentMock).toHaveBeenCalledTimes(1)
    const [agentId, request] = upsertAgentMock.mock.calls[0]
    expect(agentId).toBe(ARTIFACT_STUDIO_AGENT_ID)
    expect(request).toMatchObject({
      type: 'claude-code',
      model: 'openai:gpt-4.1',
      name: 'Artifact Studio'
    })
  })

  it('creates artifact-studio agent without model when global default is unavailable', async () => {
    reduxSelectMock.mockResolvedValue(undefined)
    const { initializeArtifactStudioAgent } = await import('../initializeArtifactStudioAgent')

    await initializeArtifactStudioAgent()

    const [, request] = upsertAgentMock.mock.calls[0]
    expect(request.model).toBeUndefined()
  })

  it('binds artifact-refiner skill to artifact-studio and enables it globally when disabled', async () => {
    getSkillsMock.mockResolvedValue([{ id: 'artifact-refiner', enabled: false }])

    const { initializeArtifactStudioAgent } = await import('../initializeArtifactStudioAgent')

    await initializeArtifactStudioAgent()

    expect(toggleSkillMock).toHaveBeenCalledWith('artifact-refiner', true)
    expect(setAgentSkillsMock).toHaveBeenCalledWith('artifact-studio', ['artifact-refiner'])
  })

  it('is idempotent across repeated startup initialization calls', async () => {
    const { initializeArtifactStudioAgent } = await import('../initializeArtifactStudioAgent')

    await initializeArtifactStudioAgent()
    await initializeArtifactStudioAgent()

    expect(upsertAgentMock).toHaveBeenNthCalledWith(1, 'artifact-studio', expect.any(Object))
    expect(upsertAgentMock).toHaveBeenNthCalledWith(2, 'artifact-studio', expect.any(Object))

    // Skill binding should only be written once because the second run sees existing mapping.
    expect(setAgentSkillsMock).toHaveBeenCalledTimes(1)
    expect(setAgentSkillsMock).toHaveBeenLastCalledWith('artifact-studio', ['artifact-refiner'])
    expect(Array.from(createdAgentIds).filter((id) => id === 'artifact-studio')).toHaveLength(1)
  })

  it('skips default skill binding when artifact-refiner is unavailable', async () => {
    getSkillsMock.mockResolvedValue([{ id: 'ui-ux-pro-max', enabled: true }])

    const { initializeArtifactStudioAgent } = await import('../initializeArtifactStudioAgent')

    await initializeArtifactStudioAgent()

    expect(toggleSkillMock).not.toHaveBeenCalled()
    expect(setAgentSkillsMock).not.toHaveBeenCalled()
  })
})
