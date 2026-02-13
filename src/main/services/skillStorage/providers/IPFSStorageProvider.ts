import { loggerService } from '@logger'

import type { SkillAsset, SkillRecord, SkillStorageProvider } from '../SkillStorageProvider'

const logger = loggerService.withContext('IPFSStorageProvider')

/**
 * IPFS-specific configuration.
 */
export interface IPFSConfig {
  /** IPFS HTTP gateway URL for reads (e.g. "http://localhost:8080") */
  gatewayUrl: string
  /** IPFS HTTP API URL for writes (e.g. "http://localhost:5001") */
  apiUrl: string
  /** Optional pinning service API key */
  pinningKey?: string
}

/**
 * Manifest stored as `_skills_index.json` in a pinned IPFS directory.
 * Maps skill IDs to their CIDs.
 */
interface SkillsIndex {
  version: 1
  skills: Record<string, { cid: string; name: string; updatedAt: string }>
}

/**
 * Skill storage provider backed by an IPFS node (Kubo HTTP API).
 *
 * Uses the Kubo HTTP RPC endpoints via native `fetch`:
 *   - /api/v0/add for writing
 *   - /api/v0/cat for reading
 *   - /api/v0/pin/add for pinning
 *
 * Skills are stored as directories containing SKILL.md and bundled resources,
 * with a root index CID tracking all skills.
 */
export class IPFSStorageProvider implements SkillStorageProvider {
  readonly type = 'ipfs' as const

  /** In-memory cache of the skills index */
  private index: SkillsIndex = { version: 1, skills: {} }
  /** CID of the current index (for updates) */
  private indexCid: string | null = null

  constructor(
    readonly id: string,
    readonly name: string,
    private readonly config: IPFSConfig
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    // Try to load the skills index
    try {
      await this.loadIndex()
    } catch {
      logger.info('No existing IPFS skills index found, starting fresh')
      this.index = { version: 1, skills: {} }
    }
    logger.info(`IPFS provider initialised (gateway: ${this.config.gatewayUrl})`)
  }

  async dispose(): Promise<void> {
    this.index = { version: 1, skills: {} }
    this.indexCid = null
  }

  // ── CRUD ───────────────────────────────────────────────────────────────

  async listSkills(): Promise<SkillRecord[]> {
    const skills: SkillRecord[] = []

    for (const [skillId, entry] of Object.entries(this.index.skills)) {
      try {
        const record = await this.fetchSkillFromCid(skillId, entry.cid)
        if (record) skills.push(record)
      } catch (error) {
        logger.warn(`Failed to fetch skill ${skillId} from IPFS`, error as Error)
      }
    }

    return skills
  }

  async getSkill(id: string): Promise<SkillRecord | null> {
    const entry = this.index.skills[id]
    if (!entry) return null
    return this.fetchSkillFromCid(id, entry.cid)
  }

  async saveSkill(skill: SkillRecord): Promise<void> {
    // Serialize the skill as a JSON blob and add to IPFS
    const skillJson = JSON.stringify(skill, null, 2)
    const cid = await this.addToIPFS(Buffer.from(skillJson, 'utf-8'), `${skill.id}.json`)

    // Pin the CID
    await this.pinCid(cid)

    // Update index
    this.index.skills[skill.id] = {
      cid,
      name: skill.name,
      updatedAt: new Date().toISOString()
    }

    // Persist the updated index
    await this.saveIndex()
    logger.info(`Saved skill "${skill.name}" to IPFS (CID: ${cid})`)
  }

