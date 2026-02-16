import { loggerService } from '@logger'
import type { SkillAssetEntry, SkillReference, SkillScript, SkillStorageType } from '@types'
import fs from 'fs/promises'
import matter from 'gray-matter'
import path from 'path'

import type { SkillAsset, SkillRecord, SkillStorageProvider } from '../SkillStorageProvider'

const logger = loggerService.withContext('BuiltInStorageProvider')

export const BUILT_IN_PROVIDER_ID = 'built-in-skills'
export const BUILT_IN_PROVIDER_NAME = 'Built-in Skills'

/**
 * Read-only provider that loads bundled skills from `resources/skills/`
 * inside the packaged application.
 */
export class BuiltInStorageProvider implements SkillStorageProvider {
  readonly id = BUILT_IN_PROVIDER_ID
  readonly name = BUILT_IN_PROVIDER_NAME
  readonly type: SkillStorageType = 'built-in'

  private directoryPath: string

  constructor() {
    // In packaged app, resources are in process.resourcesPath
    // In dev, they are in the project root's resources/ directory
    const isPackaged = !!process.resourcesPath && !process.resourcesPath.includes('node_modules')
    this.directoryPath = isPackaged
      ? path.join(process.resourcesPath, 'skills')
      : path.join(process.cwd(), 'resources', 'skills')
  }

  async initialize(): Promise<void> {
    try {
      await fs.access(this.directoryPath)
      logger.info(`Initialised built-in provider at ${this.directoryPath}`)
    } catch {
      logger.warn(`Built-in skills directory not found at ${this.directoryPath}`)
    }
  }

  async dispose(): Promise<void> {
    // No-op: read-only provider with no connections to release
  }

  async listSkills(): Promise<SkillRecord[]> {
    try {
      await fs.access(this.directoryPath)
    } catch {
      logger.debug('Built-in skills directory does not exist, returning empty list')
      return []
    }

    const entries = await fs.readdir(this.directoryPath, { withFileTypes: true })
    const skills: SkillRecord[] = []

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const record = await this.readSkillDir(entry.name)
      if (record) {
        skills.push(record)
      }
    }

