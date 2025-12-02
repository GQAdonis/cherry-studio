/**
 * MinAppContextMenuService
 *
 * Provides enhanced context menu functionality for mini-app webviews.
 * Adds options to send content to chat, knowledge base, and more.
 */

import { loggerService } from '@logger'
import { IpcChannel } from '@shared/IpcChannel'
import type { MenuItemConstructorOptions } from 'electron'
import { Menu, webContents } from 'electron'

import { locales } from '../utils/locales'
import { configManager } from './ConfigManager'
import { webViewRegistryService } from './WebViewRegistryService'
import { windowService } from './WindowService'

const logger = loggerService.withContext('MinAppContextMenuService')

export interface ContextMenuActionPayload {
  action: 'send-to-chat' | 'send-to-kb' | 'ask-about' | 'save-as-note' | 'extract-page' | 'extract-conversations'
  text?: string
  url?: string
  title?: string
  appId?: string
  metadata?: Record<string, unknown>
}

class MinAppContextMenuService {
  /**
   * Register context menu for a webview
   */
  public registerForWebview(webContentsId: number): void {
    const contents = webContents.fromId(webContentsId)
    if (!contents || contents.isDestroyed()) {
      logger.warn(`Cannot register context menu: WebContents ${webContentsId} not found`)
      return
    }

    contents.on('context-menu', (_event, properties) => {
      this.showContextMenu(webContentsId, properties)
    })

    logger.debug(`Registered context menu for webview ${webContentsId}`)
  }

  /**
   * Show the context menu
   */
  private showContextMenu(webContentsId: number, properties: Electron.ContextMenuParams): void {
    const locale = locales[configManager.getLanguage()]
    const { common } = locale.translation
    const webviewInfo = webViewRegistryService.getByWebContentsId(webContentsId)

    const hasText = properties.selectionText.trim().length > 0
    const selectedText = properties.selectionText.trim()

    // Build menu template
    const template: MenuItemConstructorOptions[] = []

    // Standard edit items
    template.push(...this.createEditMenuItems(properties, common))

    // Separator before Cherry Studio actions
    if (hasText || !properties.isEditable) {
      template.push({ type: 'separator' })
    }

    // Cherry Studio specific actions
    if (hasText) {
      // Text selection actions
      template.push({
        id: 'send-to-chat',
        label: '📤 Send to Chat',
        click: () => {
          this.sendAction({
            action: 'send-to-chat',
            text: selectedText,
            url: properties.pageURL,
            title: webviewInfo?.title,
            appId: webviewInfo?.appId
          })
        }
      })

      template.push({
        id: 'send-to-kb',
        label: '📚 Send to Knowledge Base...',
        click: () => {
          this.sendAction({
            action: 'send-to-kb',
            text: selectedText,
            url: properties.pageURL,
            title: webviewInfo?.title,
            appId: webviewInfo?.appId
          })
        }
      })

      template.push({
        id: 'ask-about',
        label: '💬 Ask about this...',
        click: () => {
          this.sendAction({
            action: 'ask-about',
            text: selectedText,
            url: properties.pageURL,
            title: webviewInfo?.title,
            appId: webviewInfo?.appId
          })
        }
      })

      template.push({
        id: 'save-as-note',
        label: '📝 Save as Note',
        click: () => {
          this.sendAction({
            action: 'save-as-note',
            text: selectedText,
            url: properties.pageURL,
            title: webviewInfo?.title,
            appId: webviewInfo?.appId
          })
        }
      })
    } else {
      // Page-level actions (when no text selected)
      template.push({
        id: 'extract-page',
        label: '📄 Extract Page Content',
        submenu: [
          {
            id: 'extract-page-to-chat',
            label: 'Send to Chat',
            click: () => {
              this.sendAction({
                action: 'extract-page',
                url: properties.pageURL,
                title: webviewInfo?.title,
                appId: webviewInfo?.appId,
                metadata: { target: 'chat' }
              })
            }
          },
          {
            id: 'extract-page-to-kb',
            label: 'Send to Knowledge Base...',
            click: () => {
              this.sendAction({
                action: 'extract-page',
                url: properties.pageURL,
                title: webviewInfo?.title,
                appId: webviewInfo?.appId,
                metadata: { target: 'kb' }
              })
            }
          }
        ]
      })

      // Check if this looks like an AI chat app
      const url = properties.pageURL.toLowerCase()
      const isAIChat =
        url.includes('chatgpt.com') ||
        url.includes('chat.openai.com') ||
        url.includes('claude.ai') ||
        url.includes('perplexity.ai') ||
        url.includes('gemini.google.com')

      if (isAIChat) {
        template.push({
          id: 'extract-conversations',
          label: '💬 Extract Conversations',
          submenu: [
            {
              id: 'extract-current-chat',
              label: 'Current Conversation',
              click: () => {
                this.sendAction({
                  action: 'extract-conversations',
                  url: properties.pageURL,
                  title: webviewInfo?.title,
                  appId: webviewInfo?.appId,
                  metadata: { currentOnly: true }
                })
              }
            },
            {
              id: 'extract-all-chats',
              label: 'All Recent Conversations',
              click: () => {
                this.sendAction({
                  action: 'extract-conversations',
                  url: properties.pageURL,
                  title: webviewInfo?.title,
                  appId: webviewInfo?.appId,
                  metadata: { currentOnly: false }
                })
              }
            }
          ]
        })
      }
    }

    // Separator before inspect
    template.push({ type: 'separator' })

    // Inspect element
    template.push({
      id: 'inspect',
      label: common.inspect || 'Inspect',
      click: () => {
        const wc = webContents.fromId(webContentsId)
        if (wc && !wc.isDestroyed()) {
          wc.openDevTools()
        }
      }
    })

    // Show menu
    const menu = Menu.buildFromTemplate(template)
    menu.popup()
  }

