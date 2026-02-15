#!/usr/bin/env tsx
/**
 * Migration Script: Convert Assistants to Agents
 *
 * This script reads legacy assistants from localStorage (via Redux persist)
 * and creates corresponding agents in the new SQLite database via the API.
 *
 * Usage:
 *   1. Make sure The Boss is running with API server enabled
 *   2. Run: npx tsx scripts/migrate-assistants-to-agents.ts
 */

import { readFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

// Configuration
const API_BASE_URL = 'http://127.0.0.1:23333'
const API_TOKEN = process.env.BOSS_API_TOKEN || 'cs-sk-c58d5e3e-2a9e-4d02-8e09-dda437784be1'
const DEFAULT_ACCESSIBLE_PATH = process.env.HOME || homedir()

// Types based on the codebase
interface Assistant {
  id: string
  name: string
  prompt: string
  type: string
  description?: string
  model?: {
    id: string
    name: string
    provider?: string
  }
  settings?: {
    temperature?: number
    contextCount?: number
    maxTokens?: number
  }
  mcpServers?: Array<{ id: string; name: string }>
  tags?: string[]
}

interface CreateAgentRequest {
  name: string
  type: 'claude-code'
  model: string
  description?: string
  instructions?: string
  accessible_paths: string[]
  mcps?: string[]
  allowed_tools?: string[]
  configuration?: {
    permission_mode?: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan'
    max_turns?: number
  }
}

// Extract assistants from redux-persist store
function getAssistantsFromStore(): Assistant[] {
  // Since we can't easily parse LevelDB in Node.js without additional tools,
  // we'll provide instructions to export the data
  console.log('📋 To export your assistants data:')
  console.log('   1. Open The Boss application')
  console.log('   2. Open DevTools (View → Toggle Developer Tools)')
  console.log('   3. Run in Console:')
  console.log('      JSON.stringify(JSON.parse(localStorage.getItem("persist:cherry-studio")).assistants)')
  console.log('   4. Copy the output and save to: assistants-export.json')
  console.log('   5. Re-run this script\n')

  // Try to read from export file
  try {
    const exportPath = join(process.cwd(), 'assistants-export.json')
    const data = JSON.parse(readFileSync(exportPath, 'utf-8'))
    const assistantsData = typeof data === 'string' ? JSON.parse(data) : data
    return assistantsData.assistants || []
  } catch (error) {
    return []
  }
}

// Convert model ID to proper format
function normalizeModelId(model: Assistant['model']): string {
  if (!model) {
    return 'openrouter:anthropic/claude-sonnet-4.5'
  }

  const modelId = model.id

  // If already in provider:model format, return as-is
  if (modelId.includes(':')) {
    return modelId
  }

  // Try to infer provider from model name
  const provider = model.provider?.toLowerCase() || 'openrouter'

  return `${provider}:${modelId}`
}

// Convert Assistant to Agent
function assistantToAgent(assistant: Assistant): CreateAgentRequest {
  return {
    name: assistant.name,
    type: 'claude-code',
    model: normalizeModelId(assistant.model),
    description: assistant.description || `Migrated from assistant: ${assistant.name}`,
    instructions: assistant.prompt || 'You are a helpful assistant.',
    accessible_paths: [DEFAULT_ACCESSIBLE_PATH],
    mcps: assistant.mcpServers?.map((s) => s.id) || [],
    allowed_tools: [],
    configuration: {
      permission_mode: 'acceptEdits',
      max_turns: 100
    }
  }
}

// Create agent via API
async function createAgent(agentData: CreateAgentRequest): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/v1/agents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(agentData)
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`Failed to create agent: ${JSON.stringify(errorData)}`)
  }

  return response.json()
}

// Main migration function
async function migrateAssistants() {
  console.log('🚀 Starting Assistant → Agent Migration\n')
  console.log('📝 Configuration:')
  console.log(`   API URL: ${API_BASE_URL}`)
  console.log(`   Default Path: ${DEFAULT_ACCESSIBLE_PATH}\n`)

  // Get assistants
  const assistants = getAssistantsFromStore()

  if (assistants.length === 0) {
    console.log('❌ No assistants found!')
    console.log('   Please follow the export instructions above.\n')
    process.exit(1)
  }

  console.log(`✅ Found ${assistants.length} assistants to migrate\n`)

  // Migrate each assistant
  let successCount = 0
  let failCount = 0

  for (const assistant of assistants) {
    try {
      console.log(`📤 Migrating: ${assistant.name}`)
      const agentData = assistantToAgent(assistant)
      console.log(`   Model: ${agentData.model}`)
      console.log(`   Type: ${agentData.type}`)

      await createAgent(agentData)

      console.log(`✅ Successfully created agent: ${assistant.name}\n`)
      successCount++
    } catch (error) {
      console.error(`❌ Failed to migrate ${assistant.name}:`, (error as Error).message)
      failCount++
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 Migration Summary')
  console.log('='.repeat(60))
  console.log(`✅ Successfully migrated: ${successCount}`)
  console.log(`❌ Failed: ${failCount}`)
  console.log(`📋 Total: ${assistants.length}`)
  console.log('='.repeat(60) + '\n')

  if (successCount > 0) {
    console.log('🎉 Migration complete!')
    console.log('   You can now access your agents via the API at:')
    console.log(`   ${API_BASE_URL}/v1/agents\n`)
  }
}

// Run migration
migrateAssistants().catch((error) => {
  console.error('💥 Migration failed:', error)
  process.exit(1)
})
