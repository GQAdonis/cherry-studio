/**
 * Artifact Refinement Agent
 *
 * Built-in assistant configuration for artifact refinement.
 * Uses a locked-in system prompt optimized for code generation and UI refinement.
 */

import type { Assistant } from '@renderer/types'

import getArtifactRefinementPrompt from './refinementPrompt'

/**
 * System assistant ID for artifact refinement
 */
export const ARTIFACT_AGENT_ID = 'artifact-refinement-agent'

/**
 * Create the artifact refinement agent configuration
 * This is a built-in system assistant that cannot be modified by users
 */
export function createArtifactRefinementAgent(): Partial<Assistant> {
  return {
    id: ARTIFACT_AGENT_ID,
    name: 'Artifact Designer',
    type: 'system' as const,
    // The actual prompt is built dynamically based on the artifact
    prompt: '', // Will be set per-refinement
    // Note: model is set by the caller using the actual Model object
    settings: {
      // Optimized settings for code generation
      temperature: 0.4, // Lower temperature for more deterministic code
      maxTokens: 8192, // Allow longer responses for full artifact rewrites
      topP: 0.95,
      contextCount: 10, // Keep more context for refinement history
      // Enable streaming for better UX
      streamOutput: true
    }
  }
}

/**
 * Build messages array for refinement request
 */
export function buildRefinementMessages(
  artifact: {
    title: string
    type: string
    identifier: string
    content: string
    version: number
    metadata: { tailwind: boolean }
  },
  contextMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  userMessage: string
): Array<{ role: 'user' | 'assistant' | 'system'; content: string }> {
  const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = []

  // 1. System prompt with artifact refinement instructions
  messages.push({
    role: 'system',
    content: getArtifactRefinementPrompt(artifact as any)
  })

  // 2. Current artifact content as context
  messages.push({
    role: 'assistant',
    content: `I see you're working on the "${artifact.title}" artifact (${artifact.type}, v${artifact.version}). Here's the current code:\n\n\`\`\`${getLanguageFromType(artifact.type)}\n${artifact.content}\n\`\`\`\n\nHow would you like me to modify it?`
  })

  // 3. Include relevant context from original conversation (last 5 messages)
  if (contextMessages.length > 0) {
    const recentContext = contextMessages.slice(-5)
    for (const msg of recentContext) {
      messages.push({
        role: msg.role,
        content: msg.content
      })
    }
  }

  // 4. User's refinement request
  messages.push({
    role: 'user',
    content: userMessage
  })

  return messages
}

/**
 * Get language identifier for code block
 */
function getLanguageFromType(type: string): string {
  switch (type) {
    case 'html':
    case 'htmx':
      return 'html'
    case 'react':
      return 'jsx'
    case 'svg':
      return 'xml'
    case 'mermaid':
      return 'mermaid'
    case 'markdown':
      return 'markdown'
    case 'code':
      return 'javascript'
    default:
      return 'html'
  }
}

/**
 * Extract updated artifact content from AI response
 * Parses the <cs-artifact> tag from the response
 */
export function extractArtifactFromResponse(response: string): {
  content: string
  identifier?: string
  type?: string
  title?: string
} | null {
  // Match the cs-artifact tag
  const artifactRegex = /<cs-artifact\s+([^>]*)>([\s\S]*?)<\/cs-artifact>/g
  const match = artifactRegex.exec(response)

  if (!match) {
    return null
  }

  const [, attributeString, content] = match

  // Parse attributes
  const attributes: Record<string, string> = {}
  const attrRegex = /(\w+)="([^"]*)"/g
  let attrMatch

  while ((attrMatch = attrRegex.exec(attributeString)) !== null) {
    attributes[attrMatch[1]] = attrMatch[2]
  }

  return {
    content: content.trim(),
    identifier: attributes.identifier,
    type: attributes.type,
    title: attributes.title
  }
}

export default createArtifactRefinementAgent
