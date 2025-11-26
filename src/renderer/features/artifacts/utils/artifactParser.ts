/**
 * Artifact Parser
 *
 * Parses <cs-artifact> tags from AI message content and extracts
 * artifact metadata, content, and text segments.
 */

import { nanoid } from '@reduxjs/toolkit'

import type { ArtifactMetadata, ArtifactType, ParsedArtifact, ParseResult, TextSegment } from '../types'
import { DEFAULT_ARTIFACT_METADATA, isValidArtifactType } from '../types'

/**
 * Regex pattern for matching cs-artifact tags
 * Captures: attributes, content
 */
const ARTIFACT_REGEX = /<cs-artifact\s+([^>]*)>([\s\S]*?)<\/cs-artifact>/gi

/**
 * Regex pattern for matching individual attributes
 */
const ATTRIBUTE_REGEX = /(\w+)=["']([^"']*)["']/g

/**
 * Regex pattern for detecting incomplete/streaming artifact tags
 */
const INCOMPLETE_ARTIFACT_REGEX = /<cs-artifact\s+[^>]*>(?:(?!<\/cs-artifact>)[\s\S])*$/i

/**
 * Parse all attributes from an attribute string
 */
function parseAttributes(attributeString: string): Record<string, string> {
  const attributes: Record<string, string> = {}
  let match: RegExpExecArray | null

  // Reset regex state
  ATTRIBUTE_REGEX.lastIndex = 0

  while ((match = ATTRIBUTE_REGEX.exec(attributeString)) !== null) {
    const [, key, value] = match
    attributes[key.toLowerCase()] = value
  }

  return attributes
}

/**
 * Determine artifact type from attributes
 */
function determineArtifactType(attributes: Record<string, string>): ArtifactType {
  const type = attributes.type?.toLowerCase()

  if (type && isValidArtifactType(type)) {
    return type
  }

  // Infer type from content or other attributes
  const language = attributes.language?.toLowerCase()
  if (language) {
    if (['html', 'htm'].includes(language)) return 'html'
    if (language === 'htmx') return 'htmx'
    if (['jsx', 'tsx', 'react'].includes(language)) return 'react'
    if (language === 'svg') return 'svg'
    if (language === 'mermaid') return 'mermaid'
    if (['md', 'markdown'].includes(language)) return 'markdown'
    return 'code'
  }

  // Default to html
  return 'html'
}

/**
 * Extract metadata from parsed attributes
 */
function extractMetadata(attributes: Record<string, string>): ArtifactMetadata {
  return {
    ...DEFAULT_ARTIFACT_METADATA,
    tailwind: attributes.tailwind !== 'false',
    theme: (['light', 'dark', 'auto'].includes(attributes.theme) ? attributes.theme : 'auto') as
      | 'light'
      | 'dark'
      | 'auto',
    language: attributes.language,
    framework: attributes.framework,
    dependencies: attributes.dependencies ? attributes.dependencies.split(',').map((d) => d.trim()) : [],
    customStyles: attributes.styles || attributes.css,
    width: attributes.width ? parseInt(attributes.width, 10) : undefined,
    height: attributes.height ? parseInt(attributes.height, 10) : undefined
  }
}

/**
 * Parse a single artifact match
 */
function parseArtifactMatch(
  match: RegExpExecArray,
  fullContent: string
): ParsedArtifact {
  const [fullMatch, attributeString, content] = match
  const startIndex = match.index
  const endIndex = startIndex + fullMatch.length

  const attributes = parseAttributes(attributeString)
  const type = determineArtifactType(attributes)

  return {
    identifier: attributes.identifier || attributes.id || `artifact-${nanoid(8)}`,
    type,
    title: attributes.title || attributes.name || 'Untitled Artifact',
    content: content.trim(),
    attributes,
    startIndex,
    endIndex
  }
}

/**
 * Parse message content for artifacts and return structured result
 *
 * @param content - The message content to parse
 * @returns ParseResult with artifacts and text segments
 */
