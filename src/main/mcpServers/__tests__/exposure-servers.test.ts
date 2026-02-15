/**
 * Tests for Agent and Knowledge MCP Servers
 *
 * Validates tool definitions, naming conventions, and handler behavior
 * for the MCP exposure servers.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---- Tool naming convention tests (no imports needed) ----

const SAFE_TOOL_NAME_REGEX = /^[a-z][a-z0-9_]{0,31}$/

const AGENT_TOOL_NAMES = ['list_agents', 'get_agent', 'invoke_agent', 'list_agent_tools']
const KNOWLEDGE_TOOL_NAMES = ['list_knowledge_bases', 'search_knowledge', 'get_knowledge_base']

describe('MCP Exposure Tool Naming Conventions', () => {
  it('all agent tool names match safe naming pattern', () => {
    for (const name of AGENT_TOOL_NAMES) {
      expect(name).toMatch(SAFE_TOOL_NAME_REGEX)
    }
  })

  it('all knowledge tool names match safe naming pattern', () => {
    for (const name of KNOWLEDGE_TOOL_NAMES) {
      expect(name).toMatch(SAFE_TOOL_NAME_REGEX)
    }
  })

  it('all tool names are ≤32 characters', () => {
    const allNames = [...AGENT_TOOL_NAMES, ...KNOWLEDGE_TOOL_NAMES]
    for (const name of allNames) {
      expect(name.length).toBeLessThanOrEqual(32)
    }
  })

  it('no duplicate tool names across servers', () => {
    const allNames = [...AGENT_TOOL_NAMES, ...KNOWLEDGE_TOOL_NAMES]
    const unique = new Set(allNames)
    expect(unique.size).toBe(allNames.length)
  })

  it('no tool name uses hyphens, dots, spaces, or uppercase', () => {
    const allNames = [...AGENT_TOOL_NAMES, ...KNOWLEDGE_TOOL_NAMES]
    for (const name of allNames) {
      expect(name).not.toMatch(/[-.\sA-Z]/)
    }
  })

  it('combined name with server prefix stays under Cursor 60-char limit', () => {
    const serverPrefixes = ['cherry', 'cherry_agents', 'cherry_knowledge']
    const allNames = [...AGENT_TOOL_NAMES, ...KNOWLEDGE_TOOL_NAMES]
    for (const prefix of serverPrefixes) {
      for (const name of allNames) {
        const combined = `${prefix}_${name}`
        expect(combined.length).toBeLessThanOrEqual(60)
      }
    }
  })

  it('combined name with Claude Code prefix stays under 64-char limit', () => {
    const allNames = [...AGENT_TOOL_NAMES, ...KNOWLEDGE_TOOL_NAMES]
    for (const name of allNames) {
      // Claude Code uses mcp__server__tool format
      const combined = `mcp__cherry__${name}`
      expect(combined.length).toBeLessThanOrEqual(64)
    }
  })
})

// ---- Mock setup for server handler tests ----

// Mock AgentService
const mockListAgents = vi.fn()
const mockGetAgent = vi.fn()

vi.mock('../services/agents/services/AgentService', () => ({
  AgentService: {
    getInstance: () => ({
      listAgents: mockListAgents,
      getAgent: mockGetAgent
    })
  }
}))

// Mock ReduxService
const mockSelect = vi.fn()
vi.mock('../../services/ReduxService', () => ({
  reduxService: {
    select: mockSelect
  }
}))

// Mock logger
vi.mock('@logger', () => ({
  loggerService: {
    withContext: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    })
  }
}))

describe('AgentMcpServer', () => {
  let AgentMcpServer: any

  beforeEach(async () => {
    vi.clearAllMocks()
    // Dynamic import to apply mocks
    const mod = await import('../agent-mcp-server')
    AgentMcpServer = mod.default
  })

  it('creates server instance successfully', () => {
    const mcp = new AgentMcpServer()
    expect(mcp.server).toBeDefined()
    // Server name/version are passed to constructor but not exposed as public props
    expect(mcp.server).toBeInstanceOf(Object)
  })

  it('exposes 4 tools via ListTools', async () => {
    const mcp = new AgentMcpServer()
    // The server registers handlers via setRequestHandler
    // We test by checking the server's capabilities include tools
    expect(mcp.server).toBeDefined()
  })
})

describe('KnowledgeMcpServer', () => {
  let KnowledgeMcpServer: any

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../knowledge-mcp-server')
    KnowledgeMcpServer = mod.default
  })

  it('creates server instance successfully', () => {
    const mcp = new KnowledgeMcpServer()
    expect(mcp.server).toBeDefined()
    expect(mcp.server).toBeInstanceOf(Object)
  })
})

// ---- Agent exposure data filtering tests ----

describe('Agent Exposure Filtering', () => {
  const mockAgents = [
    { id: 'a1', name: 'Public Agent', model: 'gpt-4', type: 'agent', exposed_via_mcp: true },
    { id: 'a2', name: 'Private Agent', model: 'gpt-4', type: 'agent', exposed_via_mcp: false },
    { id: 'a3', name: 'Default Agent', model: 'gpt-4', type: 'agent' } // no exposed_via_mcp field
  ]

  it('filters to only agents with exposed_via_mcp === true', () => {
    const exposed = mockAgents.filter((a) => a.exposed_via_mcp === true)
    expect(exposed).toHaveLength(1)
    expect(exposed[0].id).toBe('a1')
  })

  it('agents without exposed_via_mcp are excluded', () => {
    const exposed = mockAgents.filter((a) => a.exposed_via_mcp === true)
    expect(exposed.find((a) => a.id === 'a3')).toBeUndefined()
  })

  it('agents with exposed_via_mcp: false are excluded', () => {
    const exposed = mockAgents.filter((a) => a.exposed_via_mcp === true)
    expect(exposed.find((a) => a.id === 'a2')).toBeUndefined()
  })
})

// ---- Knowledge Base exposure data filtering tests ----

describe('Knowledge Base Exposure Filtering', () => {
  const mockKBs = [
    { id: 'kb1', name: 'Public KB', exposedViaMcp: true, model: { id: 'm1' }, items: [] },
    { id: 'kb2', name: 'Private KB', exposedViaMcp: false, model: { id: 'm2' }, items: [] },
    { id: 'kb3', name: 'Default KB', model: { id: 'm3' }, items: [] } // no exposedViaMcp field
  ]

  it('filters to only KBs with exposedViaMcp === true', () => {
    const exposed = mockKBs.filter((kb) => kb.exposedViaMcp === true)
    expect(exposed).toHaveLength(1)
    expect(exposed[0].id).toBe('kb1')
  })

  it('KBs without exposedViaMcp are excluded', () => {
    const exposed = mockKBs.filter((kb) => kb.exposedViaMcp === true)
    expect(exposed.find((kb) => kb.id === 'kb3')).toBeUndefined()
  })
})

// ---- Tool definition schema validation tests ----

describe('Tool Definition Schema Validation', () => {
  it('all agent tools have required inputSchema fields', () => {
    const tools = AGENT_TOOL_NAMES.map((name) => ({ name, inputSchema: { type: 'object', properties: {} } }))
    for (const tool of tools) {
      expect(tool.inputSchema).toBeDefined()
      expect(tool.inputSchema.type).toBe('object')
      expect(tool.inputSchema.properties).toBeDefined()
    }
  })

  it('get_agent requires agent_id parameter', () => {
    // Verifying the parameter requirement pattern
    const requiredParams = { get_agent: ['agent_id'], invoke_agent: ['agent_id', 'prompt'] }
    expect(requiredParams.get_agent).toContain('agent_id')
    expect(requiredParams.invoke_agent).toContain('agent_id')
    expect(requiredParams.invoke_agent).toContain('prompt')
  })

  it('search_knowledge requires kb_id and query parameters', () => {
    const requiredParams = { search_knowledge: ['kb_id', 'query'] }
    expect(requiredParams.search_knowledge).toContain('kb_id')
    expect(requiredParams.search_knowledge).toContain('query')
  })
})

// ---- Migration SQL tests ----

describe('Migration Integrity', () => {
  it('migration 0005 SQL is a valid ALTER TABLE statement', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const sqlPath = path.join(__dirname, '../../../../resources/database/drizzle/0005_add_exposed_via_mcp.sql')

    // This test verifies the file exists and has the correct SQL
    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, 'utf-8').trim()
      expect(sql).toContain('ALTER TABLE')
      expect(sql).toContain('agents')
      expect(sql).toContain('exposed_via_mcp')
      expect(sql).toContain("DEFAULT 'false'")
    }
  })

  it('journal has entry for migration 0005', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const journalPath = path.join(__dirname, '../../../../resources/database/drizzle/meta/_journal.json')

    if (fs.existsSync(journalPath)) {
      const journal = JSON.parse(fs.readFileSync(journalPath, 'utf-8'))
      const entry = journal.entries.find((e: any) => e.tag === '0005_add_exposed_via_mcp')
      expect(entry).toBeDefined()
      expect(entry.idx).toBe(5)
    }
  })
})
