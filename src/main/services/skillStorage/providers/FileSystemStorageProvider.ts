import { loggerService } from '@logger'
import type { SkillAssetEntry, SkillReference, SkillScript } from '@types'
import { promises as fs } from 'fs'
import matter from 'gray-matter'
import path from 'path'

import type { SkillAsset, SkillRecord, SkillStorageProvider } from '../SkillStorageProvider'

const logger = loggerService.withContext('FileSystemStorageProvider')

/**
 * Skill storage provider backed by a local filesystem directory.
 *
 * Each skill is a sub-directory containing a SKILL.md file and
 * optional scripts/, references/, and assets/ directories.
 */
export class FileSystemStorageProvider implements SkillStorageProvider {
  readonly type = 'filesystem' as const

  constructor(
    readonly id: string,
    readonly name: string,
    private readonly directoryPath: string
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    await fs.mkdir(this.directoryPath, { recursive: true })
    logger.info(`Initialised filesystem provider at ${this.directoryPath}`)
  }

  async dispose(): Promise<void> {
    // Nothing to clean up for filesystem
  }

  // ── CRUD ───────────────────────────────────────────────────────────────

  async listSkills(): Promise<SkillRecord[]> {
    try {
      logger.info(`listSkills: scanning directory ${this.directoryPath}`)
      const skills: SkillRecord[] = []
      await this.discoverSkillsRecursive(this.directoryPath, '', skills)
      logger.info(`listSkills: found ${skills.length} skill(s) in ${this.directoryPath}`)
      return skills
    } catch (error) {
      logger.error('Failed to list skills', error as Error)
      return []
    }
  }

  /**
   * Recursively discover skill directories containing SKILL.md.
   * Supports both flat layouts (skills/my-skill/SKILL.md) and nested
   * layouts (skills/category/my-skill/SKILL.md).
   *
   * When a directory contains SKILL.md it is treated as a skill and
   * its children are NOT scanned further (a skill can't nest skills).
   */
  private async discoverSkillsRecursive(currentDir: string, relativeTo: string, results: SkillRecord[]): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      // Check if entry is a directory, following symlinks
      let isDir = entry.isDirectory()
      if (!isDir && entry.isSymbolicLink()) {
        try {
          const targetStat = await fs.stat(path.join(currentDir, entry.name)) // stat follows symlinks
          isDir = targetStat.isDirectory()
        } catch {
          // Broken symlink — skip
          logger.warn(`discoverSkillsRecursive: broken symlink "${entry.name}" in ${currentDir}`)
          continue
        }
      }

      if (!isDir) continue

      const childDir = path.join(currentDir, entry.name)
      const relPath = relativeTo ? `${relativeTo}/${entry.name}` : entry.name
      const skillMdPath = path.join(childDir, 'SKILL.md')

