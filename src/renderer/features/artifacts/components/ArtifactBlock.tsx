/**
 * Artifact Block Component
 *
 * Message block component for rendering artifacts detected in AI responses.
 * Integrates with the existing message block renderer system.
 */

import type { FC } from 'react'
import { memo, useMemo } from 'react'
import styled from 'styled-components'

import { parseArtifacts } from '../utils/artifactParser'

import ArtifactCard from './ArtifactCard'

interface ArtifactBlockProps {
  /** The raw message content that may contain artifacts */
  content: string
  /** Conversation ID for context */
  conversationId: string
  /** Message ID for context */
  messageId: string
  /** Whether to show preview thumbnails */
  showPreview?: boolean
  /** Custom class name */
  className?: string
}

/**
 * Artifact Block Component
 *
 * Parses message content for artifacts and renders them as cards
 */
const ArtifactBlock: FC<ArtifactBlockProps> = ({
  content,
  conversationId,
  messageId,
  showPreview = false,
  className
}) => {
  // Parse artifacts from content
  const parseResult = useMemo(() => parseArtifacts(content), [content])

  // If no artifacts found, return null
  if (!parseResult.hasArtifacts) {
    return null
  }

  return (
    <Container className={className}>
      {parseResult.artifacts.map((artifact, index) => (
        <ArtifactCard
          key={`${artifact.identifier}-${index}`}
          artifact={artifact}
          conversationId={conversationId}
          messageId={messageId}
          showPreview={showPreview}
        />
      ))}
    </Container>
  )
}

// Styled components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 8px 0;
`

export default memo(ArtifactBlock)

