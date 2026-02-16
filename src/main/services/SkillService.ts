import { loggerService } from '@logger'
import { configManager } from '@main/services/ConfigManager'
import type { Skill, SkillMatchingConfig } from '@types'
import { spawn } from 'child_process'
import { app, dialog } from 'electron'
import path from 'path'

import { createSkillMatchingProvider, DEFAULT_SKILL_MATCHING_CONFIG, type SkillMatchingProvider } from './skillMatching'
import type { SkillRecord } from './skillStorage'
import { SkillStorageManager } from './skillStorage'

const logger = loggerService.withContext('SkillService')

export class SkillService {
  private static instance: SkillService
  private _skillsPath?: string
  private matchingProvider: SkillMatchingProvider | null = null
  private storageManager: SkillStorageManager

  private get skillsPath(): string {
    if (!this._skillsPath) {
      this._skillsPath = path.join(app.getPath('userData'), 'skills')
    }
    return this._skillsPath
  }

  private constructor() {
    this.storageManager = SkillStorageManager.getInstance()
    // Defer init to avoid accessing app.getPath before app is ready
  }

  public static getInstance(): SkillService {
    if (!SkillService.instance) {
      SkillService.instance = new SkillService()
    }
    return SkillService.instance
  }

  /**
   * Initialize the skill service.
   * MUST be called after app.whenReady() to ensure app.getPath() is available.
   */
  public async initialize(): Promise<void> {
    try {
      // Bootstrap storage providers (registers built-in provider and loads configs)
      await this.storageManager.bootstrap()
      logger.info('SkillService initialized')
    } catch (error) {
      logger.error('Failed to initialize SkillService:', error as Error)
    }
  }

  /**
   * Get the skills directory path (legacy, for the default local provider).
   */
  public getSkillsPath(): string {
    return this.skillsPath
  }

  /**
   * Get the storage manager for provider management.
   */
  public getStorageManager(): SkillStorageManager {
    return this.storageManager
  }

  /**
   * Aggregate skills from all enabled storage providers.
   */
  public async getSkills(): Promise<Skill[]> {
    try {
      const enabledSkills = new Set((configManager.get('enabledSkills') as string[]) || [])
      return await this.storageManager.getAllSkills(enabledSkills)
    } catch (error) {
      logger.error('Failed to get skills', error as Error)
      return []
    }
  }

  public async refreshSkills(): Promise<Skill[]> {
    const skills = await this.getSkills()

    // Notify the matching provider that skills have changed
    if (this.matchingProvider) {
      try {
        await this.matchingProvider.onSkillsChanged?.(skills)
      } catch (error) {
        logger.error('Failed to notify matching provider of skill changes', error as Error)
      }
    }

    return skills
  }

  public async toggleSkill(id: string, enabled: boolean): Promise<void> {
    const enabledSkills = new Set((configManager.get('enabledSkills') as string[]) || [])
    if (enabled) {
      enabledSkills.add(id)
    } else {
      enabledSkills.delete(id)
    }
    configManager.set('enabledSkills', Array.from(enabledSkills))
  }

  /**
   * Save a skill to a specific storage provider.
   */
  public async saveSkill(providerId: string, skill: SkillRecord): Promise<void> {
    await this.storageManager.saveSkillToProvider(providerId, skill)
  }

  /**
   * Get the current skill matching configuration from settings.
   */
  public getMatchingConfig(): SkillMatchingConfig {
    const stored = configManager.get('skillMatchingConfig') as Partial<SkillMatchingConfig> | undefined
    return { ...DEFAULT_SKILL_MATCHING_CONFIG, ...stored }
  }

  /**
   * Update the skill matching configuration.
   */
  public setMatchingConfig(config: Partial<SkillMatchingConfig>): void {
    const current = this.getMatchingConfig()
    const updated = { ...current, ...config }
    configManager.set('skillMatchingConfig', updated)
  }

  /**
   * Initialize or re-initialize the skill matching provider based on current config.
   */
  public async initializeMatchingProvider(): Promise<void> {
    // Dispose previous provider if any
    if (this.matchingProvider) {
      await this.matchingProvider.dispose?.()
      this.matchingProvider = null
    }

    const config = this.getMatchingConfig()

    this.matchingProvider = createSkillMatchingProvider({
      config,
      skillsDir: this.skillsPath
    })

    if (this.matchingProvider) {
      const skills = await this.getSkills()
      try {
        await this.matchingProvider.initialize(skills)
        logger.info(`Skill matching provider initialized: ${this.matchingProvider.name}`)
      } catch (error) {
        logger.error('Failed to initialize skill matching provider', error as Error)
        this.matchingProvider = null
      }
    }
  }

