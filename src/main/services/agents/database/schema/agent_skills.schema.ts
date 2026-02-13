/**
 * Drizzle ORM schema for agent_skills junction table
 * Links agents to their associated skills
 */

import { index, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { agentsTable } from './agents.schema'

/**
 * Junction table for many-to-many relationship between agents and skills
 */
export const agentSkillsTable = sqliteTable(
  'agent_skills',
  {
    agent_id: text('agent_id')
      .notNull()
      .references(() => agentsTable.id, { onDelete: 'cascade' }),
    skill_id: text('skill_id').notNull(), // Skill folder name/ID
    enabled: text('enabled').notNull().default('true'), // 'true' or 'false' as text for SQLite
    priority: text('priority').default('0'), // Order/priority for skill activation
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.agent_id, table.skill_id] }),
    agentIdx: index('idx_agent_skills_agent_id').on(table.agent_id),
    skillIdx: index('idx_agent_skills_skill_id').on(table.skill_id)
  })
)

export type AgentSkillRow = typeof agentSkillsTable.$inferSelect
export type InsertAgentSkillRow = typeof agentSkillsTable.$inferInsert
