/**
 * useMinAppContextActions Hook
 *
 * Handles context menu actions from mini-app webviews.
 * Listens for IPC events and routes actions to appropriate handlers.
 */

import { loggerService } from '@logger'
import KnowledgeBaseSelectorPopup from '@renderer/components/MinApp/KnowledgeBaseSelector'
import { getKnowledgeBaseParams } from '@renderer/services/KnowledgeService'
import type { KnowledgeBase, KnowledgeItem } from '@renderer/types'
import { uuid } from '@renderer/utils'
import { minappControllerServer } from '@renderer/utils/mcpServerUtils'
import { IpcChannel } from '@shared/IpcChannel'
import { useNavigate } from '@tanstack/react-router'
import { message } from 'antd'
import { useCallback, useEffect } from 'react'
import { useSelector } from 'react-redux'

export interface ContextMenuActionPayload {
  action: 'send-to-chat' | 'send-to-kb' | 'ask-about' | 'save-as-note' | 'extract-page' | 'extract-conversations'
  text?: string
  url?: string
  title?: string
  appId?: string
  metadata?: Record<string, unknown>
}

interface RootState {
  knowledge: {
    bases: KnowledgeBase[]
  }
}

const logger = loggerService.withContext('useMinAppContextActions')

export function useMinAppContextActions() {
  const navigate = useNavigate()
  const knowledgeBases = useSelector((state: RootState) => state.knowledge.bases)

  /**
   * Helper to add content to a knowledge base
   */
  const addToKnowledgeBase = useCallback(async (knowledgeBase: KnowledgeBase, content: string, sourceUrl?: string) => {
    const item: KnowledgeItem = {
      id: uuid(),
      type: 'note',
      content: content,
      sourceUrl: sourceUrl,
      created_at: Date.now(),
      updated_at: Date.now(),
      processingStatus: 'pending'
    } as KnowledgeItem & { sourceUrl?: string }

    try {
      const baseParams = getKnowledgeBaseParams(knowledgeBase)
      await window.api.knowledgeBase.add({
        base: baseParams,
        item
      })
      return true
    } catch (error) {
      logger.error('Failed to add to knowledge base', error as Error)
      return false
    }
  }, [])

  /**
   * Handle send to chat action
   */
  const handleSendToChat = useCallback(
    (payload: ContextMenuActionPayload) => {
      const { text, url, title } = payload

      // Format the content with metadata
      let content = text || ''
      if (url || title) {
        content = `> Source: ${title || 'Mini-App'}\n> URL: ${url || 'N/A'}\n\n${content}`
      }

      // Quote to main window input
      if (window.api?.quoteToMainWindow) {
        window.api.quoteToMainWindow(content)
      }

      // Navigate to chat if needed
      navigate({ to: '/' })
    },
    [navigate]
  )

  /**
   * Handle send to knowledge base action
   */
  const handleSendToKB = useCallback(
    async (payload: ContextMenuActionPayload) => {
      const { text, url, title } = payload

      // Show KB selector
      const result = await KnowledgeBaseSelectorPopup.show({
        title: 'Add to Knowledge Base',
        contentPreview: text
      })

      if (result.cancelled || !result.knowledgeBase) {
        return
      }

      // Format content for KB
      const content = `# ${title || 'Extracted Content'}\n\nSource: ${url || 'Mini-App'}\n\n${text || ''}`

      // Add to knowledge base
      const success = await addToKnowledgeBase(result.knowledgeBase, content, url)

      if (success) {
        message.success(`Added to "${result.knowledgeBaseName}"`)
      } else {
        message.error('Failed to add to knowledge base')
      }
    },
    [addToKnowledgeBase]
  )

  /**
   * Handle ask about this action
   */
  const handleAskAbout = useCallback(
    (payload: ContextMenuActionPayload) => {
      const { text, url, title } = payload

      // Create a prompt asking about the selected text
      const prompt = `I found this content on ${title || 'a page'}${url ? ` (${url})` : ''}:\n\n"${text}"\n\nCan you help me understand or analyze this?`

      // Send to chat
      if (window.api?.quoteToMainWindow) {
        window.api.quoteToMainWindow(prompt)
      }

      navigate({ to: '/' })
    },
    [navigate]
  )

  /**
   * Handle save as note action
   */
  const handleSaveAsNote = useCallback(async (payload: ContextMenuActionPayload) => {
    const { text, url, title } = payload

    // Format as a note
    const noteContent = `# ${title || 'Note from Mini-App'}\n\n${text || ''}\n\n---\n*Source: ${url || 'Mini-App'}*\n*Saved: ${new Date().toLocaleString()}*`

    // Try to save as a note (this would integrate with the notes feature)
    try {
      // For now, copy to clipboard as a fallback
      await navigator.clipboard.writeText(noteContent)
      message.success('Note copied to clipboard')
    } catch (error) {
      logger.error('Failed to save note', error as Error)
      message.error('Failed to save note')
    }
  }, [])

  /**
   * Handle extract page action using MCP tool
   */
  const handleExtractPage = useCallback(
    async (payload: ContextMenuActionPayload) => {
      const { appId, metadata } = payload
      const target = metadata?.target as 'chat' | 'kb'

      if (!appId) {
        message.error('No mini-app specified')
        return
      }

      try {
        message.loading('Extracting page content...')

        // Call the MCP tool to extract page content
        const result = await window.api.mcp.callTool({
          server: minappControllerServer,
          name: 'extract_page_content',
          args: { appId, format: 'markdown' }
        })

        message.destroy()

        // Check for errors
        if (result?.isError) {
          const errorText = result?.content?.[0]?.text || 'Failed to extract content'
          message.error(errorText)
          return
        }

        const extractedContent = result?.content?.[0]?.text
        if (!extractedContent) {
          message.error('No content extracted from page')
          return
        }

        if (target === 'kb') {
          // Show KB selector
          const kbResult = await KnowledgeBaseSelectorPopup.show({
            title: 'Add Page to Knowledge Base',
            contentPreview: extractedContent.substring(0, 200)
          })

          if (!kbResult.cancelled && kbResult.knowledgeBase) {
            const success = await addToKnowledgeBase(kbResult.knowledgeBase, extractedContent)
            if (success) {
              message.success(`Page added to "${kbResult.knowledgeBaseName}"`)
            } else {
              message.error('Failed to add page to knowledge base')
            }
          }
        } else {
          // Send to chat
          if (window.api?.quoteToMainWindow) {
            window.api.quoteToMainWindow(extractedContent)
          }
          navigate({ to: '/' })
          message.success('Page content sent to chat')
        }
      } catch (error) {
        logger.error('Failed to extract page', error as Error)
        message.destroy()
        message.error('Failed to extract page content')
      }
    },
    [navigate, addToKnowledgeBase]
  )

  /**
   * Handle extract conversations action using MCP tool
   */
  const handleExtractConversations = useCallback(
    async (payload: ContextMenuActionPayload) => {
      const { appId, metadata } = payload
      const currentOnly = metadata?.currentOnly as boolean

      if (!appId) {
        message.error('No mini-app specified')
        return
      }

      try {
        message.loading('Extracting conversations...')

        // Call the MCP tool to extract conversations
        const result = await window.api.mcp.callTool({
          server: minappControllerServer,
          name: 'extract_conversations',
          args: { appId, currentOnly: currentOnly ?? false, limit: 10 }
        })

        message.destroy()

        // Check for errors
        if (result?.isError) {
          const errorText = result?.content?.[0]?.text || 'Failed to extract conversations'
          message.error(errorText)
          return
        }

        const conversationsJson = result?.content?.[0]?.text
        if (!conversationsJson) {
          message.error('No conversations extracted')
          return
        }

        let conversations: { title: string; messages: { role: string; content: string }[] }[]
        try {
          conversations = JSON.parse(conversationsJson)
        } catch {
          // If not JSON, treat as plain text content
          message.info('Extracted content is not in conversation format')
          if (window.api?.quoteToMainWindow) {
            window.api.quoteToMainWindow(conversationsJson)
          }
          navigate({ to: '/' })
          return
        }

        if (!Array.isArray(conversations) || conversations.length === 0) {
          message.warning('No conversations found')
          return
        }

        // Show KB selector
        const kbResult = await KnowledgeBaseSelectorPopup.show({
          title: 'Save Conversations to Knowledge Base',
          contentPreview: `${conversations.length} conversation(s) extracted`
        })

        if (!kbResult.cancelled && kbResult.knowledgeBase) {
          // Format conversations for KB
          const formattedContent = conversations
            .map((conv) => {
              const messages = conv.messages
                .map((m: { role: string; content: string }) => `**${m.role}**: ${m.content}`)
                .join('\n\n')
              return `# ${conv.title}\n\n${messages}`
            })
            .join('\n\n---\n\n')

          const success = await addToKnowledgeBase(kbResult.knowledgeBase, formattedContent)
          if (success) {
            message.success(`${conversations.length} conversation(s) saved to "${kbResult.knowledgeBaseName}"`)
          } else {
            message.error('Failed to save conversations to knowledge base')
          }
        }
      } catch (error) {
        logger.error('Failed to extract conversations', error as Error)
        message.destroy()
        message.error('Failed to extract conversations')
      }
    },
    [navigate, addToKnowledgeBase]
  )

  /**
   * Main action handler
   */
  const handleContextMenuAction = useCallback(
    (payload: ContextMenuActionPayload) => {
      switch (payload.action) {
        case 'send-to-chat':
          handleSendToChat(payload)
          break
        case 'send-to-kb':
          handleSendToKB(payload)
          break
        case 'ask-about':
          handleAskAbout(payload)
          break
        case 'save-as-note':
          handleSaveAsNote(payload)
          break
        case 'extract-page':
          handleExtractPage(payload)
          break
        case 'extract-conversations':
          handleExtractConversations(payload)
          break
        default:
          logger.warn('Unknown context menu action', { action: payload.action })
      }
    },
    [handleSendToChat, handleSendToKB, handleAskAbout, handleSaveAsNote, handleExtractPage, handleExtractConversations]
  )

  /**
   * Setup IPC listener
   */
  useEffect(() => {
    const removeListener = window.electron?.ipcRenderer?.on?.(
      IpcChannel.MinApp_ContextMenuAction,
      (_event: unknown, payload: ContextMenuActionPayload) => {
        handleContextMenuAction(payload)
      }
    )

    return () => {
      removeListener?.()
    }
  }, [handleContextMenuAction])

  return {
    handleContextMenuAction,
    handleSendToChat,
    handleSendToKB,
    handleAskAbout,
    handleSaveAsNote,
    handleExtractPage,
    handleExtractConversations,
    knowledgeBases
  }
}

export default useMinAppContextActions
