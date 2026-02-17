/**
 * Artifact Tag Renderer for Markdown
 *
 * Renders <cs-artifact> tags as ArtifactCard components instead of inline HTML.
 * This ensures artifacts are displayed as clickable panels that open the artifact mini-app.
 */

import { ArtifactCard } from '@renderer/features/artifacts'
import type { ArtifactType, ParsedArtifact } from '@renderer/features/artifacts/types'
import { useAppSelector } from '@renderer/store'
import { selectCurrentTopicId } from '@renderer/store/newMessage'
import { nanoid } from 'nanoid'
import type { FC } from 'react'
import { useMemo } from 'react'

/**
 * Rehype/Hast node structure from react-markdown
 */
interface HastNode {
  type: string
  tagName?: string
  value?: string
  properties?: Record<string, unknown>
  children?: HastNode[]
}

interface ArtifactTagProps {
  identifier?: string
  type?: string
  title?: string
  tailwind?: string
  language?: string
  children?: React.ReactNode
  // Rehype/Hast node for accessing raw content
  node?: HastNode
  // Block ID for context (passed from Markdown component)
  blockId?: string
}

/**
 * Recursively serialize a rehype/hast node tree back to HTML string
 */
function serializeNode(node: any): string {
  if (!node) return ''

  // Text node
  if (node.type === 'text') {
    return node.value || ''
  }

  // Element node
  if (node.type === 'element' && node.tagName) {
    const attrs = node.properties
      ? Object.entries(node.properties)
          .filter(([key]) => key !== 'className') // className is special
          .map(([key, value]) => {
            // Handle className -> class
            const attrName = key === 'className' ? 'class' : key
            if (typeof value === 'boolean') {
              return value ? attrName : ''
            }
            if (Array.isArray(value)) {
              return `${attrName}="${value.join(' ')}"`
            }
            return `${attrName}="${value}"`
          })
          .filter(Boolean)
          .join(' ')
      : ''

    // Handle className separately
    const classAttr = node.properties?.className
      ? `class="${Array.isArray(node.properties.className) ? node.properties.className.join(' ') : node.properties.className}"`
      : ''

    const allAttrs = [classAttr, attrs].filter(Boolean).join(' ')
    const attrString = allAttrs ? ` ${allAttrs}` : ''

    // Void elements (self-closing)
    const voidElements = [
      'area',
      'base',
      'br',
      'col',
      'embed',
      'hr',
      'img',
      'input',
      'link',
      'meta',
      'source',
      'track',
      'wbr'
    ]
    if (voidElements.includes(node.tagName)) {
      return `<${node.tagName}${attrString} />`
    }

    // Regular elements
    const childrenContent = node.children?.map(serializeNode).join('') || ''
    return `<${node.tagName}${attrString}>${childrenContent}</${node.tagName}>`
  }

  // Root or other container - just serialize children
  if (node.children && Array.isArray(node.children)) {
    return node.children.map(serializeNode).join('')
  }

  return ''
}

/**
 * Extract content from React children or node children
 * Handles both raw text nodes and parsed HTML element nodes
 */
function extractContent(children: React.ReactNode, node?: HastNode): string {
  // Try to serialize the node children (handles both text and element nodes)
  if (node?.children && Array.isArray(node.children)) {
    const serialized = node.children.map(serializeNode).join('')
    if (serialized.trim()) {
      return serialized.trim()
    }
  }

  // Fallback to React children
  if (typeof children === 'string') {
    return children.trim()
  }

  if (Array.isArray(children)) {
    return children
      .map((child) => (typeof child === 'string' ? child : ''))
      .join('')
      .trim()
  }

  return ''
}

/**
 * Normalize artifact type to match our type system
 */
function normalizeType(type?: string): ArtifactType {
  if (!type) return 'html'

  const normalized = type.toLowerCase().trim()

  switch (normalized) {
    case 'html':
    case 'xhtml':
    case 'htmx':
      return normalized as ArtifactType
    case 'react':
    case 'jsx':
      return 'react'
    case 'svg':
      return 'svg'
    case 'mermaid':
      return 'mermaid'
    case 'markdown':
    case 'md':
      return 'markdown'
    case 'code':
      return 'code'
    default:
      return 'html'
  }
}

/**
 * Custom renderer for <cs-artifact> tags in Markdown content.
 * Converts artifact tags to ArtifactCard components.
 */
const ArtifactTagRenderer: FC<ArtifactTagProps> = ({
  identifier,
  type,
  title,
  tailwind,
  language,
  children,
  node,
  blockId
}) => {
  // Get the current topic ID from Redux store
  const currentTopicId = useAppSelector(selectCurrentTopicId)

  const parsedArtifact: ParsedArtifact = useMemo(() => {
    const content = extractContent(children, node)
    const artifactType = normalizeType(type)

    return {
      identifier: identifier || `artifact-${nanoid(8)}`,
      type: artifactType,
      title: title || 'Untitled Artifact',
      content,
      attributes: {
        identifier: identifier || '',
        type: type || 'html',
        title: title || '',
        tailwind: tailwind || 'true',
        language: language || ''
      },
      startIndex: 0,
      endIndex: content.length
    }
  }, [identifier, type, title, tailwind, language, children, node])

  // Use the current topic ID if available, otherwise generate a temporary one
  const conversationId = currentTopicId || `inline-${nanoid(8)}`
  // Use block ID if available for more accurate message tracking
  const messageId = blockId || `msg-${nanoid(8)}`

  return <ArtifactCard artifact={parsedArtifact} conversationId={conversationId} messageId={messageId} />
}

export default ArtifactTagRenderer
