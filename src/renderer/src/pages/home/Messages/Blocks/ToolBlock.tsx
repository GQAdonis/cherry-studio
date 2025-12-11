import type { ToolMessageBlock } from '@renderer/types/newMessage'
import React, { useState } from 'react'

import MessageTools from '../Tools/MessageTools'

interface Props {
  block: ToolMessageBlock
}

const ToolBlock: React.FC<Props> = ({ block }) => {
  const [showFull, setShowFull] = useState(false)
  const fullContent = block.metadata?.fullContent

  const displayBlock =
    showFull && fullContent
      ? {
          ...block,
          content: fullContent,
          metadata: {
            ...block.metadata,
            rawMcpToolResponse: block.metadata?.rawMcpToolResponse
              ? {
                  ...block.metadata.rawMcpToolResponse,
                  response: fullContent
                }
              : undefined
          }
        }
      : block

  return (
    <div className="flex flex-col gap-1">
      <MessageTools block={displayBlock as ToolMessageBlock} />
      {fullContent && (
        <div
          className="text-xs text-secondary hover:text-primary cursor-pointer transition-colors px-1"
          onClick={() => setShowFull(!showFull)}
        >
          {showFull ? 'Show summarized result' : 'View full result (original)'}
        </div>
      )}
    </div>
  )
}

export default React.memo(ToolBlock)