  /**
   * Create standard edit menu items
   */
  private createEditMenuItems(
    properties: Electron.ContextMenuParams,
    common: Record<string, string>
  ): MenuItemConstructorOptions[] {
    const hasText = properties.selectionText.trim().length > 0
    const can = (type: string) => properties.editFlags[`can${type}`] && hasText

    const template: MenuItemConstructorOptions[] = [
      {
        id: 'copy',
        label: common.copy || 'Copy',
        role: 'copy',
        enabled: can('Copy'),
        visible: properties.isEditable || hasText
      },
      {
        id: 'paste',
        label: common.paste || 'Paste',
        role: 'paste',
        enabled: properties.editFlags.canPaste,
        visible: properties.isEditable
      },
      {
        id: 'cut',
        label: common.cut || 'Cut',
        role: 'cut',
        enabled: can('Cut'),
        visible: properties.isEditable
      },
      {
        id: 'selectAll',
        label: common.selectAll || 'Select All',
        role: 'selectAll',
        visible: properties.isEditable
      }
    ]

    // Remove role from disabled items
    template.forEach((item) => {
      if (item.enabled === false) {
        item.role = undefined
      }
    })

    return template.filter((item) => item.visible !== false)
  }

  /**
   * Send action to the renderer process
   */
  private sendAction(payload: ContextMenuActionPayload): void {
    try {
      const mainWindow = windowService.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IpcChannel.MinApp_ContextMenuAction, payload)
        logger.debug(`Sent context menu action: ${payload.action}`)
      } else {
        logger.warn('Cannot send context menu action: Main window not available')
      }
    } catch (error) {
      logger.error('Failed to send context menu action:', error as Error)
    }
  }

  /**
   * Send selected text directly to chat input
   */
  public quoteToChat(text: string): void {
    try {
      windowService.quoteToMainWindow(text)
    } catch (error) {
      logger.error('Failed to quote to chat:', error as Error)
    }
  }
}

export const minAppContextMenuService = new MinAppContextMenuService()
export default minAppContextMenuService

