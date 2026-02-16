import { describe, expect, it, vi } from 'vitest'

import { createScriptExecutionTool } from '../ScriptExecutionTool'

describe('ScriptExecutionTool integration', () => {
  it('routes execution through the typed preload skill API', async () => {
    const executeScriptMock = vi.fn().mockResolvedValue('ok')
    vi.stubGlobal('api', {
      ...window.api,
      skill: {
        ...window.api?.skill,
        executeScript: executeScriptMock
      }
    })
    window.api = globalThis.api as typeof window.api

    const toolDef = createScriptExecutionTool('skill-123') as any
    const result = await toolDef.execute({ scriptName: 'run.sh', args: ['--dry-run'] })

    expect(executeScriptMock).toHaveBeenCalledWith('skill-123', 'run.sh', ['--dry-run'])
    expect(result).toEqual({
      success: true,
      output: 'ok'
    })
  })

  it('passes an empty args array when args are omitted', async () => {
    const executeScriptMock = vi.fn().mockResolvedValue('ok')
    vi.stubGlobal('api', {
      ...window.api,
      skill: {
        ...window.api?.skill,
        executeScript: executeScriptMock
      }
    })
    window.api = globalThis.api as typeof window.api

    const toolDef = createScriptExecutionTool('skill-123') as any
    await toolDef.execute({ scriptName: 'run.sh' })

    expect(executeScriptMock).toHaveBeenCalledWith('skill-123', 'run.sh', [])
  })

  it('returns controlled errors when script execution fails', async () => {
    const executeScriptMock = vi.fn().mockRejectedValue(new Error('script failed'))
    vi.stubGlobal('api', {
      ...window.api,
      skill: {
        ...window.api?.skill,
        executeScript: executeScriptMock
      }
    })
    window.api = globalThis.api as typeof window.api

    const toolDef = createScriptExecutionTool('skill-123') as any
    const result = await toolDef.execute({ scriptName: 'run.sh', args: [] })

    expect(result).toEqual({
      success: false,
      error: 'script failed'
    })
  })

  it('stringifies unknown errors when script execution throws non-Error values', async () => {
    const executeScriptMock = vi.fn().mockRejectedValue('bad failure')
    vi.stubGlobal('api', {
      ...window.api,
      skill: {
        ...window.api?.skill,
        executeScript: executeScriptMock
      }
    })
    window.api = globalThis.api as typeof window.api

    const toolDef = createScriptExecutionTool('skill-123') as any
    const result = await toolDef.execute({ scriptName: 'run.sh', args: [] })

    expect(result).toEqual({
      success: false,
      error: 'bad failure'
    })
  })
})
