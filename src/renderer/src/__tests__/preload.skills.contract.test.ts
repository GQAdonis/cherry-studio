import { IpcChannel } from '@shared/IpcChannel'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('preload skills API contract', () => {
  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('maps skill and skillCreator APIs to the expected IPC channels', async () => {
    const invoke = vi.fn().mockResolvedValue(undefined)
    const exposeInMainWorld = vi.fn()

    vi.doMock('@electron-toolkit/preload', () => ({
      electronAPI: {}
    }))

    vi.doMock('electron', () => ({
      contextBridge: { exposeInMainWorld },
      ipcRenderer: {
        invoke,
        on: vi.fn(),
        off: vi.fn(),
        removeListener: vi.fn()
      },
      shell: { openExternal: vi.fn() },
      webUtils: { getPathForFile: vi.fn() }
    }))

    ;(process as any).contextIsolated = true
    await import('../../../preload/index')

    const apiEntry = exposeInMainWorld.mock.calls.find(([name]) => name === 'api')
    expect(apiEntry).toBeDefined()
    const api = apiEntry![1]

    await api.skill.getList()
    await api.skill.toggle('skill-1', true)
    await api.skill.executeScript('skill-1', 'run.sh', ['--check'])
    await api.skillCreator.validate({ id: 'skill-1' })
    await api.skillCreator.initTemplate('skill-1')
    await api.skillCreator.saveToProvider('provider-1', { id: 'skill-1' })
    await api.skillCreator.testScript('skill-1', 'run.sh', ['--check'])

    expect(invoke).toHaveBeenCalledWith(IpcChannel.Skill_GetList)
    expect(invoke).toHaveBeenCalledWith(IpcChannel.Skill_Toggle, 'skill-1', true)
    expect(invoke).toHaveBeenCalledWith(IpcChannel.Skill_ExecuteScript, 'skill-1', 'run.sh', ['--check'])
    expect(invoke).toHaveBeenCalledWith(IpcChannel.SkillCreator_Validate, { id: 'skill-1' })
    expect(invoke).toHaveBeenCalledWith(IpcChannel.SkillCreator_InitTemplate, 'skill-1')
    expect(invoke).toHaveBeenCalledWith(IpcChannel.SkillCreator_SaveToProvider, 'provider-1', { id: 'skill-1' })
    expect(invoke).toHaveBeenCalledWith(IpcChannel.SkillCreator_TestScript, 'skill-1', 'run.sh', ['--check'])
  })
})