    logger.info(`Built-in provider returned ${skills.length} skill(s)`)
    return skills
  }

  async getSkill(id: string): Promise<SkillRecord | null> {
    return this.readSkillDir(id)
  }

  // ── Write operations (all read-only) ────────────────────────────────

  async saveSkill(): Promise<void> {
    throw new Error('Built-in skills are read-only and cannot be modified')
  }

  async deleteSkill(): Promise<void> {
    throw new Error('Built-in skills are read-only and cannot be deleted')
  }

  async writeAsset(): Promise<void> {
    throw new Error('Built-in skill assets are read-only and cannot be modified')
  }

  async deleteAsset(): Promise<void> {
    throw new Error('Built-in skill assets are read-only and cannot be deleted')
  }

  // ── Asset reading ───────────────────────────────────────────────────

  async getSkillAssets(skillId: string): Promise<SkillAsset[]> {
    const assetsDir = path.join(this.directoryPath, skillId, 'assets')
    try {
      await fs.access(assetsDir)
    } catch {
      return []
    }

    return this.walkDir(assetsDir, assetsDir)
  }

  async readAsset(skillId: string, relativePath: string): Promise<Buffer> {
    const fullPath = path.join(this.directoryPath, skillId, relativePath)
    return fs.readFile(fullPath)
  }

  // ── Internal ────────────────────────────────────────────────────────

  private async readSkillDir(dirName: string): Promise<SkillRecord | null> {
    const skillDir = path.join(this.directoryPath, dirName)
    const skillMdPath = path.join(skillDir, 'SKILL.md')

    try {
      const raw = await fs.readFile(skillMdPath, 'utf-8')
      const { data, content: instructions } = matter(raw)

      // Parse allowed-tools (space-delimited string → array)
      let allowedTools: string[] | undefined
      const rawAllowed = data['allowed-tools']
      if (typeof rawAllowed === 'string') {
        allowedTools = rawAllowed
          .split(/\s+/)
          .map((t: string) => t.trim())
          .filter(Boolean)
      }

      // Parse commands (slash commands declared by the skill)
      let commands: Array<{ command: string; description?: string }> | undefined
      if (Array.isArray(data.commands)) {
        commands = data.commands.map((cmd: any) => ({
          command: typeof cmd === 'string' ? cmd : cmd.command,
          description: typeof cmd === 'object' ? cmd.description : undefined
        }))
      }

      // Discover bundled resource directories
      const scripts = await this.discoverScripts(skillDir)
      const references = await this.discoverReferences(skillDir)
      const assets = await this.discoverAssets(skillDir)

      return {
        id: dirName,
        name: data.name || dirName,
        description: data.description || '',
        instructions: instructions.trim(),
        tools: Array.isArray(data.tools) ? data.tools : [],
        examples: Array.isArray(data.examples) ? data.examples : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        triggerPatterns: Array.isArray(data.triggerPatterns) ? data.triggerPatterns : [],
        license: data.license,
        compatibility: data.compatibility,
        metadata: typeof data.metadata === 'object' && data.metadata !== null ? data.metadata : undefined,
        allowedTools,
        commands,
        scripts: scripts.length ? scripts : undefined,
        references: references.length ? references : undefined,
        assets: assets.length ? assets : undefined
      }
    } catch (error) {
      logger.warn(
        `readSkillDir: failed to parse "${dirName}": ${error instanceof Error ? error.message : String(error)}`
      )
      return null
    }
  }

  private async discoverScripts(skillDir: string): Promise<SkillScript[]> {
    const scriptsDir = path.join(skillDir, 'scripts')
    try {
      await fs.access(scriptsDir)
    } catch {
      return []
    }

    const entries = await fs.readdir(scriptsDir)
    return entries.map((name) => ({
      name,
      path: `scripts/${name}`,
      language: path.extname(name).slice(1) || 'unknown',
      description: ''
    }))
  }

  private async discoverReferences(skillDir: string): Promise<SkillReference[]> {
    const refsDir = path.join(skillDir, 'references')
    try {
      await fs.access(refsDir)
    } catch {
      return []
    }

    const result: SkillReference[] = []
    await this.walkReferences(refsDir, refsDir, result)
    return result
  }

  private async walkReferences(baseDir: string, currentDir: string, result: SkillReference[]): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        await this.walkReferences(baseDir, fullPath, result)
      } else {
        const relativePath = path.relative(baseDir, fullPath)
        result.push({
          name: entry.name,
          path: `references/${relativePath}`,
          description: ''
        })
      }
    }
  }

  private async discoverAssets(skillDir: string): Promise<SkillAssetEntry[]> {
    const assetsDir = path.join(skillDir, 'assets')
    try {
      await fs.access(assetsDir)
    } catch {
      return []
    }

    const result: SkillAssetEntry[] = []
    await this.walkAssets(assetsDir, assetsDir, result)
    return result
  }

  private async walkAssets(baseDir: string, currentDir: string, result: SkillAssetEntry[]): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        await this.walkAssets(baseDir, fullPath, result)
      } else {
        const relativePath = path.relative(baseDir, fullPath)
        result.push({
          name: entry.name,
          path: `assets/${relativePath}`,
          type: path.extname(entry.name).slice(1) || 'unknown'
        })
      }
    }
  }

  private async walkDir(baseDir: string, currentDir: string): Promise<SkillAsset[]> {
    const results: SkillAsset[] = []
    const entries = await fs.readdir(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        results.push(...(await this.walkDir(baseDir, fullPath)))
      } else {
        const stat = await fs.stat(fullPath)
        results.push({
          relativePath: path.relative(baseDir, fullPath),
          size: stat.size,
          mimeType: ''
        })
      }
    }

    return results
  }
}
