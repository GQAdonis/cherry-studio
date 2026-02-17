import { IpcChannel } from '@shared/IpcChannel'
import { ipcMain } from 'electron'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const storageManagerMock = {
  getProviderConfigs: vi.fn().mockReturnValue([{ id: 'provider-1', enabled: true }])
}

const skillServiceMock = {
  getSkills: vi.fn().mockResolvedValue([]),
  refreshSkills: vi.fn().mockResolvedValue(undefined),
  toggleSkill: vi.fn().mockResolvedValue(undefined),
  executeScript: vi.fn().mockResolvedValue('script-ok'),
  getMatchingConfig: vi.fn().mockReturnValue({}),
  setMatchingConfig: vi.fn().mockResolvedValue(undefined),
  initializeMatchingProvider: vi.fn().mockResolvedValue(undefined),
  getAgentSkills: vi.fn().mockResolvedValue(['skill-a']),
  setAgentSkills: vi.fn().mockResolvedValue(undefined),
  addSkillToAgent: vi.fn().mockResolvedValue(undefined),
  removeSkillFromAgent: vi.fn().mockResolvedValue(undefined),
  getEnabledSkillsForAgent: vi.fn().mockResolvedValue([{ id: 'skill-a', enabled: true }]),
  getStorageManager: vi.fn().mockReturnValue(storageManagerMock),
  saveSkill: vi.fn().mockResolvedValue(undefined)
}

vi.mock('../services/SkillService', () => ({
  skillService: skillServiceMock
}))

vi.mock('../services/PowerMonitorService', () => ({
  default: {
    registerShutdownHandler: vi.fn()
  }
}))

vi.mock('../services/AppUpdater', () => ({
  default: vi.fn().mockImplementation(() => ({
    setAutoUpdate: vi.fn(),
    quitAndInstall: vi.fn(),
    downloadUpdate: vi.fn(),
    cancelDownload: vi.fn()
  }))
}))

vi.mock('../services/NotificationService', () => ({
  default: vi.fn().mockImplementation(() => ({}))
}))

describe('IPC skills integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('routes skill assignment and execution handlers to SkillService', async () => {
    const { registerIpc } = await import('../ipc')
    const mainWindow = {
      isDestroyed: vi.fn().mockReturnValue(false),
      on: vi.fn(),
      reload: vi.fn(),
      webContents: {
        send: vi.fn(),
        forcefullyCrashRenderer: vi.fn()
      },
      setFullScreen: vi.fn(),
      isFullScreen: vi.fn().mockReturnValue(false)
    } as any
    const app = {
      quit: vi.fn(),
      getVersion: vi.fn().mockReturnValue('1.0.0'),
      isPackaged: false,
      getAppPath: vi.fn().mockReturnValue('/tmp/app'),
      getPath: vi.fn().mockReturnValue('/tmp')
    } as any

    await registerIpc(mainWindow, app)

    const handleCalls = vi.mocked(ipcMain.handle).mock.calls
    const getHandler = (channel: IpcChannel) => {
      const call = handleCalls.find(([registered]) => registered === channel)
      expect(call, `Missing handler for ${channel}`).toBeDefined()
      return call?.[1] as (...args: any[]) => any
    }

    await getHandler(IpcChannel.Skill_ExecuteScript)(undefined, 'agent-1', 'run.sh', ['--safe'])
    await getHandler(IpcChannel.Skill_SetAgentSkills)(undefined, 'agent-1', ['skill-a', 'skill-b'])
    await getHandler(IpcChannel.Skill_GetAgentSkills)(undefined, 'agent-1')
    await getHandler(IpcChannel.Skill_AddToAgent)(undefined, 'agent-1', 'skill-c')
    await getHandler(IpcChannel.Skill_RemoveFromAgent)(undefined, 'agent-1', 'skill-c')
    await getHandler(IpcChannel.Skill_GetEnabledForAgent)(undefined, 'agent-1')
    await getHandler(IpcChannel.SkillStorage_GetProviders)(undefined)
    await getHandler(IpcChannel.SkillCreator_SaveToProvider)(undefined, 'provider-1', { id: 'skill-new' })

    expect(skillServiceMock.executeScript).toHaveBeenCalledWith('agent-1', 'run.sh', ['--safe'])
    expect(skillServiceMock.setAgentSkills).toHaveBeenCalledWith('agent-1', ['skill-a', 'skill-b'])
    expect(skillServiceMock.getAgentSkills).toHaveBeenCalledWith('agent-1')
    expect(skillServiceMock.addSkillToAgent).toHaveBeenCalledWith('agent-1', 'skill-c')
    expect(skillServiceMock.removeSkillFromAgent).toHaveBeenCalledWith('agent-1', 'skill-c')
    expect(skillServiceMock.getEnabledSkillsForAgent).toHaveBeenCalledWith('agent-1')
    expect(storageManagerMock.getProviderConfigs).toHaveBeenCalledTimes(1)
    expect(skillServiceMock.saveSkill).toHaveBeenCalledWith('provider-1', { id: 'skill-new' })
  }, 60_000)
})