  async deleteSkill(id: string): Promise<void> {
    const entry = this.index.skills[id]
    if (entry) {
      try {
        await this.unpinCid(entry.cid)
      } catch {
        // Best effort unpin
      }
    }

    delete this.index.skills[id]
    await this.saveIndex()
    logger.info(`Deleted skill ${id} from IPFS index`)
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

  async readAsset(_skillId: string, _relativePath: string): Promise<Buffer> {
    // For IPFS, assets are embedded in the JSON record
    const skill = await this.getSkill(_skillId)
    if (!skill) throw new Error(`Skill ${_skillId} not found`)

    // Assets are not stored separately in IPFS mode – the skill JSON is the
    // single source of truth. This is a simplified implementation.
    throw new Error('Direct asset reading from IPFS is not yet supported. Assets are embedded in the skill record.')
  }

  async writeAsset(_skillId: string, _relativePath: string, _data: Buffer): Promise<void> {
    throw new Error('Direct asset writing to IPFS is not yet supported. Save assets in the skill record.')
  }

  // ── Utility ────────────────────────────────────────────────────────────

  async testConnection(): Promise<boolean> {
    const resp = await fetch(`${this.config.apiUrl}/api/v0/id`, { method: 'POST' })
    if (!resp.ok) throw new Error(`IPFS node unreachable: ${resp.statusText}`)
    return true
  }

  // ── Internal ───────────────────────────────────────────────────────────

  private async loadIndex(): Promise<void> {
    // The index CID is stored locally via configManager
    // This is populated by the SkillStorageManager
    const { configManager } = await import('@main/services/ConfigManager')
    const storedCid = configManager.get<string>(`ipfs.index.${this.id}`)

    if (!storedCid) {
      throw new Error('No index CID found')
    }

    this.indexCid = storedCid
    const data = await this.catFromIPFS(storedCid)
    this.index = JSON.parse(data.toString('utf-8'))
  }

  private async saveIndex(): Promise<void> {
    const indexJson = JSON.stringify(this.index, null, 2)
    const newCid = await this.addToIPFS(Buffer.from(indexJson, 'utf-8'), '_skills_index.json')
    await this.pinCid(newCid)

    // Unpin old index
    if (this.indexCid) {
      try {
        await this.unpinCid(this.indexCid)
      } catch {
        // Best effort
      }
    }

    this.indexCid = newCid

    // Persist the index CID locally
    const { configManager } = await import('@main/services/ConfigManager')
    configManager.set(`ipfs.index.${this.id}`, newCid)
  }

  private async fetchSkillFromCid(id: string, cid: string): Promise<SkillRecord | null> {
    try {
      const data = await this.catFromIPFS(cid)
      const parsed = JSON.parse(data.toString('utf-8'))
      return { ...parsed, id } as SkillRecord
    } catch {
      return null
    }
  }

  private async addToIPFS(data: Buffer, filename: string): Promise<string> {
    const formData = new FormData()
    formData.append('file', new Blob([new Uint8Array(data)]), filename)

    const resp = await fetch(`${this.config.apiUrl}/api/v0/add?pin=false`, {
      method: 'POST',
      body: formData,
      headers: this.getAuthHeaders()
    })

    if (!resp.ok) throw new Error(`IPFS add failed: ${resp.statusText}`)

    const result = await resp.json()
    return result.Hash
  }

  private async catFromIPFS(cid: string): Promise<Buffer> {
    const resp = await fetch(`${this.config.gatewayUrl}/ipfs/${cid}`)
    if (!resp.ok) throw new Error(`IPFS cat failed for ${cid}: ${resp.statusText}`)
    const ab = await resp.arrayBuffer()
    return Buffer.from(ab)
  }

  private async pinCid(cid: string): Promise<void> {
    const resp = await fetch(`${this.config.apiUrl}/api/v0/pin/add?arg=${cid}`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    })
    if (!resp.ok) {
      logger.warn(`Failed to pin CID ${cid}: ${resp.statusText}`)
    }
  }

  private async unpinCid(cid: string): Promise<void> {
    const resp = await fetch(`${this.config.apiUrl}/api/v0/pin/rm?arg=${cid}`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    })
    if (!resp.ok) {
      logger.warn(`Failed to unpin CID ${cid}: ${resp.statusText}`)
    }
  }

  private getAuthHeaders(): Record<string, string> {
    if (this.config.pinningKey) {
      return { Authorization: `Bearer ${this.config.pinningKey}` }
    }
    return {}
  }
}
