import { loggerService } from '@logger'
import { DatabaseManager } from '@main/services/agents/database/DatabaseManager'
import { skillsStorageTable } from '@main/services/agents/database/schema/skills_storage.schema'
import { eq } from 'drizzle-orm'

import type { SkillAsset, SkillRecord, SkillStorageProvider } from '../SkillStorageProvider'

const logger = loggerService.withContext('SQLiteStorageProvider')

/**
 * Skill storage provider backed by the local SQLite database.
 *
 * Re-uses the existing DatabaseManager (agents.db) and stores
 * skills in the `skills_storage` table.
 */
export class SQLiteStorageProvider implements SkillStorageProvider {
  readonly type = 'sqlite' as const

  private dbManager: DatabaseManager | null = null

  constructor(
    readonly id: string,
    readonly name: string,
    _config?: { useDefault: boolean; dbPath?: string }
  ) {
    // Config is reserved for future use (custom db path)
    void _config
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    this.dbManager = await DatabaseManager.getInstance()
    logger.info('SQLite skill storage provider initialised')
  }

  async dispose(): Promise<void> {
    // We do NOT close the shared DatabaseManager here –
    // it's a singleton shared by the rest of the app.
    this.dbManager = null
  }

  // ── CRUD ───────────────────────────────────────────────────────────────

  async listSkills(): Promise<SkillRecord[]> {
    const db = this.getDb()
    const rows = await db.select().from(skillsStorageTable)
    return rows.map((row) => this.rowToRecord(row))
  }

  async getSkill(id: string): Promise<SkillRecord | null> {
    const db = this.getDb()
    const rows = await db.select().from(skillsStorageTable).where(eq(skillsStorageTable.id, id)).limit(1)
    return rows.length ? this.rowToRecord(rows[0]) : null
  }

  async saveSkill(skill: SkillRecord): Promise<void> {
    const db = this.getDb()
    const now = new Date().toISOString()

    const row = {
      id: skill.id,
      name: skill.name,
      description: skill.description,
      instructions: skill.instructions,
      tools: skill.tools ? JSON.stringify(skill.tools) : null,
      examples: skill.examples ? JSON.stringify(skill.examples) : null,
      tags: skill.tags ? JSON.stringify(skill.tags) : null,
      trigger_patterns: skill.triggerPatterns ? JSON.stringify(skill.triggerPatterns) : null,
      license: skill.license ?? null,
      compatibility: skill.compatibility ?? null,
      metadata: skill.metadata ? JSON.stringify(skill.metadata) : null,
      allowed_tools: skill.allowedTools ? JSON.stringify(skill.allowedTools) : null,
      scripts: skill.scripts ? JSON.stringify(skill.scripts) : null,
      references: skill.references ? JSON.stringify(skill.references) : null,
      assets: skill.assets ? JSON.stringify(skill.assets) : null,
      asset_data: null,
      created_at: skill.createdAt ?? now,
      updated_at: now
    }

    await db
      .insert(skillsStorageTable)
      .values(row)
      .onConflictDoUpdate({
        target: skillsStorageTable.id,
        set: { ...row, created_at: undefined! }
      })

    logger.info(`Saved skill "${skill.name}" to SQLite`)
  }

  async deleteSkill(id: string): Promise<void> {
    const db = this.getDb()
    await db.delete(skillsStorageTable).where(eq(skillsStorageTable.id, id))
    logger.info(`Deleted skill ${id} from SQLite`)
  }

  // ── Assets ─────────────────────────────────────────────────────────────

  async getSkillAssets(skillId: string): Promise<SkillAsset[]> {
    const skill = await this.getSkill(skillId)
    if (!skill) return []

    const assets: SkillAsset[] = []
    if (skill.scripts) {
      for (const s of skill.scripts) {
        assets.push({ relativePath: s.path, size: 0, mimeType: 'text/plain' })
      }
    }
    if (skill.references) {
      for (const r of skill.references) {
        assets.push({ relativePath: r.path, size: 0, mimeType: 'text/markdown' })
      }
    }
    if (skill.assets) {
      for (const a of skill.assets) {
        assets.push({ relativePath: a.path, size: 0, mimeType: a.type })
      }
    }
    return assets
  }

  async readAsset(skillId: string, relativePath: string): Promise<Buffer> {
    const db = this.getDb()
    const rows = await db.select().from(skillsStorageTable).where(eq(skillsStorageTable.id, skillId)).limit(1)

    if (!rows.length || !rows[0].asset_data) {
      throw new Error(`Asset ${relativePath} not found for skill ${skillId}`)
    }

    const assetMap = JSON.parse(rows[0].asset_data) as Record<string, string>
    const b64 = assetMap[relativePath]
    if (!b64) {
      throw new Error(`Asset ${relativePath} not found for skill ${skillId}`)
    }

    return Buffer.from(b64, 'base64')
  }

  async writeAsset(skillId: string, relativePath: string, data: Buffer): Promise<void> {
    const db = this.getDb()
    const rows = await db.select().from(skillsStorageTable).where(eq(skillsStorageTable.id, skillId)).limit(1)

    if (!rows.length) {
      throw new Error(`Skill ${skillId} not found`)
    }

    const assetMap: Record<string, string> = rows[0].asset_data ? JSON.parse(rows[0].asset_data) : {}
    assetMap[relativePath] = data.toString('base64')

    await db
      .update(skillsStorageTable)
      .set({
        asset_data: JSON.stringify(assetMap),
        updated_at: new Date().toISOString()
      })
      .where(eq(skillsStorageTable.id, skillId))
  }

  async deleteAsset(skillId: string, relativePath: string): Promise<void> {
    const db = this.getDb()
    const rows = await db.select().from(skillsStorageTable).where(eq(skillsStorageTable.id, skillId)).limit(1)

    if (!rows.length || !rows[0].asset_data) return

    const assetMap: Record<string, string> = JSON.parse(rows[0].asset_data)
    delete assetMap[relativePath]

    await db
      .update(skillsStorageTable)
      .set({
        asset_data: JSON.stringify(assetMap),
        updated_at: new Date().toISOString()
      })
      .where(eq(skillsStorageTable.id, skillId))
  }

  // ── Utility ────────────────────────────────────────────────────────────

  async testConnection(): Promise<boolean> {
    const db = this.getDb()
    await db.select().from(skillsStorageTable).limit(1)
    return true
  }

  // ── Internal ───────────────────────────────────────────────────────────

  private getDb() {
    if (!this.dbManager) {
      throw new Error('SQLiteStorageProvider not initialised')
    }
    return this.dbManager.getDatabase()
  }

  private rowToRecord(row: typeof skillsStorageTable.$inferSelect): SkillRecord {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      instructions: row.instructions,
      tools: row.tools ? JSON.parse(row.tools) : undefined,
      examples: row.examples ? JSON.parse(row.examples) : undefined,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      triggerPatterns: row.trigger_patterns ? JSON.parse(row.trigger_patterns) : undefined,
      license: row.license ?? undefined,
      compatibility: row.compatibility ?? undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      allowedTools: row.allowed_tools ? JSON.parse(row.allowed_tools) : undefined,
      scripts: row.scripts ? JSON.parse(row.scripts) : undefined,
      references: row.references ? JSON.parse(row.references) : undefined,
      assets: row.assets ? JSON.parse(row.assets) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }
}
