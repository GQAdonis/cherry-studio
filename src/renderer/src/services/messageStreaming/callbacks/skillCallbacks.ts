import { loggerService } from '@logger'
import type { SkillActivationChunk } from '@renderer/types/chunk'
import { MessageBlockType } from '@renderer/types/newMessage'
import { createSkillBlock } from '@renderer/utils/messageUtils/create'

import type { BlockManager } from '../BlockManager'

const logger = loggerService.withContext('SkillCallbacks')

interface SkillCallbacksDependencies {
  blockManager: BlockManager
  assistantMsgId: string
}

export const createSkillCallbacks = (deps: SkillCallbacksDependencies) => {
  const { blockManager, assistantMsgId } = deps

  return {
    onSkillActivation: async (chunk: SkillActivationChunk) => {
      logger.info('onSkillActivation', chunk)

      const newBlock = createSkillBlock(assistantMsgId, {
        skillName: chunk.skillName,
        action: chunk.action,
        toolName: chunk.toolName,
        result: chunk.result
      })

      await blockManager.handleBlockTransition(newBlock, MessageBlockType.SKILL)
    }
  }
}
