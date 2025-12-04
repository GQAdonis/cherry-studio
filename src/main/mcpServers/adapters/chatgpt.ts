/**
 * ChatGPT Extraction Adapter
 *
 * Extracts conversations and content from ChatGPT (chatgpt.com)
 */

import type { ExtractionAdapter } from './index'

export const chatGPTAdapter: ExtractionAdapter = {
  name: 'ChatGPT',
  urlPatterns: [/^https?:\/\/(chat\.openai\.com|chatgpt\.com)/i],

  getConversationsScript: (limit: number) => `
    (function() {
      try {
        const conversations = [];
        
        // Try to get conversation list from sidebar
        const sidebarItems = document.querySelectorAll('nav[aria-label="Chat history"] a');
        
        sidebarItems.forEach((item, index) => {
          if (index >= ${limit}) return;
          
          const title = item.textContent?.trim() || 'Untitled';
          const href = item.getAttribute('href') || '';
          const id = href.split('/').pop() || 'unknown-' + index;
          
          conversations.push({
            id,
            title,
            messages: [],
            metadata: { source: 'chatgpt', href }
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
        
        // Find all message containers
        const messageElements = document.querySelectorAll('[data-message-author-role]');
        
        messageElements.forEach((el) => {
          const role = el.getAttribute('data-message-author-role');
          const contentEl = el.querySelector('.markdown, .prose, [class*="markdown"]');
          const content = contentEl?.textContent?.trim() || el.textContent?.trim() || '';
          
          if (content) {
            messages.push({
              role: role === 'user' ? 'user' : 'assistant',
              content
            });
          }
        });
        
        // If the above didn't work, try alternative selectors
        if (messages.length === 0) {
          const altMessages = document.querySelectorAll('[class*="ConversationItem"], [class*="message"]');
          altMessages.forEach((el) => {
            const isUser = el.querySelector('[class*="user"]') !== null || 
                          el.classList.contains('user') ||
                          el.getAttribute('data-testid')?.includes('user');
            const content = el.textContent?.trim() || '';
            
            if (content && content.length > 0) {
              messages.push({
                role: isUser ? 'user' : 'assistant',
                content: content.substring(0, 10000) // Limit content length
              });
            }
          });
        }
        
        // Get conversation title
        const titleEl = document.querySelector('title, h1, [class*="title"]');
        const title = titleEl?.textContent?.trim() || 'Current Conversation';
        
        // Get conversation ID from URL
        const urlParts = window.location.pathname.split('/');
        const id = urlParts[urlParts.length - 1] || 'current';
        
        return [{
          id,
          title,
          messages,
          metadata: {
            source: 'chatgpt',
            url: window.location.href,
            extractedAt: new Date().toISOString()
          }
        }];
      } catch (e) {
        return [{ error: e.message }];
      }
    })()
  `,

  getProjectsScript: () => `
    (function() {
      try {
        const projects = [];
        
        // ChatGPT doesn't have a traditional projects feature
        // But we can look for GPT configurations
        const gptItems = document.querySelectorAll('[data-testid="gpt-item"], [class*="gpt-picker"] a');
        
        gptItems.forEach((item, index) => {
          const name = item.textContent?.trim() || 'GPT ' + index;
          const href = item.getAttribute('href') || '';
          
          projects.push({
            id: 'gpt-' + index,
            name,
            type: 'custom-gpt',
            href
          });
        });
        
        return projects;
      } catch (e) {
        return [{ error: e.message }];
      }
    })()
  `
}
