import { loggerService } from '@logger'
import { configManager } from '@main/services/ConfigManager'
import type { Skill, SkillStorageProviderConfig } from '@types'
import { app } from 'electron'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

import type { SkillRecord, SkillStorageProvider } from './SkillStorageProvider'
import { skillRecordToSkill } from './SkillStorageProvider'

const logger = loggerService.withContext('SkillStorageManager')

const CONFIG_KEY = 'skillStorageProviders'
const DEFAULT_PROVIDER_ID = 'local-skills-default'

/** Well-known ID for the read-only built-in skills provider */
export const BUILT_IN_PROVIDER_ID = 'built-in-skills'

/**
 * Singleton manager for skill storage providers.
 *
 * Holds a set of named, active providers and aggregates
 * skill queries across all enabled backends.
 */
export class SkillStorageManager {
  private static instance: SkillStorageManager
  private providers = new Map<string, SkillStorageProvider>()
  private configs = new Map<string, SkillStorageProviderConfig>()

  private constructor() {}

  public static getInstance(): SkillStorageManager {
    if (!SkillStorageManager.instance) {
      SkillStorageManager.instance = new SkillStorageManager()
    }
    return SkillStorageManager.instance
  }

  // ── Bootstrap ────────────────────────────────────────────────────────

  /**
   * Load persisted provider configs and initialise each one.
   * Called once on app startup.
   */
  public async bootstrap(): Promise<void> {
    // Always initialise the built-in skills provider first (read-only, bundled)
    try {
      const { BuiltInStorageProvider, BUILT_IN_PROVIDER_ID: builtInId } = await import(
        './providers/BuiltInStorageProvider'
      )
      const builtInProvider = new BuiltInStorageProvider()
      await builtInProvider.initialize()
      this.providers.set(builtInId, builtInProvider)
      // Add a synthetic config so it shows in getProviderConfigs()
      this.configs.set(builtInId, {
        id: builtInId,
        name: builtInProvider.name,
        type: 'built-in',
        enabled: true
      })
      logger.info('Built-in skills provider initialised')
    } catch (error) {
      logger.error('Failed to initialise built-in skills provider', error as Error)
    }

    const stored = (configManager.get<SkillStorageProviderConfig[]>(CONFIG_KEY) ?? []) as SkillStorageProviderConfig[]

    // Ensure the default local filesystem provider exists
    if (!stored.find((c) => c.id === DEFAULT_PROVIDER_ID)) {
      const defaultConfig = this.createDefaultProviderConfig()
      stored.push(defaultConfig)
      this.persistConfigs([...stored])
    }

    for (const config of stored) {
      this.configs.set(config.id, config)
      if (config.enabled) {
        try {
          await this.initProvider(config)
        } catch (error) {
          logger.error(`Failed to initialise provider "${config.name}" (${config.id})`, error as Error)
        }
      }
    }

    logger.info(`Bootstrapped ${this.providers.size} skill storage provider(s)`)
  }

  // ── Provider CRUD ────────────────────────────────────────────────────

  /**
   * Add a new provider configuration.
   * If `enabled`, the provider is immediately initialised.
   */
  public async addProvider(config: Omit<SkillStorageProviderConfig, 'id'>): Promise<SkillStorageProviderConfig> {
    const fullConfig: SkillStorageProviderConfig = { ...config, id: uuidv4() }
    this.configs.set(fullConfig.id, fullConfig)
    this.persistAllConfigs()

    if (fullConfig.enabled) {
      await this.initProvider(fullConfig)
    }

    logger.info(`Added provider "${fullConfig.name}" (${fullConfig.type})`)
    return fullConfig
  }

  /**
   * Update an existing provider configuration.
   * Re-initialises the provider if it was already active.
   */
  public async updateProvider(id: string, updates: Partial<SkillStorageProviderConfig>): Promise<void> {
    const existing = this.configs.get(id)
    if (!existing) {
      throw new Error(`Provider ${id} not found`)
    }

    const updated = { ...existing, ...updates, id } // id is immutable
    this.configs.set(id, updated)
    this.persistAllConfigs()

    // Re-init if running
    if (this.providers.has(id)) {
      await this.disposeProvider(id)
    }
    if (updated.enabled) {
      await this.initProvider(updated)
    }
  }

  /**
   * Remove a provider entirely.
   */
  public async removeProvider(id: string): Promise<void> {
    if (id === DEFAULT_PROVIDER_ID || id === BUILT_IN_PROVIDER_ID) {
      throw new Error('Cannot remove default or built-in providers')
    }

    await this.disposeProvider(id)
    this.configs.delete(id)
    this.persistAllConfigs()
    logger.info(`Removed provider ${id}`)
  }

  /**
   * Return all provider configurations (including disabled ones).
   */
  public getProviderConfigs(): SkillStorageProviderConfig[] {
    return Array.from(this.configs.values())
  }

  /**
   * Return a single active provider, or undefined.
   */
  public getProvider(id: string): SkillStorageProvider | undefined {
    return this.providers.get(id)
  }

  // ── Skill Aggregation ────────────────────────────────────────────────

