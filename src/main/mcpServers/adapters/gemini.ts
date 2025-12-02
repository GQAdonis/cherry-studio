/**
 * Gemini Extraction Adapter
 *
 * Extracts conversations and content from Google Gemini (gemini.google.com)
 */

import type { ExtractionAdapter } from './index'

export const geminiAdapter: ExtractionAdapter = {
  name: 'Gemini',
  urlPatterns: [/^https?:\/\/gemini\.google\.com/i, /^https?:\/\/bard\.google\.com/i],

  getConversationsScript: (limit: number) => `
    (function() {
      try {
        const conversations = [];
        
        // Try to get conversation list from sidebar
        const sidebarItems = document.querySelectorAll('[class*="conversation-item"], [class*="chat-item"], a[href*="/app/"]');
        
        sidebarItems.forEach((item, index) => {
          if (index >= ${limit}) return;
          
          const titleEl = item.querySelector('[class*="title"]') || item;
          const title = titleEl.textContent?.trim() || 'Untitled';
          const href = item.getAttribute('href') || '';
          const id = href.split('/').pop() || 'unknown-' + index;
          
          conversations.push({
            id,
            title,
            messages: [],
            metadata: { source: 'gemini', href }
          });
        });
        
        return conversations;
      } catch (e) {
        return [{ error: e.message }];
      }
    })()
  `,

  getCurrentChatScript: () => `
    (function() {
      try {
        const messages = [];
        
        // Gemini uses specific data attributes and class patterns
        const messageContainers = document.querySelectorAll(
          '[class*="query-content"], [class*="response-content"], ' +
          '[class*="user-query"], [class*="model-response"], ' +
          '[data-message-role]'
        );
        
        messageContainers.forEach((container) => {
          // Determine role
          const isUser = container.classList.toString().includes('query') ||
                        container.classList.toString().includes('user') ||
                        container.getAttribute('data-message-role') === 'user';
          
          // Get content - Gemini often has complex nested structures
          const contentEl = container.querySelector('[class*="content"], [class*="text"], .markdown-body');
          const content = contentEl?.textContent?.trim() || container.textContent?.trim() || '';
          
          if (content && content.length > 0) {
            messages.push({
              role: isUser ? 'user' : 'assistant',
              content: content.substring(0, 10000)
            });
          }
        });
        
        // Alternative: look for turn-based structure
        if (messages.length === 0) {
          const turns = document.querySelectorAll('[class*="turn"], [class*="exchange"]');
          turns.forEach((turn) => {
            // Each turn might have user + response
            const userPart = turn.querySelector('[class*="user"], [class*="query"]');
            const responsePart = turn.querySelector('[class*="response"], [class*="answer"]');
            
            if (userPart) {
              messages.push({
                role: 'user',
                content: (userPart.textContent?.trim() || '').substring(0, 10000)
              });
            }
            if (responsePart) {
              messages.push({
                role: 'assistant',
                content: (responsePart.textContent?.trim() || '').substring(0, 10000)
              });
            }
          });
        }
        
        // Get title
        const titleEl = document.querySelector('[class*="conversation-title"], h1, title');
        let title = titleEl?.textContent?.trim() || 'Gemini Conversation';
        if (title.includes('Gemini')) {
          title = messages[0]?.content?.substring(0, 50) || title;
        }
        
        // Get ID from URL
        const urlParts = window.location.pathname.split('/');
        const id = urlParts[urlParts.length - 1] || 'current';
        
        return [{
          id,
          title,
          messages,
          metadata: {
            source: 'gemini',
            url: window.location.href,
            extractedAt: new Date().toISOString()
          }
        }];
      } catch (e) {
        return [{ error: e.message }];
      }
    })()
  `
}

