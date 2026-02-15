#!/usr/bin/env tsx
/**
 * Migration Script: Convert Assistants to Agents (from file)
 *
 * This script reads assistants from a pre-exported JSON file and creates
 * corresponding agents in the new SQLite database via the API.
 *
 * Usage:
 *   npx tsx scripts/migrate-from-file.ts <path-to-json>
 *   npx tsx scripts/migrate-from-file.ts /Users/gqadonis/Projects/references/converted_output.json
 */

import { readFileSync } from 'fs'
import { homedir } from 'os'

// Configuration
const API_BASE_URL = 'http://127.0.0.1:23333'
const API_TOKEN = process.env.BOSS_API_TOKEN || 'cs-sk-c58d5e3e-2a9e-4d02-8e09-dda437784be1'
const DEFAULT_ACCESSIBLE_PATH = process.env.HOME || homedir()

// Types
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

  // Try to infer provider from model name or use default
  let provider = 'openrouter'

  if (model.provider) {
    provider = model.provider.toLowerCase()
  } else if (modelId.includes('anthropic') || modelId.includes('claude')) {
    provider = 'anthropic'
  } else if (modelId.includes('openai') || modelId.includes('gpt')) {
    provider = 'openai'
  } else if (modelId.includes('google') || modelId.includes('gemini')) {
    provider = 'google'
  }

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
async function createAgent(agentData: CreateAgentRequest): Promise<any> {
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
    throw new Error(`API Error: ${JSON.stringify(errorData, null, 2)}`)
  }

  return response.json()
}

// Parse the JSON data (handle both direct assistants array or nested structure)
function parseAssistantsData(data: any): Assistant[] {
  // If data has assistants property
  if (data.assistants) {
    return Array.isArray(data.assistants) ? data.assistants : []
  }

  // If data is directly an array
  if (Array.isArray(data)) {
    return data
  }

  // Try parsing if it's a string
  if (typeof data === 'string') {
    const parsed = JSON.parse(data)
    return parseAssistantsData(parsed)
  }

  return []
}

// Main migration function
async function migrateAssistants() {
  console.log('🚀 Starting Assistant → Agent Migration\n')

  // Get file path from command line or use default
  const filePath = process.argv[2] || '/Users/gqadonis/Projects/references/converted_output.json'

  console.log('📝 Configuration:')
  console.log(`   API URL: ${API_BASE_URL}`)
  console.log(`   API Token: ${API_TOKEN.substring(0, 15)}...`)
  console.log(`   Source File: ${filePath}`)
  console.log(`   Default Path: ${DEFAULT_ACCESSIBLE_PATH}\n`)

  // Read and parse the file
  let assistants: Assistant[]
  try {
    console.log('📂 Reading file...')
    const fileContent = readFileSync(filePath, 'utf-8')
    const data = JSON.parse(fileContent)
    assistants = parseAssistantsData(data)
    console.log(`✅ Loaded ${assistants.length} assistants from file\n`)
  } catch (error: any) {
    console.error('❌ Failed to read or parse file:', error.message)
    console.error('   Make sure the file exists and contains valid JSON\n')
    process.exit(1)
  }

  if (assistants.length === 0) {
    console.log('❌ No assistants found in the file!')
    console.log('   The file should contain an "assistants" array or be an array itself\n')
    process.exit(1)
  }

  // Show preview
  console.log('📋 Preview of assistants to migrate:')
  assistants.slice(0, 5).forEach((a, i) => {
    console.log(`   ${i + 1}. ${a.name} (${a.model?.id || 'no model'})`)
  })
  if (assistants.length > 5) {
    console.log(`   ... and ${assistants.length - 5} more`)
  }
  console.log('')

  // Migrate each assistant
  let successCount = 0
  let failCount = 0
  const errors: Array<{ name: string; error: string }> = []

  for (let i = 0; i < assistants.length; i++) {
    const assistant = assistants[i]
    try {
      console.log(`📤 [${i + 1}/${assistants.length}] Migrating: ${assistant.name}`)
      const agentData = assistantToAgent(assistant)
      console.log(`   Model: ${agentData.model}`)

      const result = await createAgent(agentData)

      console.log(`✅ Created agent with ID: ${result.id}\n`)
      successCount++
    } catch (error: any) {
      console.error(`❌ Failed to migrate ${assistant.name}:`)
      console.error(`   ${error.message}\n`)
      failCount++
      errors.push({ name: assistant.name, error: error.message })
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70))
  console.log('📊 Migration Summary')
  console.log('='.repeat(70))
  console.log(`✅ Successfully migrated: ${successCount}`)
  console.log(`❌ Failed: ${failCount}`)
  console.log(`📋 Total: ${assistants.length}`)
  console.log('='.repeat(70) + '\n')

  if (errors.length > 0) {
    console.log('❌ Failed migrations:')
    errors.forEach(({ name, error }) => {
      console.log(`   - ${name}`)
      console.log(`     Error: ${error}`)
    })
    console.log('')
  }

  if (successCount > 0) {
    console.log('🎉 Migration complete!')
    console.log('   You can now access your agents via the API at:')
    console.log(`   ${API_BASE_URL}/v1/agents\n`)
    console.log('   Verify with:')
    console.log(`   curl -H "Authorization: Bearer ${API_TOKEN}" ${API_BASE_URL}/v1/agents\n`)
  }
}

// Run migration
migrateAssistants().catch((error) => {
  console.error('💥 Migration failed:', error)
  process.exit(1)
})
