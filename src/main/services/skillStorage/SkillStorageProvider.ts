import type { Skill, SkillAssetEntry, SkillReference, SkillScript, SkillStorageType } from '@types'

/**
 * Internal record representation stored by each storage backend.
 * Maps to/from the renderer Skill type via SkillStorageManager.
 */
export interface SkillRecord {
  /** Unique skill identifier (directory name or UUID) */
  id: string
  /** Skill display name (from frontmatter `name`) */
  name: string
  /** What the skill does and when to use it (from frontmatter `description`) */
  description: string
  /** Full SKILL.md body (markdown instructions after frontmatter) */
  instructions: string
  /** Tools list from frontmatter */
  tools?: string[]
  /** Example utterances for semantic routing */
  examples?: string[]
  /** Categorical tags */
  tags?: string[]
  /** Regex patterns for rule-based fast-path */
  triggerPatterns?: string[]
  // agentskills.io spec optional frontmatter fields
  license?: string
  compatibility?: string
  metadata?: Record<string, string>
  /** Pre-approved tools (`allowed-tools` frontmatter) */
  allowedTools?: string[]
  /** Slash commands declared by the skill (from frontmatter `commands`) */
  commands?: Array<{ command: string; description?: string }>
  // Bundled resource manifests
  scripts?: SkillScript[]
  references?: SkillReference[]
  assets?: SkillAssetEntry[]
  // Timestamps
  createdAt?: string
  updatedAt?: string
}

/**
 * Describes a file/asset stored alongside a skill.
 */
export interface SkillAsset {
  /** Relative path within the skill (e.g. "scripts/rotate_pdf.py") */
  relativePath: string
  /** File size in bytes */
  size: number
  /** MIME type or empty string */
  mimeType: string
}

/**
 * Abstract interface for skill storage backends.
 *
 * Each implementation persists and retrieves skills from a
 * different storage medium (filesystem, database, IPFS, etc.).
 */
export interface SkillStorageProvider {
  /** Human-readable name of this provider instance */
  readonly name: string
  /** Backend type */
  readonly type: SkillStorageType
  /** Unique provider instance ID */
  readonly id: string

  // ── Lifecycle ──────────────────────────────────────────────────────────

  /** Initialise the provider (connect, run migrations, etc.). */
  initialize(): Promise<void>
  /** Release resources (close connections, etc.). */
  dispose(): Promise<void>

  // ── CRUD ───────────────────────────────────────────────────────────────

  /** List every skill in this provider. */
  listSkills(): Promise<SkillRecord[]>
  /** Retrieve a single skill by ID, or null if not found. */
  getSkill(id: string): Promise<SkillRecord | null>
  /** Create or update a skill. */
  saveSkill(skill: SkillRecord): Promise<void>
  /** Delete a skill by ID. */
  deleteSkill(id: string): Promise<void>

  // ── Assets / bundled resources ─────────────────────────────────────────

  /** List asset files for a skill. */
  getSkillAssets(skillId: string): Promise<SkillAsset[]>
  /** Read a single asset file by relative path. */
  readAsset(skillId: string, relativePath: string): Promise<Buffer>
  /** Write (create/overwrite) an asset file. */
  writeAsset(skillId: string, relativePath: string, data: Buffer): Promise<void>
  /** Delete an asset file. */
  deleteAsset?(skillId: string, relativePath: string): Promise<void>

  // ── Utility ────────────────────────────────────────────────────────────

  /**
   * Test that the provider's backing store is reachable.
   * Returns true on success, throws on failure.
   */
  testConnection?(): Promise<boolean>
}

/**
 * Convert a SkillRecord + provider metadata into a renderer Skill object.
 */
export function skillRecordToSkill(
  record: SkillRecord,
  providerId: string,
  providerName: string,
  storageType: SkillStorageType,
  /** Absolute path (filesystem providers) or empty string */
  basePath: string,
  enabled: boolean,
  /** Whether this skill comes from the built-in provider */
  builtIn?: boolean
): Skill {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    path: basePath ? `${basePath}/${record.id}` : '',
    instructions: record.instructions,
    tools: record.tools,
    enabled,
    builtIn,
    examples: record.examples,
    tags: record.tags,
    triggerPatterns: record.triggerPatterns,
    providerId,
    providerName,
    storageType,
    license: record.license,
    compatibility: record.compatibility,
    metadata: record.metadata,
    allowedTools: record.allowedTools,
    commands: record.commands,
    scripts: record.scripts,
    references: record.references,
    assets: record.assets
  }
}
