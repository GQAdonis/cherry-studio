/**
 * Drizzle ORM schema for skills_storage table.
 *
 * Stores skills in the local SQLite database as an alternative to
 * the filesystem-based storage.
 */

import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const skillsStorageTable = sqliteTable('skills_storage', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  instructions: text('instructions').notNull(),
  tools: text('tools'), // JSON array of tool names
  examples: text('examples'), // JSON array of example utterances
  tags: text('tags'), // JSON array of category tags
  trigger_patterns: text('trigger_patterns'), // JSON array of regex patterns
  license: text('license'),
  compatibility: text('compatibility'),
  metadata: text('metadata'), // JSON object of key-value pairs
  allowed_tools: text('allowed_tools'), // Space-delimited string or JSON array
  scripts: text('scripts'), // JSON array of SkillScript
  references: text('references'), // JSON array of SkillReference
  assets: text('assets'), // JSON array of SkillAssetEntry
  asset_data: text('asset_data'), // JSON map of relativePath -> base64-encoded data
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull()
})

export const skillsStorageNameIdx = index('idx_skills_storage_name').on(skillsStorageTable.name)

export type SkillStorageRow = typeof skillsStorageTable.$inferSelect
export type InsertSkillStorageRow = typeof skillsStorageTable.$inferInsert
