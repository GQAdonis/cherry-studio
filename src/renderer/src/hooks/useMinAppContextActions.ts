/**
 * useMinAppContextActions Hook
 *
 * Handles context menu actions from mini-app webviews.
 * Listens for IPC events and routes actions to appropriate handlers.
 */

import { IpcChannel } from '@shared/IpcChannel'
import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import KnowledgeBaseSelectorPopup from '@renderer/components/MinApp/KnowledgeBaseSelector'

export interface ContextMenuActionPayload {
  action: 'send-to-chat' | 'send-to-kb' | 'ask-about' | 'save-as-note' | 'extract-page' | 'extract-conversations'
  text?: string
  url?: string
  title?: string
  appId?: string
  metadata?: Record<string, unknown>
}

export function useMinAppContextActions() {
  const navigate = useNavigate()

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
      navigate('/')
    },
    [navigate]
  )

  /**
   * Handle send to knowledge base action
   */
  const handleSendToKB = useCallback(async (payload: ContextMenuActionPayload) => {
    const { text, url, title } = payload

    // Show KB selector
    const result = await KnowledgeBaseSelectorPopup.show({
      title: 'Add to Knowledge Base',
      contentPreview: text
    })

    if (result.cancelled || !result.knowledgeBaseId) {
      return
    }

    // Format content for KB
    const content = `# ${title || 'Extracted Content'}\n\nSource: ${url || 'Mini-App'}\n\n${text || ''}`

    // Add to knowledge base
    try {
      await window.api?.knowledgeBase?.add?.(result.knowledgeBaseId, {
        content,
        metadata: {
          source: 'minapp',
          url,
          title,
          extractedAt: new Date().toISOString()
        }
      })

      window.message?.success?.(`Added to "${result.knowledgeBaseName}"`)
    } catch (error) {
      console.error('Failed to add to knowledge base:', error)
      window.message?.error?.('Failed to add to knowledge base')
    }
  }, [])

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

      navigate('/')
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
      window.message?.success?.('Note copied to clipboard')
    } catch (error) {
      console.error('Failed to save note:', error)
      window.message?.error?.('Failed to save note')
    }
  }, [])

  /**
   * Handle extract page action
   */
  const handleExtractPage = useCallback(
    async (payload: ContextMenuActionPayload) => {
      const { appId, metadata } = payload
      const target = metadata?.target as 'chat' | 'kb'

      if (!appId) {
        window.message?.error?.('No mini-app specified')
        return
      }

      try {
        // Call the MCP tool to extract page content
        const result = await window.api?.mcp?.callTool?.('@cherry/minapp-controller', 'extract_page_content', {
          appId,
          format: 'markdown'
        })

        if (result?.content?.[0]?.text) {
          const extractedContent = result.content[0].text

          if (target === 'kb') {
            // Show KB selector
            const kbResult = await KnowledgeBaseSelectorPopup.show({
              title: 'Add Page to Knowledge Base',
              contentPreview: extractedContent
            })

            if (!kbResult.cancelled && kbResult.knowledgeBaseId) {
              await window.api?.knowledgeBase?.add?.(kbResult.knowledgeBaseId, {
                content: extractedContent,
                metadata: {
                  source: 'minapp-extraction',
                  appId,
                  extractedAt: new Date().toISOString()
                }
              })
              window.message?.success?.(`Page added to "${kbResult.knowledgeBaseName}"`)
            }
          } else {
            // Send to chat
            if (window.api?.quoteToMainWindow) {
              window.api.quoteToMainWindow(extractedContent)
            }
            navigate('/')
          }
        }
      } catch (error) {
        console.error('Failed to extract page:', error)
        window.message?.error?.('Failed to extract page content')
      }
    },
    [navigate]
  )

  /**
   * Handle extract conversations action
   */
  const handleExtractConversations = useCallback(async (payload: ContextMenuActionPayload) => {
    const { appId, metadata } = payload
    const currentOnly = metadata?.currentOnly as boolean

    if (!appId) {
      window.message?.error?.('No mini-app specified')
      return
    }

    try {
      // Call the MCP tool to extract conversations
      const result = await window.api?.mcp?.callTool?.('@cherry/minapp-controller', 'extract_conversations', {
        appId,
        currentOnly,
        limit: 10
      })

      if (result?.content?.[0]?.text) {
        const conversations = JSON.parse(result.content[0].text)

        // Show KB selector
        const kbResult = await KnowledgeBaseSelectorPopup.show({
          title: 'Save Conversations to Knowledge Base',
          contentPreview: `${conversations.length} conversation(s) extracted`
        })

        if (!kbResult.cancelled && kbResult.knowledgeBaseId) {
          // Format conversations for KB
          const formattedContent = conversations
            .map((conv: { title: string; messages: { role: string; content: string }[] }) => {
              const messages = conv.messages
                .map((m: { role: string; content: string }) => `**${m.role}**: ${m.content}`)
                .join('\n\n')
              return `# ${conv.title}\n\n${messages}`
            })
            .join('\n\n---\n\n')

          await window.api?.knowledgeBase?.add?.(kbResult.knowledgeBaseId, {
            content: formattedContent,
            metadata: {
              source: 'minapp-conversations',
              appId,
              conversationCount: conversations.length,
              extractedAt: new Date().toISOString()
            }
          })

          window.message?.success?.(`${conversations.length} conversation(s) saved to "${kbResult.knowledgeBaseName}"`)
        }
      }
    } catch (error) {
      console.error('Failed to extract conversations:', error)
      window.message?.error?.('Failed to extract conversations')
    }
  }, [])

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
          console.warn('Unknown context menu action:', payload.action)
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
    handleExtractConversations
  }
}

export default useMinAppContextActions

