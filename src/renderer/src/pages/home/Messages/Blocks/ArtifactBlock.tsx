/**
 * Artifact Block Component
 *
 * Displays an artifact card in the message stream.
 * Uses the ArtifactCard component from features/artifacts.
 */

import { ArtifactCard } from '@renderer/features/artifacts'
import type { ArtifactMessageBlock } from '@renderer/types/newMessage'
import React from 'react'

interface Props {
  block: ArtifactMessageBlock
}

const ArtifactBlock: React.FC<Props> = ({ block }) => {
  // Convert block to ParsedArtifact format expected by ArtifactCard
  const parsedArtifact = {
    identifier: block.identifier,
    type: block.artifactType,
    title: block.title,
    content: block.content,
    attributes: {},
    startIndex: 0,
    endIndex: block.content.length
  }

  return <ArtifactCard artifact={parsedArtifact} conversationId={block.conversationId} messageId={block.messageId} />
}

export default React.memo(ArtifactBlock)