      try {
        await fs.access(skillMdPath)
        logger.info(`discoverSkillsRecursive: found SKILL.md at ${skillMdPath}, reading as "${relPath}"`)
        // This directory contains SKILL.md → treat it as a skill
        const record = await this.readSkillDir(relPath)
        if (record) {
          logger.info(`discoverSkillsRecursive: successfully parsed skill "${record.name}" (id: ${record.id})`)
          results.push(record)
        } else {
          logger.warn(`discoverSkillsRecursive: readSkillDir returned null for "${relPath}"`)
        }
      } catch {
        // No SKILL.md here → recurse into subdirectories
        await this.discoverSkillsRecursive(childDir, relPath, results)
      }
    }
  }

  async getSkill(id: string): Promise<SkillRecord | null> {
    return this.readSkillDir(id)
  }

  async saveSkill(skill: SkillRecord): Promise<void> {
    const skillDir = path.join(this.directoryPath, skill.id)
    await fs.mkdir(skillDir, { recursive: true })

    // Build YAML frontmatter
    const frontmatter: Record<string, unknown> = {
      name: skill.name,
      description: skill.description
    }
    if (skill.tools?.length) frontmatter.tools = skill.tools
    if (skill.examples?.length) frontmatter.examples = skill.examples
    if (skill.tags?.length) frontmatter.tags = skill.tags
    if (skill.triggerPatterns?.length) frontmatter.triggerPatterns = skill.triggerPatterns
    if (skill.license) frontmatter.license = skill.license
    if (skill.compatibility) frontmatter.compatibility = skill.compatibility
    if (skill.metadata && Object.keys(skill.metadata).length) frontmatter.metadata = skill.metadata
    if (skill.allowedTools?.length) frontmatter['allowed-tools'] = skill.allowedTools.join(' ')

    const content = matter.stringify(skill.instructions, frontmatter)
    await fs.writeFile(path.join(skillDir, 'SKILL.md'), content, 'utf-8')

    // Create resource directories if there are entries
    if (skill.scripts?.length) {
      await fs.mkdir(path.join(skillDir, 'scripts'), { recursive: true })
    }
    if (skill.references?.length) {
      await fs.mkdir(path.join(skillDir, 'references'), { recursive: true })
    }
    if (skill.assets?.length) {
      await fs.mkdir(path.join(skillDir, 'assets'), { recursive: true })
    }

    logger.info(`Saved skill "${skill.name}" to ${skillDir}`)
  }

  async deleteSkill(id: string): Promise<void> {
    const skillDir = path.join(this.directoryPath, id)
    await fs.rm(skillDir, { recursive: true, force: true })
    logger.info(`Deleted skill directory: ${skillDir}`)
  }

  // ── Assets ─────────────────────────────────────────────────────────────

  async getSkillAssets(skillId: string): Promise<SkillAsset[]> {
    const skillDir = path.join(this.directoryPath, skillId)
    const assets: SkillAsset[] = []
    await this.walkDir(skillDir, skillDir, assets)
    return assets.filter((a) => a.relativePath !== 'SKILL.md')
  }

  async readAsset(skillId: string, relativePath: string): Promise<Buffer> {
    const fullPath = path.join(this.directoryPath, skillId, relativePath)
    // Security: ensure path is inside skill directory
    const resolved = path.resolve(fullPath)
    const base = path.resolve(path.join(this.directoryPath, skillId))
    if (!resolved.startsWith(base)) {
      throw new Error(`Path traversal denied: ${relativePath}`)
    }
    return fs.readFile(fullPath)
  }

  async writeAsset(skillId: string, relativePath: string, data: Buffer): Promise<void> {
    const fullPath = path.join(this.directoryPath, skillId, relativePath)
    const resolved = path.resolve(fullPath)
    const base = path.resolve(path.join(this.directoryPath, skillId))
    if (!resolved.startsWith(base)) {
      throw new Error(`Path traversal denied: ${relativePath}`)
    }
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.writeFile(fullPath, data)
  }

  async deleteAsset(skillId: string, relativePath: string): Promise<void> {
    const fullPath = path.join(this.directoryPath, skillId, relativePath)
    const resolved = path.resolve(fullPath)
    const base = path.resolve(path.join(this.directoryPath, skillId))
    if (!resolved.startsWith(base)) {
      throw new Error(`Path traversal denied: ${relativePath}`)
    }
    await fs.unlink(fullPath)
  }

  // ── Utility ────────────────────────────────────────────────────────────

  async testConnection(): Promise<boolean> {
    const stat = await fs.stat(this.directoryPath)
    return stat.isDirectory()
  }

  /** Get the underlying directory path (used by SkillService for script execution). */
  getDirectoryPath(): string {
    return this.directoryPath
  }

  // ── Internal ───────────────────────────────────────────────────────────

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

      // Discover bundled resources
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
      const entries = await fs.readdir(scriptsDir, { withFileTypes: true })
      return entries
        .filter((e) => e.isFile())
        .map((e) => ({
          name: e.name,
          path: `scripts/${e.name}`,
          language: this.inferLanguage(e.name),
          description: ''
        }))
    } catch {
      return []
    }
  }

  private async discoverReferences(skillDir: string): Promise<SkillReference[]> {
    const refsDir = path.join(skillDir, 'references')
    try {
      const entries = await fs.readdir(refsDir, { withFileTypes: true })
      return entries
        .filter((e) => e.isFile())
        .map((e) => ({
          name: e.name,
          path: `references/${e.name}`,
          description: ''
        }))
    } catch {
      return []
    }
  }

  private async discoverAssets(skillDir: string): Promise<SkillAssetEntry[]> {
    const assetsDir = path.join(skillDir, 'assets')
    try {
      const entries = await fs.readdir(assetsDir, { withFileTypes: true })
      return entries
        .filter((e) => e.isFile())
        .map((e) => ({
          name: e.name,
          path: `assets/${e.name}`,
          type: this.inferMimeType(e.name)
        }))
    } catch {
      return []
    }
  }

  private inferLanguage(filename: string): string {
    const ext = path.extname(filename).toLowerCase()
    const map: Record<string, string> = {
      '.py': 'python',
      '.sh': 'bash',
      '.bash': 'bash',
      '.js': 'javascript',
      '.ts': 'typescript',
      '.rb': 'ruby',
      '.pl': 'perl'
    }
    return map[ext] || 'unknown'
  }

  private inferMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase()
    const map: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.json': 'application/json',
      '.md': 'text/markdown',
      '.txt': 'text/plain',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
    return map[ext] || 'application/octet-stream'
  }

  private async walkDir(dir: string, baseDir: string, result: SkillAsset[]): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          await this.walkDir(fullPath, baseDir, result)
        } else {
          const stat = await fs.stat(fullPath)
          result.push({
            relativePath: path.relative(baseDir, fullPath),
            size: stat.size,
            mimeType: this.inferMimeType(entry.name)
          })
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }
  }
}
