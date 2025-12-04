/**
 * Perplexity Extraction Adapter
 *
 * Extracts conversations and content from Perplexity.ai
 */

import type { ExtractionAdapter } from './index'

export const perplexityAdapter: ExtractionAdapter = {
  name: 'Perplexity',
  urlPatterns: [/^https?:\/\/(www\.)?perplexity\.ai/i],

  getConversationsScript: (limit: number) => `
    (function() {
      try {
        const conversations = [];
        
        // Try to get thread list from sidebar
        const threadItems = document.querySelectorAll('[class*="thread-item"], [class*="ThreadItem"], a[href*="/search/"]');
        
        threadItems.forEach((item, index) => {
          if (index >= ${limit}) return;
          
          const titleEl = item.querySelector('[class*="title"]') || item;
          const title = titleEl.textContent?.trim() || 'Untitled Search';
          const href = item.getAttribute('href') || '';
          const id = href.split('/').pop() || 'unknown-' + index;
          
          conversations.push({
            id,
            title,
            messages: [],
            metadata: { source: 'perplexity', href, type: 'search' }
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
        
        // Perplexity has a unique structure with search queries and responses
        const queryElements = document.querySelectorAll('[class*="Query"], [class*="question"], [class*="search-query"]');
        const answerElements = document.querySelectorAll('[class*="Answer"], [class*="response"], [class*="prose"]');
        
        // Collect queries
        queryElements.forEach((el) => {
          const content = el.textContent?.trim() || '';
          if (content) {
            messages.push({
              role: 'user',
              content: content.substring(0, 10000)
            });
          }
        });
        
        // Collect answers (interleave if we have matching counts)
        answerElements.forEach((el, index) => {
          const content = el.textContent?.trim() || '';
          if (content && content.length > 50) { // Filter out short snippets
            // Try to insert after corresponding query
            const insertIndex = Math.min(index * 2 + 1, messages.length);
            messages.splice(insertIndex, 0, {
              role: 'assistant',
              content: content.substring(0, 10000)
            });
          }
        });
        
        // Alternative approach: look for the main thread
        if (messages.length === 0) {
          const threadEl = document.querySelector('[class*="thread"], main');
          if (threadEl) {
            const blocks = threadEl.querySelectorAll('[class*="block"], [class*="message"]');
            blocks.forEach((block) => {
              const isQuery = block.classList.toString().includes('query') ||
                             block.classList.toString().includes('question');
              const content = block.textContent?.trim() || '';
              
              if (content) {
                messages.push({
                  role: isQuery ? 'user' : 'assistant',
                  content: content.substring(0, 10000)
                });
              }
            });
          }
        }
        
        // Get title from the first query or page title
        const titleEl = document.querySelector('[class*="QueryTitle"], h1, title');
        const title = titleEl?.textContent?.trim() || 'Perplexity Search';
        
        // Get ID from URL
        const urlParts = window.location.pathname.split('/');
        const id = urlParts[urlParts.length - 1] || 'current';
        
        // Also try to extract sources/citations
        const sources = [];
        const sourceElements = document.querySelectorAll('[class*="source"], [class*="citation"] a');
        sourceElements.forEach((el) => {
          const href = el.getAttribute('href');
          const text = el.textContent?.trim();
          if (href && text) {
            sources.push({ url: href, title: text });
          }
        });
        
        return [{
          id,
          title,
          messages,
          metadata: {
            source: 'perplexity',
            url: window.location.href,
            extractedAt: new Date().toISOString(),
            sources: sources.slice(0, 20) // Limit sources
          }
        }];
      } catch (e) {
        return [{ error: e.message }];
      }
    })()
  `
}
