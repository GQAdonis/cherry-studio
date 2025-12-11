import { loggerService } from '@logger'
import type { ContextActionChunk } from '@renderer/types/chunk'
import { MessageBlockType } from '@renderer/types/newMessage'
import { createContextActionBlock } from '@renderer/utils/messageUtils/create'

import type { BlockManager } from '../BlockManager'

const logger = loggerService.withContext('ContextActionCallbacks')

interface ContextActionCallbacksDependencies {
  blockManager: BlockManager
  assistantMsgId: string
}

export const createContextActionCallbacks = (deps: ContextActionCallbacksDependencies) => {
  const { blockManager, assistantMsgId } = deps

  return {
    onContextAction: async (chunk: ContextActionChunk) => {
      logger.info('onContextAction', chunk)
      
      // Prevent duplicate blocks if one already exists for this action? 
      // For now, we assume one context action per message generation flow if triggered.
      
      const newBlock = createContextActionBlock(assistantMsgId, {
        action: chunk.action,
        summary: chunk.summary,
        removedCount: chunk.removedCount
      })

      // Use handleBlockTransition to add the block and update state
      await blockManager.handleBlockTransition(newBlock, MessageBlockType.CONTEXT_ACTION)
    }
  }
}
