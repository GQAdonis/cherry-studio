import { loggerService } from '@logger'

import type { SkillAsset, SkillRecord, SkillStorageProvider } from '../SkillStorageProvider'

const logger = loggerService.withContext('PostgresStorageProvider')

/**
 * Postgres-specific configuration.
 */
export interface PostgresConfig {
  mode: 'dsn' | 'supabase'
  dsn?: string
  supabaseUrl?: string
  supabaseAnonKey?: string
  supabaseServiceKey?: string
}

/**
 * SQL for creating the skills_storage table in Postgres.
 * Executed once on first connection using the service key.
 */
const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS skills_storage (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT NOT NULL,
  tools JSONB,
  examples JSONB,
  tags JSONB,
  trigger_patterns JSONB,
  license TEXT,
  compatibility TEXT,
  metadata JSONB,
  allowed_tools JSONB,
  scripts JSONB,
  "references" JSONB,
  assets JSONB,
  asset_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_skills_storage_name ON skills_storage (name);
`

/**
 * Skill storage provider backed by a Postgres database.
 *
 * Supports two connection modes:
 *   - DSN: raw Postgres connection string
 *   - Supabase: URL + anon key (read) + service key (write/migrate)
 */
export class PostgresStorageProvider implements SkillStorageProvider {
  readonly type = 'postgres' as const

  /** Supabase JS client (when in supabase mode) */
  private supabase: any = null
  /** node-postgres pool (when in DSN mode) */
  private pool: any = null

  constructor(
    readonly id: string,
    readonly name: string,
    private readonly config: PostgresConfig
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    if (this.config.mode === 'supabase') {
      await this.initSupabase()
    } else {
      await this.initDSN()
    }
    logger.info(`Postgres provider initialised (${this.config.mode} mode)`)
  }

  async dispose(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
    }
    this.supabase = null
  }

  // ── CRUD ───────────────────────────────────────────────────────────────

  async listSkills(): Promise<SkillRecord[]> {
    if (this.config.mode === 'supabase') {
      const { data, error } = await this.supabase.from('skills_storage').select('*')
      if (error) throw new Error(`Supabase list error: ${error.message}`)
      return (data ?? []).map((row: any) => this.rowToRecord(row))
    }

    const result = await this.pool.query('SELECT * FROM skills_storage ORDER BY name')
    return result.rows.map((row: any) => this.rowToRecord(row))
  }

  async getSkill(id: string): Promise<SkillRecord | null> {
    if (this.config.mode === 'supabase') {
      const { data, error } = await this.supabase.from('skills_storage').select('*').eq('id', id).single()
      if (error) return null
      return data ? this.rowToRecord(data) : null
    }

    const result = await this.pool.query('SELECT * FROM skills_storage WHERE id = $1', [id])
    return result.rows.length ? this.rowToRecord(result.rows[0]) : null
  }

  async saveSkill(skill: SkillRecord): Promise<void> {
    const now = new Date().toISOString()
    const row = {
      id: skill.id,
      name: skill.name,
      description: skill.description,
      instructions: skill.instructions,
      tools: skill.tools ?? null,
      examples: skill.examples ?? null,
      tags: skill.tags ?? null,
      trigger_patterns: skill.triggerPatterns ?? null,
      license: skill.license ?? null,
      compatibility: skill.compatibility ?? null,
      metadata: skill.metadata ?? null,
      allowed_tools: skill.allowedTools ?? null,
      scripts: skill.scripts ?? null,
      references: skill.references ?? null,
      assets: skill.assets ?? null,
      asset_data: null,
      created_at: skill.createdAt ?? now,
      updated_at: now
    }

    if (this.config.mode === 'supabase') {
      const { error } = await this.supabase.from('skills_storage').upsert(row, { onConflict: 'id' })
      if (error) throw new Error(`Supabase save error: ${error.message}`)
    } else {
      await this.pool.query(
        `INSERT INTO skills_storage (
          id, name, description, instructions,
          tools, examples, tags, trigger_patterns,
          license, compatibility, metadata, allowed_tools,
          scripts, "references", assets, asset_data,
          created_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
        )
        ON CONFLICT (id) DO UPDATE SET
          name=$2, description=$3, instructions=$4,
          tools=$5, examples=$6, tags=$7, trigger_patterns=$8,
          license=$9, compatibility=$10, metadata=$11, allowed_tools=$12,
          scripts=$13, "references"=$14, assets=$15, asset_data=$16,
          updated_at=$18`,
        [
          row.id,
          row.name,
          row.description,
          row.instructions,
          row.tools ? JSON.stringify(row.tools) : null,
          row.examples ? JSON.stringify(row.examples) : null,
          row.tags ? JSON.stringify(row.tags) : null,
          row.trigger_patterns ? JSON.stringify(row.trigger_patterns) : null,
          row.license,
          row.compatibility,
          row.metadata ? JSON.stringify(row.metadata) : null,
          row.allowed_tools ? JSON.stringify(row.allowed_tools) : null,
          row.scripts ? JSON.stringify(row.scripts) : null,
          row.references ? JSON.stringify(row.references) : null,
          row.assets ? JSON.stringify(row.assets) : null,
          null,
          row.created_at,
          row.updated_at
        ]
      )
    }

    logger.info(`Saved skill "${skill.name}" to Postgres`)
  }

  async deleteSkill(id: string): Promise<void> {
    if (this.config.mode === 'supabase') {
      const { error } = await this.supabase.from('skills_storage').delete().eq('id', id)
      if (error) throw new Error(`Supabase delete error: ${error.message}`)
    } else {
      await this.pool.query('DELETE FROM skills_storage WHERE id = $1', [id])
    }
    logger.info(`Deleted skill ${id} from Postgres`)
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
    let assetData: Record<string, string> | null = null

    if (this.config.mode === 'supabase') {
      const { data } = await this.supabase.from('skills_storage').select('asset_data').eq('id', skillId).single()
      assetData = data?.asset_data
    } else {
      const result = await this.pool.query('SELECT asset_data FROM skills_storage WHERE id = $1', [skillId])
      assetData = result.rows[0]?.asset_data
    }

    if (!assetData || !assetData[relativePath]) {
      throw new Error(`Asset ${relativePath} not found for skill ${skillId}`)
    }
    return Buffer.from(assetData[relativePath], 'base64')
  }

  async writeAsset(skillId: string, relativePath: string, data: Buffer): Promise<void> {
    const skill = await this.getSkill(skillId)
    if (!skill) throw new Error(`Skill ${skillId} not found`)

    // For simplicity, update the skill's asset_data column
    let currentAssetData: Record<string, string> = {}

    if (this.config.mode === 'supabase') {
      const { data: row } = await this.supabase.from('skills_storage').select('asset_data').eq('id', skillId).single()
      if (row?.asset_data) currentAssetData = row.asset_data
    } else {
      const result = await this.pool.query('SELECT asset_data FROM skills_storage WHERE id = $1', [skillId])
      if (result.rows[0]?.asset_data) currentAssetData = result.rows[0].asset_data
    }

    currentAssetData[relativePath] = data.toString('base64')

    if (this.config.mode === 'supabase') {
      await this.supabase
        .from('skills_storage')
        .update({ asset_data: currentAssetData, updated_at: new Date().toISOString() })
        .eq('id', skillId)
    } else {
      await this.pool.query('UPDATE skills_storage SET asset_data = $1, updated_at = $2 WHERE id = $3', [
        JSON.stringify(currentAssetData),
        new Date().toISOString(),
        skillId
      ])
    }
  }

  // ── Utility ────────────────────────────────────────────────────────────

  async testConnection(): Promise<boolean> {
    if (this.config.mode === 'supabase') {
      const { error } = await this.supabase.from('skills_storage').select('id').limit(1)
      if (error) throw new Error(`Connection test failed: ${error.message}`)
      return true
    }

    const result = await this.pool.query('SELECT 1')
    return result.rows.length > 0
  }

  /**
   * Run migrations to create the skills_storage table.
   * Uses the service key for Supabase, or the DSN pool directly.
   */
  async runMigrations(): Promise<void> {
    if (this.config.mode === 'supabase') {
      // Need to use the service key for DDL
      if (!this.config.supabaseServiceKey) {
        throw new Error('Supabase service key required for migrations')
      }
      const { createClient } = await import('@supabase/supabase-js')
      const adminClient = createClient(this.config.supabaseUrl!, this.config.supabaseServiceKey)
      // Execute raw SQL via RPC or directly
      const { error } = await adminClient.rpc('exec_sql', { sql: MIGRATION_SQL }).single()
      if (error) {
        // Fallback: try using the REST endpoint to create the table
        logger.warn('RPC migration failed, table may already exist', error)
      }
    } else {
      await this.pool.query(MIGRATION_SQL)
    }
    logger.info('Postgres migrations completed')
  }

  // ── Internal ───────────────────────────────────────────────────────────

  private async initSupabase(): Promise<void> {
    if (!this.config.supabaseUrl || !this.config.supabaseAnonKey) {
      throw new Error('Supabase URL and anon key are required')
    }
    const { createClient } = await import('@supabase/supabase-js')
    this.supabase = createClient(this.config.supabaseUrl, this.config.supabaseAnonKey)
  }

  private async initDSN(): Promise<void> {
    if (!this.config.dsn) {
      throw new Error('Postgres DSN is required')
    }
    const pg = await import('pg')
    this.pool = new pg.default.Pool({ connectionString: this.config.dsn })
    // Run migrations on first connect
    try {
      await this.runMigrations()
    } catch (error) {
      logger.warn('Migration may have already been applied', error as Error)
    }
  }

  private rowToRecord(row: any): SkillRecord {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      instructions: row.instructions,
      tools: row.tools ?? undefined,
      examples: row.examples ?? undefined,
      tags: row.tags ?? undefined,
      triggerPatterns: row.trigger_patterns ?? undefined,
      license: row.license ?? undefined,
      compatibility: row.compatibility ?? undefined,
      metadata: row.metadata ?? undefined,
      allowedTools: row.allowed_tools ?? undefined,
      scripts: row.scripts ?? undefined,
      references: row.references ?? undefined,
      assets: row.assets ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }
}
