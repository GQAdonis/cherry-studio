/**
 * Generic Extraction Adapter
 *
 * Fallback adapter for extracting content from any web page.
 * Uses heuristics to identify conversation-like structures.
 */

import type { ExtractionAdapter } from './index'

export const genericAdapter: ExtractionAdapter = {
  name: 'Generic',
  urlPatterns: [/.*/], // Matches everything as fallback

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getConversationsScript: (_limit: number) => `
    (function() {
      try {
        // For generic pages, we can't really list conversations
        // Return empty or try to find any chat-like structure
        const conversations = [];
        
        // Look for common chat interface patterns
        const chatContainers = document.querySelectorAll(
          '[class*="chat"], [class*="conversation"], [class*="message-list"], ' +
          '[class*="thread"], [role="log"], [aria-label*="chat"]'
        );
        
        if (chatContainers.length > 0) {
          conversations.push({
            id: 'current',
            title: document.title || 'Chat',
            messages: [],
            metadata: { source: 'generic', url: window.location.href }
          });
        }
        
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
        
        // Try multiple strategies to find messages
        
        // Strategy 1: Look for explicit message elements
        const messageElements = document.querySelectorAll(
          '[class*="message"]:not(form):not(input), ' +
          '[class*="chat-bubble"], [class*="msg-content"], ' +
          '[data-message], [role="listitem"]'
        );
        
        messageElements.forEach((el) => {
          // Skip if it's a container with many child messages
          if (el.querySelectorAll('[class*="message"]').length > 1) return;
          
          // Try to determine if it's from user or assistant
          const classStr = el.className?.toString()?.toLowerCase() || '';
          const parentClass = el.parentElement?.className?.toString()?.toLowerCase() || '';
          
          const isUser = classStr.includes('user') || classStr.includes('human') ||
                        classStr.includes('self') || classStr.includes('outgoing') ||
                        classStr.includes('sent') || parentClass.includes('user');
          
          const isAssistant = classStr.includes('assistant') || classStr.includes('bot') ||
                             classStr.includes('ai') || classStr.includes('incoming') ||
                             classStr.includes('received') || parentClass.includes('assistant');
          
          const content = el.textContent?.trim() || '';
          
          // Only include if we have substantial content
          if (content && content.length > 10 && content.length < 50000) {
            messages.push({
              role: isUser ? 'user' : (isAssistant ? 'assistant' : 'assistant'),
              content: content.substring(0, 10000)
            });
          }
        });
        
        // Strategy 2: If no messages found, look for alternating structure
        if (messages.length === 0) {
          const container = document.querySelector(
            '[class*="chat"], [class*="conversation"], main, article'
          );
          
          if (container) {
            const children = container.children;
            for (let i = 0; i < Math.min(children.length, 50); i++) {
              const child = children[i];
              const content = child.textContent?.trim() || '';
              
              if (content && content.length > 20 && content.length < 50000) {
                // Alternate between user and assistant
                messages.push({
                  role: i % 2 === 0 ? 'user' : 'assistant',
                  content: content.substring(0, 10000)
                });
              }
            }
          }
        }
        
        // Get title from page
        const title = document.title || 'Web Page';
        
        return [{
          id: 'current',
          title,
          messages,
          metadata: {
            source: 'generic',
            url: window.location.href,
            extractedAt: new Date().toISOString(),
            note: 'Extracted using generic heuristics. May not be accurate.'
          }
        }];
      } catch (e) {
        return [{ error: e.message }];
      }
    })()
  `
}

