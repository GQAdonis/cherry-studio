import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const upsertAgentMock = vi.fn()
const listAgentsMock = vi.fn()
const getSkillsMock = vi.fn()
const toggleSkillMock = vi.fn()
const getAgentSkillsMock = vi.fn()
const setAgentSkillsMock = vi.fn()
const reduxSelectMock = vi.fn()

const agents = new Map<string, any>()
const agentSkillMap = new Map<string, string[]>()

vi.mock('@logger', () => ({
  loggerService: {
    withContext: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    }))
  }
}))

vi.mock('@main/services/agents/services/AgentService', () => ({
  agentService: {
    upsertAgent: upsertAgentMock
  }
}))

vi.mock('@main/services/agents', () => ({
  agentService: {
    listAgents: listAgentsMock
  },
  sessionService: {},
  AgentModelValidationError: class AgentModelValidationError extends Error {}
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

describe('GET /v1/agents artifact-studio startup idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    agents.clear()
    agentSkillMap.clear()

    upsertAgentMock.mockImplementation(async (id: string, req: any) => {
      if (!agents.has(id)) {
        const now = new Date().toISOString()
        agents.set(id, {
          id,
          ...req,
          created_at: now,
          updated_at: now
        })
      }
      return agents.get(id)
    })

    listAgentsMock.mockImplementation(async () => ({
      agents: Array.from(agents.values()),
      total: agents.size
    }))

    getSkillsMock.mockResolvedValue([{ id: 'artifact-refiner', enabled: true }])
    reduxSelectMock.mockResolvedValue(undefined)
    getAgentSkillsMock.mockImplementation(async (agentId: string) => agentSkillMap.get(agentId) || [])
    setAgentSkillsMock.mockImplementation(async (agentId: string, skillIds: string[]) => {
      agentSkillMap.set(agentId, skillIds)
    })
  })

  it('returns exactly one artifact-studio agent after repeated startup initialization', async () => {
    const { initializeArtifactStudioAgent } = await import(
      '@main/services/agents/services/initializeArtifactStudioAgent'
    )
    const { listAgents } = await import('../agents')

    await initializeArtifactStudioAgent()
    await initializeArtifactStudioAgent()

    const req = { query: {} } as Request
    const json = vi.fn()
    const status = vi.fn(() => ({ json }))
    const res = {
      json,
      status
    } as unknown as Response

    await listAgents(req, res)

    expect(json).toHaveBeenCalledTimes(1)
    const payload = json.mock.calls[0][0] as { data: Array<{ id: string }> }
    const artifactStudioAgents = payload.data.filter((agent) => agent.id === 'artifact-studio')

    expect(artifactStudioAgents).toHaveLength(1)
  })
})
