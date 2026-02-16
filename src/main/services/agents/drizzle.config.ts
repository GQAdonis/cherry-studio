/**
 * @deprecated Scheduled for removal in v2.0.0
 * --------------------------------------------------------------------------
 * ⚠️ NOTICE: V2 DATA&UI REFACTORING (by 0xfullex)
 * --------------------------------------------------------------------------
 * STOP: Feature PRs affecting this file are currently BLOCKED.
 * Only critical bug fixes are accepted during this migration phase.
 *
 * This file is being refactored to v2 standards.
 * Any non-critical changes will conflict with the ongoing work.
 *
 * 🔗 Context & Status:
 * - Contribution Hold: https://github.com/CherryHQ/cherry-studio/issues/10954
 * - v2 Refactor PR   : https://github.com/CherryHQ/cherry-studio/pull/10162
 * --------------------------------------------------------------------------
 */
/**
 * Drizzle Kit configuration for agents database
 */

import os from 'node:os'
import path from 'node:path'

import { defineConfig } from 'drizzle-kit'
import { app } from 'electron'

function getDbPath() {
  if (process.env.NODE_ENV === 'development') {
    return path.join(os.homedir(), '.cherrystudio', 'data', 'agents.db')
  }
  try {
    return path.join(app.getPath('userData'), 'Data', 'agents.db')
  } catch {
    // Fallback if app is not ready yet (e.g., during drizzle-kit CLI usage)
    return path.join(os.homedir(), '.cherrystudio', 'data', 'agents.db')
  }
}

export function getOldDbPath() {
  // production
  try {
    return path.join(app.getPath('userData'), 'agents.db')
  } catch {
    return path.join(os.homedir(), '.cherrystudio', 'agents.db')
  }
}

let _dbPath: string | undefined
export function getResolvedDbPath(): string {
  if (!_dbPath) {
    _dbPath = getDbPath()
  }
  return _dbPath
}

export const dbPath = getDbPath()

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/main/services/agents/database/schema/index.ts',
  out: './resources/database/drizzle',
  dbCredentials: {
    url: `file:${dbPath}`
  },
  verbose: true,
  strict: true
})