  /**
   * Aggregate skills from every enabled provider.
   * Each skill is tagged with its provider metadata.
   */
  public async getAllSkills(enabledSkillIds: Set<string>): Promise<Skill[]> {
    const results: Skill[] = []

    logger.info(`getAllSkills called: ${this.providers.size} active provider(s), ${this.configs.size} config(s)`)

    for (const [id, provider] of this.providers) {
      const config = this.configs.get(id)
      if (!config) continue

      try {
        const records = await provider.listSkills()
        logger.info(`Provider "${config.name}" (${id}) returned ${records.length} skill(s)`)
        const isBuiltIn = id === BUILT_IN_PROVIDER_ID
        for (const record of records) {
          results.push(
            skillRecordToSkill(
              record,
              id,
              config.name,
              config.type,
              this.getBasePath(config),
              enabledSkillIds.has(record.id),
              isBuiltIn
            )
          )
        }
      } catch (error) {
        logger.error(`Failed to list skills from provider "${config.name}"`, error as Error)
      }
    }

    logger.info(`getAllSkills returning ${results.length} total skill(s)`)
    return results
  }

  /**
   * List skills from a single provider.
   */
  public async getSkillsByProvider(providerId: string, enabledSkillIds: Set<string>): Promise<Skill[]> {
    const provider = this.providers.get(providerId)
    const config = this.configs.get(providerId)
    if (!provider || !config) return []

    const records = await provider.listSkills()
    const isBuiltIn = providerId === BUILT_IN_PROVIDER_ID
    return records.map((r) =>
      skillRecordToSkill(
        r,
        providerId,
        config.name,
        config.type,
        this.getBasePath(config),
        enabledSkillIds.has(r.id),
        isBuiltIn
      )
    )
  }

  /**
   * Test connectivity of a provider configuration without persisting it.
   */
  public async testConnection(config: SkillStorageProviderConfig): Promise<boolean> {
    const provider = await this.createProviderInstance(config)
    try {
      await provider.initialize()
      if (provider.testConnection) {
        return await provider.testConnection()
      }
      // If no explicit test, try listing skills as a health check
      await provider.listSkills()
      return true
    } finally {
      await provider.dispose()
    }
  }

  /**
   * Save a skill to a specific provider.
   */
  public async saveSkillToProvider(providerId: string, skill: SkillRecord): Promise<void> {
    const provider = this.providers.get(providerId)
    if (!provider) {
      throw new Error(`Provider ${providerId} is not active`)
    }
    await provider.saveSkill(skill)
  }

  // ── Internal ─────────────────────────────────────────────────────────

  private async initProvider(config: SkillStorageProviderConfig): Promise<void> {
    const provider = await this.createProviderInstance(config)
    await provider.initialize()
    this.providers.set(config.id, provider)
    logger.info(`Initialised provider "${config.name}" (${config.type})`)
  }

  private async disposeProvider(id: string): Promise<void> {
    const provider = this.providers.get(id)
    if (provider) {
      try {
        await provider.dispose()
      } catch (error) {
        logger.warn(`Error disposing provider ${id}`, error as Error)
      }
      this.providers.delete(id)
    }
  }

  /**
   * Factory: create the correct provider subclass from a config.
   */
  private async createProviderInstance(config: SkillStorageProviderConfig): Promise<SkillStorageProvider> {
    switch (config.type) {
      case 'filesystem': {
        const { FileSystemStorageProvider } = await import('./providers/FileSystemStorageProvider')
        return new FileSystemStorageProvider(config.id, config.name, config.filesystem!.directoryPath)
      }
      case 'sqlite': {
        const { SQLiteStorageProvider } = await import('./providers/SQLiteStorageProvider')
        return new SQLiteStorageProvider(config.id, config.name, config.sqlite)
      }
      case 'postgres': {
        const { PostgresStorageProvider } = await import('./providers/PostgresStorageProvider')
        return new PostgresStorageProvider(config.id, config.name, config.postgres!)
      }
      case 'ipfs': {
        const { IPFSStorageProvider } = await import('./providers/IPFSStorageProvider')
        return new IPFSStorageProvider(config.id, config.name, config.ipfs!)
      }
      case 'built-in': {
        const { BuiltInStorageProvider } = await import('./providers/BuiltInStorageProvider')
        return new BuiltInStorageProvider()
      }
      default: {
        throw new Error(`Unknown provider type: ${config.type}`)
      }
    }
  }

  private createDefaultProviderConfig(): SkillStorageProviderConfig {
    return {
      id: DEFAULT_PROVIDER_ID,
      name: 'Local Skills',
      type: 'filesystem',
      enabled: true,
      filesystem: {
        directoryPath: path.join(app.getPath('userData'), 'skills')
      }
    }
  }

  private getBasePath(config: SkillStorageProviderConfig): string {
    if (config.type === 'filesystem' && config.filesystem) {
      return config.filesystem.directoryPath
    }
    if (config.type === 'built-in') {
      const isPackaged = !!process.resourcesPath && !process.resourcesPath.includes('node_modules')
      return isPackaged ? path.join(process.resourcesPath, 'skills') : path.join(process.cwd(), 'resources', 'skills')
    }
    return ''
  }

  private persistAllConfigs(): void {
    this.persistConfigs(Array.from(this.configs.values()))
  }

  private persistConfigs(configs: SkillStorageProviderConfig[]): void {
    configManager.set(CONFIG_KEY, configs)
  }
}