export function parseArtifacts(content: string): ParseResult {
  const artifacts: ParsedArtifact[] = []
  const segments: TextSegment[] = []

  if (!content) {
    return { artifacts, segments, hasArtifacts: false }
  }

  // Reset regex state
  ARTIFACT_REGEX.lastIndex = 0

  let lastIndex = 0
  let match: RegExpExecArray | null
  let segmentIndex = 0

  while ((match = ARTIFACT_REGEX.exec(content)) !== null) {
    // Add text segment before this artifact
    if (match.index > lastIndex) {
      const textContent = content.slice(lastIndex, match.index)
      if (textContent.trim()) {
        segments.push({
          type: 'text',
          content: textContent,
          index: segmentIndex++
        })
      }
    }

    // Parse and add artifact
    const artifact = parseArtifactMatch(match, content)
    artifacts.push(artifact)

    // Add artifact segment
    segments.push({
      type: 'artifact',
      content: '',
      artifact,
      index: segmentIndex++
    })

    lastIndex = artifact.endIndex
  }

  // Add remaining text after last artifact
  if (lastIndex < content.length) {
    const textContent = content.slice(lastIndex)
    if (textContent.trim()) {
      segments.push({
        type: 'text',
        content: textContent,
        index: segmentIndex++
      })
    }
  }

  // If no artifacts found, return the whole content as a text segment
  if (artifacts.length === 0 && content.trim()) {
    segments.push({
      type: 'text',
      content,
      index: 0
    })
  }

  return {
    artifacts,
    segments,
    hasArtifacts: artifacts.length > 0
  }
}

/**
 * Check if content contains any artifact tags
 *
 * @param content - The content to check
 * @returns true if artifacts are present
 */
export function hasArtifacts(content: string): boolean {
  if (!content) return false
  ARTIFACT_REGEX.lastIndex = 0
  return ARTIFACT_REGEX.test(content)
}

/**
 * Check if content has an incomplete/streaming artifact tag
 *
 * @param content - The content to check
 * @returns true if an incomplete artifact tag is detected
 */
export function hasIncompleteArtifact(content: string): boolean {
  if (!content) return false
  return INCOMPLETE_ARTIFACT_REGEX.test(content)
}

/**
 * Extract just the artifact content without parsing full structure
 * Useful for quick content extraction
 *
 * @param content - The content containing an artifact
 * @returns The artifact content or null if not found
 */
export function extractArtifactContent(content: string): string | null {
  ARTIFACT_REGEX.lastIndex = 0
  const match = ARTIFACT_REGEX.exec(content)
  if (match) {
    return match[2].trim()
  }
  return null
}

/**
 * Get artifact metadata from attributes
 *
 * @param attributes - Parsed attribute record
 * @returns ArtifactMetadata object
 */
export function getArtifactMetadata(attributes: Record<string, string>): ArtifactMetadata {
  return extractMetadata(attributes)
}

/**
 * Create a cs-artifact tag string from artifact data
 *
 * @param artifact - The artifact to serialize
 * @returns A cs-artifact tag string
 */
export function serializeArtifact(artifact: {
  identifier: string
  type: ArtifactType
  title: string
  content: string
  metadata?: Partial<ArtifactMetadata>
}): string {
  const attrs: string[] = [
    `identifier="${artifact.identifier}"`,
    `type="${artifact.type}"`,
    `title="${artifact.title}"`
  ]

  if (artifact.metadata) {
    if (artifact.metadata.tailwind === false) {
      attrs.push('tailwind="false"')
    }
    if (artifact.metadata.theme && artifact.metadata.theme !== 'auto') {
      attrs.push(`theme="${artifact.metadata.theme}"`)
    }
    if (artifact.metadata.language) {
      attrs.push(`language="${artifact.metadata.language}"`)
    }
    if (artifact.metadata.framework) {
      attrs.push(`framework="${artifact.metadata.framework}"`)
    }
  }

  return `<cs-artifact ${attrs.join(' ')}>\n${artifact.content}\n</cs-artifact>`
}

/**
 * Update artifact content while preserving the tag structure
 *
 * @param originalContent - The original message content
 * @param artifactIdentifier - The identifier of the artifact to update
 * @param newContent - The new artifact content
 * @returns Updated message content
 */
export function updateArtifactContent(
  originalContent: string,
  artifactIdentifier: string,
  newContent: string
): string {
  // Create a regex that matches the specific artifact by identifier
  const specificArtifactRegex = new RegExp(
    `(<cs-artifact\\s+[^>]*identifier=["']${artifactIdentifier}["'][^>]*>)[\\s\\S]*?(<\\/cs-artifact>)`,
    'gi'
  )

  return originalContent.replace(specificArtifactRegex, `$1\n${newContent}\n$2`)
}

/**
 * Count the number of artifacts in content
 *
 * @param content - The content to check
 * @returns Number of artifacts found
 */
export function countArtifacts(content: string): number {
  if (!content) return 0
  const matches = content.match(/<cs-artifact\s+[^>]*>[\s\S]*?<\/cs-artifact>/gi)
  return matches ? matches.length : 0
}