  /**
   * Get the current matching provider (if initialized).
   */
  public getMatchingProvider(): SkillMatchingProvider | null {
    return this.matchingProvider
  }

  /**
   * Get skills associated with a specific agent.
   * @param agentId - The agent ID
   * @returns Array of skill IDs associated with the agent
   */
  public async getAgentSkills(agentId: string): Promise<string[]> {
    try {
      const agentSkills = (configManager.get(`agentSkills.${agentId}`) as string[]) || []
      return agentSkills
    } catch (error) {
      logger.error(`Failed to get skills for agent ${agentId}`, error as Error)
      return []
    }
  }

  /**
   * Set skills for a specific agent.
   * @param agentId - The agent ID
   * @param skillIds - Array of skill IDs to associate with the agent
   */
  public async setAgentSkills(agentId: string, skillIds: string[]): Promise<void> {
    try {
      configManager.set(`agentSkills.${agentId}`, skillIds)
      logger.info(`Updated skills for agent ${agentId}`, { skillIds })
    } catch (error) {
      logger.error(`Failed to set skills for agent ${agentId}`, error as Error)
      throw error
    }
  }

  /**
   * Add a skill to an agent.
   * @param agentId - The agent ID
   * @param skillId - The skill ID to add
   */
  public async addSkillToAgent(agentId: string, skillId: string): Promise<void> {
    const currentSkills = await this.getAgentSkills(agentId)
    if (!currentSkills.includes(skillId)) {
      await this.setAgentSkills(agentId, [...currentSkills, skillId])
    }
  }

  /**
   * Remove a skill from an agent.
   * @param agentId - The agent ID
   * @param skillId - The skill ID to remove
   */
  public async removeSkillFromAgent(agentId: string, skillId: string): Promise<void> {
    const currentSkills = await this.getAgentSkills(agentId)
    await this.setAgentSkills(
      agentId,
      currentSkills.filter((id) => id !== skillId)
    )
  }

  /**
   * Get enabled skills for an agent (intersection of agent skills and globally enabled skills).
   * @param agentId - The agent ID
   * @returns Array of Skill objects that are both associated with the agent and globally enabled
   */
  public async getEnabledSkillsForAgent(agentId: string): Promise<Skill[]> {
    const allSkills = await this.getSkills()
    const configuredAgentSkills = configManager.get(`agentSkills.${agentId}`) as string[] | undefined

    // Backward-compatibility: if no per-agent mapping exists yet, use all globally enabled skills.
    if (!Array.isArray(configuredAgentSkills)) {
      return allSkills.filter((skill) => skill.enabled)
    }

    return allSkills.filter((skill) => configuredAgentSkills.includes(skill.id) && skill.enabled)
  }

  public async executeScript(skillId: string, scriptName: string, args: string[]): Promise<string> {
    const skills = await this.getSkills()
    const skill = skills.find((s) => s.id === skillId)
    if (!skill) {
      throw new Error(`Skill ${skillId} not found`)
    }

    // Script execution only works for filesystem-backed skills
    if (!skill.path) {
      throw new Error(`Script execution requires a filesystem-backed skill`)
    }

    const scriptPath = path.join(skill.path, scriptName)

    // Security check: ensure script is inside the skill directory
    if (!scriptPath.startsWith(skill.path)) {
      throw new Error(`Invalid script path: ${scriptPath}`)
    }

    // Permission check
    const { response } = await dialog.showMessageBox({
      type: 'question',
      title: 'Skill Script Execution',
      message: `The skill "${skill.name}" wants to execute a script:\n${scriptName}\n\nArguments: ${args.join(' ')}`,
      buttons: ['Allow', 'Deny'],
      defaultId: 1,
      cancelId: 1
    })

    if (response !== 0) {
      throw new Error('User denied script execution')
    }

    return new Promise((resolve, reject) => {
      const child = spawn(scriptPath, args, { cwd: skill.path, shell: true })
      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout)
        } else {
          reject(new Error(`Script exited with code ${code}\nStderr: ${stderr}`))
        }
      })

      child.on('error', (err) => {
        reject(err)
      })
    })
  }
}

export const skillService = SkillService.getInstance()
