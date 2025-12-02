/**
 * Claude Extraction Adapter
 *
 * Extracts conversations and content from Claude.ai
 */

import type { ExtractionAdapter } from './index'

export const claudeAdapter: ExtractionAdapter = {
  name: 'Claude',
  urlPatterns: [/^https?:\/\/claude\.ai/i],

  getConversationsScript: (limit: number) => `
    (function() {
      try {
        const conversations = [];
        
        // Try to get conversation list from sidebar
        const sidebarItems = document.querySelectorAll('[data-testid="conversation-list-item"], nav a[href*="/chat/"]');
        
        sidebarItems.forEach((item, index) => {
          if (index >= ${limit}) return;
          
          const titleEl = item.querySelector('[class*="title"], [class*="name"]') || item;
          const title = titleEl.textContent?.trim() || 'Untitled';
          const href = item.getAttribute('href') || '';
          const id = href.split('/').pop() || 'unknown-' + index;
          
          conversations.push({
            id,
            title,
            messages: [],
            metadata: { source: 'claude', href }
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
        
        // Find all message containers - Claude uses specific class patterns
        const messageContainers = document.querySelectorAll('[class*="Message"], [data-testid*="message"]');
        
        messageContainers.forEach((container) => {
          // Determine if it's a human or assistant message
          const isHuman = container.classList.toString().includes('human') ||
                         container.querySelector('[class*="human"]') !== null ||
                         container.getAttribute('data-testid')?.includes('human');
          
          // Get the content
          const contentEl = container.querySelector('[class*="content"], [class*="prose"], .markdown');
          const content = contentEl?.textContent?.trim() || container.textContent?.trim() || '';
          
          if (content && content.length > 0) {
            messages.push({
              role: isHuman ? 'user' : 'assistant',
              content: content.substring(0, 10000)
            });
          }
        });
        
        // Alternative: look for the main conversation area
        if (messages.length === 0) {
          const mainArea = document.querySelector('[class*="conversation"], main');
          if (mainArea) {
            const blocks = mainArea.querySelectorAll('[class*="block"], [class*="turn"]');
            blocks.forEach((block) => {
              const isHuman = block.textContent?.includes('You:') || 
                             block.classList.toString().includes('human');
              const content = block.textContent?.trim() || '';
              
              if (content) {
                messages.push({
                  role: isHuman ? 'user' : 'assistant',
                  content: content.substring(0, 10000)
                });
              }
            });
          }
        }
        
        // Get conversation title
        const titleEl = document.querySelector('[class*="ConversationTitle"], title, h1');
        const title = titleEl?.textContent?.trim() || 'Current Conversation';
        
        // Get conversation ID from URL
        const urlParts = window.location.pathname.split('/');
        const id = urlParts[urlParts.length - 1] || 'current';
        
        return [{
          id,
          title,
          messages,
          metadata: {
            source: 'claude',
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
        
        // Look for Claude projects in the sidebar
        const projectItems = document.querySelectorAll('[data-testid="project-item"], [class*="project"]');
        
        projectItems.forEach((item, index) => {
          const name = item.textContent?.trim() || 'Project ' + index;
          const href = item.getAttribute('href') || '';
          
          projects.push({
            id: 'project-' + index,
            name,
            type: 'project',
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

