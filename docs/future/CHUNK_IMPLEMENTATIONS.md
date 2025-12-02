# Material Zones: AI Chunk Implementation Guide

**Parent Document**: [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)  
**Related Documents**: 
- [Artifact Viewers](./ARTIFACT_VIEWERS.md)
- [JavaScript Utility Library](./MATERIAL_ZONES_JS.md)
- [Flutter Library](./MATERIAL_ZONES_FLUTTER.md)

**Version**: 1.0.0

---

## Overview

This document provides complete, working implementations of all AI response chunk types across four frameworks:
- HTMX + Alpine.js
- React
- Flutter
- Svelte

Each chunk type includes decision criteria for AI assistants to automatically select the appropriate implementation based on content characteristics.

---

## Table of Contents

1. [Text Chunk](#text-chunk)
2. [Thinking/Reasoning Chunk](#thinkingreasoning-chunk)
3. [Citation Chunk](#citation-chunk)
4. [Memory Chunk](#memory-chunk)
5. [Artifact Chunk](#artifact-chunk)
6. [Error Chunk](#error-chunk)
7. [Loading/Stream Chunk](#loadingstream-chunk)
8. [Tool Result Chunk](#tool-result-chunk)

---

## Text Chunk

### Purpose
Display conversational text with full markdown support, including inline code, links, lists, and formatting.

### Decision Criteria for AI

Use Text Chunk when:
- Content is primarily natural language
- Contains standard markdown formatting
- No complex diagrams or executable code
- Length < 10,000 characters (otherwise consider pagination)

### Data Structure

```typescript
interface TextChunk {
  type: 'text';
  id: string;
  content: string;          // Markdown string
  timestamp: number;
  metadata?: {
    language?: string;      // For multilingual support
    tone?: string;          // formal, casual, technical
  };
}
```

### HTMX + Alpine.js Implementation

```html
<!-- text-chunk.html -->
<div class="zone-chunk zone-chunk--text"
     x-data="textChunk()"
     x-init="init()"
     data-chunk-id="{{ chunk.id }}"
     data-chunk-type="text">
  
  <div class="zone-chunk__content"
       x-ref="content"
       x-html="renderedContent"></div>
  
  <div class="zone-chunk__tools">
    <button class="zone-tool-button"
            @click="copyContent()"
            :aria-label="copied ? 'Copied!' : 'Copy'">
      <svg class="zone-icon" x-show="!copied">
        <use href="#icon-copy"></use>
      </svg>
      <svg class="zone-icon zone-icon--success" x-show="copied">
        <use href="#icon-check"></use>
      </svg>
    </button>
  </div>
</div>

<script>
function textChunk() {
  return {
    content: '',
    renderedContent: '',
    copied: false,
    
    init() {
      this.content = this.$el.dataset.content || '';
      this.renderContent();
    },
    
    renderContent() {
      // Configure marked
      marked.setOptions({
        gfm: true,
        breaks: true,
        highlight: (code, lang) => {
          if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
          }
          return hljs.highlightAuto(code).value;
        }
      });
      
      // Render markdown
      this.renderedContent = marked.parse(this.content);
      
      // Post-process for enhancements
      this.$nextTick(() => {
        this.enhanceLinks();
        this.enhanceCodeBlocks();
      });
    },
    
    enhanceLinks() {
      const links = this.$refs.content.querySelectorAll('a');
      links.forEach(link => {
        if (link.hostname !== window.location.hostname) {
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
          link.classList.add('zone-link--external');
        }
      });
    },
    
    enhanceCodeBlocks() {
      const blocks = this.$refs.content.querySelectorAll('pre code');
      blocks.forEach(block => {
        const pre = block.parentElement;
        pre.classList.add('zone-code-block');
        
        // Add language badge
        const lang = [...block.classList]
          .find(c => c.startsWith('language-'))
          ?.replace('language-', '') || 'text';
        
        const header = document.createElement('div');
        header.className = 'zone-code-block__header';
        header.innerHTML = `
          <span class="zone-code-block__language">${lang}</span>
          <button class="zone-tool-button" onclick="copyCode(this)">
            <svg class="zone-icon"><use href="#icon-copy"></use></svg>
          </button>
        `;
        
        pre.insertBefore(header, block);
      });
    },
    
    copyContent() {
      navigator.clipboard.writeText(this.content)
        .then(() => {
          this.copied = true;
          setTimeout(() => this.copied = false, 2000);
          
          // Dispatch event
          this.$dispatch('ai:event', {
            type: 'chunk-copied',
            chunkId: this.$el.dataset.chunkId
          });
        });
    }
  };
}

function copyCode(button) {
  const pre = button.closest('pre');
  const code = pre.querySelector('code').textContent;
  
  navigator.clipboard.writeText(code).then(() => {
    const icon = button.querySelector('svg use');
    icon.setAttribute('href', '#icon-check');
    setTimeout(() => icon.setAttribute('href', '#icon-copy'), 2000);
  });
}
</script>
```

### React Implementation

```typescript
// TextChunk.tsx
import React, { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import { useAIEvents } from './hooks/useAIEvents';
import { ChunkProps } from './types';

export const TextChunk: React.FC<ChunkProps> = ({ chunk }) => {
  const [copied, setCopied] = useState(false);
  const [renderedContent, setRenderedContent] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const { dispatch } = useAIEvents();
  
  useEffect(() => {
    renderContent();
  }, [chunk.content]);
  
  useEffect(() => {
    if (contentRef.current) {
      enhanceContent();
    }
  }, [renderedContent]);
  
  const renderContent = () => {
    marked.setOptions({
      gfm: true,
      breaks: true,
      highlight: (code: string, lang: string) => {
        if (lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
      }
    });
    
    setRenderedContent(marked.parse(chunk.content));
  };
  
  const enhanceContent = () => {
    if (!contentRef.current) return;
    
    // Enhance external links
    const links = contentRef.current.querySelectorAll('a');
    links.forEach(link => {
      const anchor = link as HTMLAnchorElement;
      if (anchor.hostname !== window.location.hostname) {
        anchor.setAttribute('target', '_blank');
        anchor.setAttribute('rel', 'noopener noreferrer');
        anchor.classList.add('zone-link--external');
      }
    });
    
    // Enhance code blocks
    const codeBlocks = contentRef.current.querySelectorAll('pre code');
    codeBlocks.forEach(block => {
      const pre = block.parentElement;
      if (!pre) return;
      
      pre.classList.add('zone-code-block');
      
      const lang = [...block.classList]
        .find(c => c.startsWith('language-'))
        ?.replace('language-', '') || 'text';
      
      const header = document.createElement('div');
      header.className = 'zone-code-block__header';
      header.innerHTML = `
        <span class="zone-code-block__language">${lang}</span>
      `;
      
      const copyBtn = document.createElement('button');
      copyBtn.className = 'zone-tool-button';
      copyBtn.innerHTML = '<svg class="zone-icon"><use href="#icon-copy"></use></svg>';
      copyBtn.onclick = () => copyCodeBlock(block.textContent || '');
      header.appendChild(copyBtn);
      
      pre.insertBefore(header, block);
    });
  };
  
  const copyCodeBlock = (code: string) => {
    navigator.clipboard.writeText(code);
    dispatch('code-copied', { chunkId: chunk.id });
  };
  
  const copyContent = () => {
    navigator.clipboard.writeText(chunk.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      dispatch('chunk-copied', { chunkId: chunk.id });
    });
  };
  
  return (
    <div 
      className="zone-chunk zone-chunk--text"
      data-chunk-id={chunk.id}
      data-chunk-type="text">
      
      <div 
        ref={contentRef}
        className="zone-chunk__content"
        dangerouslySetInnerHTML={{ __html: renderedContent }}
      />
      
      <div className="zone-chunk__tools">
        <button
          className="zone-tool-button"
          onClick={copyContent}
          aria-label={copied ? 'Copied!' : 'Copy'}>
          {copied ? (
            <svg className="zone-icon zone-icon--success">
              <use href="#icon-check" />
            </svg>
          ) : (
            <svg className="zone-icon">
              <use href="#icon-copy" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};
```

### Flutter Implementation

```dart
// text_chunk.dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:markdown/markdown.dart' as md;
import 'package:url_launcher/url_launcher.dart';
import '../models/chunk.dart';
import '../services/ai_event_bus.dart';
import '../theme/material_zones_theme.dart';

class TextChunk extends StatefulWidget {
  final Chunk chunk;
  
  const TextChunk({
    Key? key,
    required this.chunk,
  }) : super(key: key);
  
  @override
  State<TextChunk> createState() => _TextChunkState();
}

class _TextChunkState extends State<TextChunk> {
  bool _copied = false;
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final zones = MaterialZonesTheme.of(context);
    
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: zones.surfaceContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Markdown content
          MarkdownBody(
            data: widget.chunk.content,
            styleSheet: _buildMarkdownStyle(theme, zones),
            onTapLink: _handleLinkTap,
            builders: {
              'code': CodeElementBuilder(
                onCopy: _handleCodeCopy,
              ),
            },
            extensionSet: md.ExtensionSet(
              md.ExtensionSet.gitHubFlavored.blockSyntaxes,
              [
                md.EmojiSyntax(),
                ...md.ExtensionSet.gitHubFlavored.inlineSyntaxes
              ],
            ),
          ),
          
          const SizedBox(height: 8),
          
          // Tools
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              IconButton(
                icon: Icon(
                  _copied ? Icons.check : Icons.copy,
                  size: 18,
                ),
                onPressed: _copyContent,
                tooltip: _copied ? 'Copied!' : 'Copy',
                color: _copied ? zones.success : zones.onSurfaceVariant,
              ),
            ],
          ),
        ],
      ),
    );
  }
  
  MarkdownStyleSheet _buildMarkdownStyle(
    ThemeData theme,
    MaterialZonesTheme zones,
  ) {
    return MarkdownStyleSheet(
      p: TextStyle(
        fontSize: 16,
        color: zones.onSurface,
        height: 1.6,
      ),
      code: TextStyle(
        fontFamily: 'Courier',
        fontSize: 14,
        backgroundColor: zones.surfaceContainerHigh,
        color: zones.onSurface,
      ),
      codeblockDecoration: BoxDecoration(
        color: zones.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      blockquote: TextStyle(
        color: zones.onSurfaceVariant,
        fontStyle: FontStyle.italic,
      ),
      h1: TextStyle(
        fontSize: 28,
        fontWeight: FontWeight.bold,
        color: zones.onSurface,
      ),
      h2: TextStyle(
        fontSize: 24,
        fontWeight: FontWeight.bold,
        color: zones.onSurface,
      ),
      h3: TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.w600,
        color: zones.onSurface,
      ),
      a: TextStyle(
        color: zones.primary,
        decoration: TextDecoration.underline,
      ),
    );
  }
  
  void _handleLinkTap(String text, String? href, String title) async {
    if (href != null) {
      final uri = Uri.parse(href);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    }
  }
  
  void _handleCodeCopy(String code) {
    Clipboard.setData(ClipboardData(text: code));
    AIEventBus.dispatch(
      AIComponentEvent.codeCopied,
      metadata: {'chunkId': widget.chunk.id},
    );
    
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Code copied to clipboard'),
        duration: Duration(seconds: 2),
      ),
    );
  }
  
  void _copyContent() {
    Clipboard.setData(ClipboardData(text: widget.chunk.content));
    AIEventBus.dispatch(
      AIComponentEvent.chunkCopied,
      metadata: {'chunkId': widget.chunk.id},
    );
    
    setState(() {
      _copied = true;
    });
    
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() {
          _copied = false;
        });
      }
    });
  }
}

// Custom code block builder
class CodeElementBuilder extends MarkdownElementBuilder {
  final Function(String) onCopy;
  
  CodeElementBuilder({required this.onCopy});
  
  @override
  Widget visitElementAfter(md.Element element, TextStyle? preferredStyle) {
    final language = element.attributes['class']?.replaceAll('language-', '') ?? 'text';
    final code = element.textContent;
    
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: Colors.grey[900],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.grey[800],
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(8),
                topRight: Radius.circular(8),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  language.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.copy, size: 16),
                  onPressed: () => onCopy(code),
                  color: Colors.grey,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
          ),
          
          // Code content
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.all(12),
            child: SelectableText(
              code,
              style: const TextStyle(
                fontFamily: 'Courier',
                fontSize: 14,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
```

### Svelte Implementation

```svelte
<!-- TextChunk.svelte -->
<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
  import { marked } from 'marked';
  import hljs from 'highlight.js';
  import { aiEventStore } from './stores/aiEvents';
  import type { Chunk } from './types';
  
  export let chunk: Chunk;
  
  let contentRef: HTMLDivElement;
  let renderedContent = '';
  let copied = false;
  
  onMount(() => {
    renderContent();
  });
  
  afterUpdate(() => {
    enhanceContent();
  });
  
  function renderContent() {
    marked.setOptions({
      gfm: true,
      breaks: true,
      highlight: (code: string, lang: string) => {
        if (lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
      }
    });
    
    renderedContent = marked.parse(chunk.content);
  }
  
  function enhanceContent() {
    if (!contentRef) return;
    
    // Enhance external links
    const links = contentRef.querySelectorAll('a');
    links.forEach(link => {
      const anchor = link as HTMLAnchorElement;
      if (anchor.hostname !== window.location.hostname) {
        anchor.setAttribute('target', '_blank');
        anchor.setAttribute('rel', 'noopener noreferrer');
        anchor.classList.add('zone-link--external');
      }
    });
    
    // Enhance code blocks
    const codeBlocks = contentRef.querySelectorAll('pre code');
    codeBlocks.forEach(block => {
      const pre = block.parentElement;
      if (!pre || pre.querySelector('.zone-code-block__header')) return;
      
      pre.classList.add('zone-code-block');
      
      const lang = [...block.classList]
        .find(c => c.startsWith('language-'))
        ?.replace('language-', '') || 'text';
      
      const header = document.createElement('div');
      header.className = 'zone-code-block__header';
      header.innerHTML = `
        <span class="zone-code-block__language">${lang}</span>
      `;
      
      const copyBtn = document.createElement('button');
      copyBtn.className = 'zone-tool-button';
      copyBtn.innerHTML = '<svg class="zone-icon"><use href="#icon-copy"></use></svg>';
      copyBtn.onclick = () => copyCodeBlock(block.textContent || '');
      header.appendChild(copyBtn);
      
      pre.insertBefore(header, block);
    });
  }
  
  function copyCodeBlock(code: string) {
    navigator.clipboard.writeText(code);
    aiEventStore.dispatch('code-copied', { chunkId: chunk.id });
  }
  
  function copyContent() {
    navigator.clipboard.writeText(chunk.content).then(() => {
      copied = true;
      setTimeout(() => copied = false, 2000);
      aiEventStore.dispatch('chunk-copied', { chunkId: chunk.id });
    });
  }
</script>

<div 
  class="zone-chunk zone-chunk--text"
  data-chunk-id={chunk.id}
  data-chunk-type="text">
  
  <div 
    bind:this={contentRef}
    class="zone-chunk__content">
    {@html renderedContent}
  </div>
  
  <div class="zone-chunk__tools">
    <button
      class="zone-tool-button"
      on:click={copyContent}
      aria-label={copied ? 'Copied!' : 'Copy'}>
      {#if copied}
        <svg class="zone-icon zone-icon--success">
          <use href="#icon-check" />
        </svg>
      {:else}
        <svg class="zone-icon">
          <use href="#icon-copy" />
        </svg>
      {/if}
    </button>
  </div>
</div>
```

---

## Thinking/Reasoning Chunk

### Purpose
Display AI's internal reasoning process in an expandable/collapsible format.

### Decision Criteria for AI

Use Thinking Chunk when:
- Content shows step-by-step reasoning
- Contains analysis or problem-solving process
- User explicitly requests to see reasoning
- Complex query that benefits from transparency

### Data Structure

```typescript
interface ThinkingChunk {
  type: 'thinking';
  id: string;
  content: string;          // Plain text reasoning
  timestamp: number;
  expanded?: boolean;       // Initial state
  metadata?: {
    duration?: number;      // Thinking duration in ms
    steps?: number;         // Number of reasoning steps
  };
}
```

### HTMX + Alpine.js Implementation

```html
<!-- thinking-chunk.html -->
<div class="zone-chunk zone-chunk--thinking"
     x-data="thinkingChunk()"
     x-init="init()"
     data-chunk-id="{{ chunk.id }}"
     data-chunk-type="thinking">
  
  <button class="zone-chunk__toggle"
          @click="toggle()"
          :aria-expanded="expanded.toString()">
    <svg class="zone-icon zone-icon--thinking" :class="{ 'rotate-90': expanded }">
      <use href="#icon-chevron-right"></use>
    </svg>
    <svg class="zone-icon zone-icon--brain">
      <use href="#icon-brain"></use>
    </svg>
    <span class="zone-chunk__label">
      <template x-if="!expanded">Thinking...</template>
      <template x-if="expanded">Hide reasoning</template>
    </span>
    <span class="zone-chunk__badge" x-show="metadata.duration">
      <span x-text="formatDuration(metadata.duration)"></span>
    </span>
  </button>
  
  <div class="zone-chunk__content"
       x-show="expanded"
       x-collapse>
    <pre class="zone-thinking-content" x-text="content"></pre>
    
    <div class="zone-chunk__tools">
      <button class="zone-tool-button"
              @click="copyContent()"
              :aria-label="copied ? 'Copied!' : 'Copy reasoning'">
        <svg class="zone-icon" x-show="!copied">
          <use href="#icon-copy"></use>
        </svg>
        <svg class="zone-icon zone-icon--success" x-show="copied">
          <use href="#icon-check"></use>
        </svg>
      </button>
    </div>
  </div>
</div>

<script>
function thinkingChunk() {
  return {
    content: '',
    expanded: false,
    copied: false,
    metadata: {},
    
    init() {
      this.content = this.$el.dataset.content || '';
      this.expanded = this.$el.dataset.expanded === 'true';
      this.metadata = JSON.parse(this.$el.dataset.metadata || '{}');
    },
    
    toggle() {
      this.expanded = !this.expanded;
      
      if (this.expanded) {
        this.$dispatch('ai:event', {
          type: 'thinking-expanded',
          chunkId: this.$el.dataset.chunkId
        });
      }
    },
    
    formatDuration(ms) {
      if (ms < 1000) return `${ms}ms`;
      return `${(ms / 1000).toFixed(1)}s`;
    },
    
    copyContent() {
      navigator.clipboard.writeText(this.content)
        .then(() => {
          this.copied = true;
          setTimeout(() => this.copied = false, 2000);
          
          this.$dispatch('ai:event', {
            type: 'thinking-copied',
            chunkId: this.$el.dataset.chunkId
          });
        });
    }
  };
}
</script>
```

### React Implementation

```typescript
// ThinkingChunk.tsx
import React, { useState } from 'react';
import { useAIEvents } from './hooks/useAIEvents';
import { ChunkProps } from './types';

export const ThinkingChunk: React.FC<ChunkProps> = ({ chunk }) => {
  const [expanded, setExpanded] = useState(chunk.expanded || false);
  const [copied, setCopied] = useState(false);
  const { dispatch } = useAIEvents();
  
  const toggle = () => {
    setExpanded(!expanded);
    
    if (!expanded) {
      dispatch('thinking-expanded', { chunkId: chunk.id });
    }
  };
  
  const copyContent = () => {
    navigator.clipboard.writeText(chunk.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      dispatch('thinking-copied', { chunkId: chunk.id });
    });
  };
  
  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };
  
  return (
    <div 
      className="zone-chunk zone-chunk--thinking"
      data-chunk-id={chunk.id}
      data-chunk-type="thinking">
      
      <button
        className="zone-chunk__toggle"
        onClick={toggle}
        aria-expanded={expanded}>
        <svg className={`zone-icon zone-icon--thinking ${expanded ? 'rotate-90' : ''}`}>
          <use href="#icon-chevron-right" />
        </svg>
        <svg className="zone-icon zone-icon--brain">
          <use href="#icon-brain" />
        </svg>
        <span className="zone-chunk__label">
          {expanded ? 'Hide reasoning' : 'Thinking...'}
        </span>
        {chunk.metadata?.duration && (
          <span className="zone-chunk__badge">
            {formatDuration(chunk.metadata.duration)}
          </span>
        )}
      </button>
      
      {expanded && (
        <div className="zone-chunk__content">
          <pre className="zone-thinking-content">{chunk.content}</pre>
          
          <div className="zone-chunk__tools">
            <button
              className="zone-tool-button"
              onClick={copyContent}
              aria-label={copied ? 'Copied!' : 'Copy reasoning'}>
              {copied ? (
                <svg className="zone-icon zone-icon--success">
                  <use href="#icon-check" />
                </svg>
              ) : (
                <svg className="zone-icon">
                  <use href="#icon-copy" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
```

### Flutter Implementation

```dart
// thinking_chunk.dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/chunk.dart';
import '../services/ai_event_bus.dart';
import '../theme/material_zones_theme.dart';

class ThinkingChunk extends StatefulWidget {
  final Chunk chunk;
  
  const ThinkingChunk({
    Key? key,
    required this.chunk,
  }) : super(key: key);
  
  @override
  State<ThinkingChunk> createState() => _ThinkingChunkState();
}

class _ThinkingChunkState extends State<ThinkingChunk>
    with SingleTickerProviderStateMixin {
  late bool _expanded;
  bool _copied = false;
  late AnimationController _controller;
  late Animation<double> _rotationAnimation;
  late Animation<double> _heightAnimation;
  
  @override
  void initState() {
    super.initState();
    _expanded = widget.chunk.expanded ?? false;
    
    _controller = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    
    _rotationAnimation = Tween<double>(
      begin: 0,
      end: 0.25, // 90 degrees
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOut,
    ));
    
    _heightAnimation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOut,
    );
    
    if (_expanded) {
      _controller.value = 1.0;
    }
  }
  
  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
  
  @override
  Widget build(BuildContext context) {
    final zones = MaterialZonesTheme.of(context);
    
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: zones.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Toggle button
          InkWell(
            onTap: _toggle,
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  RotationTransition(
                    turns: _rotationAnimation,
                    child: Icon(
                      Icons.chevron_right,
                      size: 20,
                      color: zones.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Icon(
                    Icons.psychology,
                    size: 20,
                    color: zones.onSurfaceVariant,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _expanded ? 'Hide reasoning' : 'Thinking...',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: zones.onSurfaceVariant,
                      ),
                    ),
                  ),
                  if (widget.chunk.metadata?['duration'] != null)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: zones.surfaceContainerHigh,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        _formatDuration(widget.chunk.metadata!['duration']),
                        style: TextStyle(
                          fontSize: 12,
                          color: zones.onSurfaceVariant,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          
          // Content
          SizeTransition(
            sizeFactor: _heightAnimation,
            child: Container(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: zones.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: SelectableText(
                      widget.chunk.content,
                      style: TextStyle(
                        fontFamily: 'Courier',
                        fontSize: 14,
                        color: zones.onSurfaceVariant,
                        height: 1.5,
                      ),
                    ),
                  ),
                  
                  const SizedBox(height: 8),
                  
                  // Tools
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      IconButton(
                        icon: Icon(
                          _copied ? Icons.check : Icons.copy,
                          size: 18,
                        ),
                        onPressed: _copyContent,
                        tooltip: _copied ? 'Copied!' : 'Copy reasoning',
                        color: _copied ? zones.success : zones.onSurfaceVariant,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  void _toggle() {
    setState(() {
      _expanded = !_expanded;
    });
    
    if (_expanded) {
      _controller.forward();
      AIEventBus.dispatch(
        AIComponentEvent.thinkingExpanded,
        metadata: {'chunkId': widget.chunk.id},
      );
    } else {
      _controller.reverse();
    }
  }
  
  void _copyContent() {
    Clipboard.setData(ClipboardData(text: widget.chunk.content));
    AIEventBus.dispatch(
      AIComponentEvent.thinkingCopied,
      metadata: {'chunkId': widget.chunk.id},
    );
    
    setState(() {
      _copied = true;
    });
    
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() {
          _copied = false;
        });
      }
    });
  }
  
  String _formatDuration(dynamic duration) {
    final ms = duration as int;
    if (ms < 1000) return '${ms}ms';
    return '${(ms / 1000).toStringAsFixed(1)}s';
  }
}
```

### Svelte Implementation

```svelte
<!-- ThinkingChunk.svelte -->
<script lang="ts">
  import { slide } from 'svelte/transition';
  import { aiEventStore } from './stores/aiEvents';
  import type { Chunk } from './types';
  
  export let chunk: Chunk;
  
  let expanded = chunk.expanded || false;
  let copied = false;
  
  function toggle() {
    expanded = !expanded;
    
    if (expanded) {
      aiEventStore.dispatch('thinking-expanded', { chunkId: chunk.id });
    }
  }
  
  function copyContent() {
    navigator.clipboard.writeText(chunk.content).then(() => {
      copied = true;
      setTimeout(() => copied = false, 2000);
      aiEventStore.dispatch('thinking-copied', { chunkId: chunk.id });
    });
  }
  
  function formatDuration(ms?: number): string {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }
</script>

<div 
  class="zone-chunk zone-chunk--thinking"
  data-chunk-id={chunk.id}
  data-chunk-type="thinking">
  
  <button
    class="zone-chunk__toggle"
    on:click={toggle}
    aria-expanded={expanded}>
    <svg class="zone-icon zone-icon--thinking" class:rotate-90={expanded}>
      <use href="#icon-chevron-right" />
    </svg>
    <svg class="zone-icon zone-icon--brain">
      <use href="#icon-brain" />
    </svg>
    <span class="zone-chunk__label">
      {expanded ? 'Hide reasoning' : 'Thinking...'}
    </span>
    {#if chunk.metadata?.duration}
      <span class="zone-chunk__badge">
        {formatDuration(chunk.metadata.duration)}
      </span>
    {/if}
  </button>
  
  {#if expanded}
    <div class="zone-chunk__content" transition:slide>
      <pre class="zone-thinking-content">{chunk.content}</pre>
      
      <div class="zone-chunk__tools">
        <button
          class="zone-tool-button"
          on:click={copyContent}
          aria-label={copied ? 'Copied!' : 'Copy reasoning'}>
          {#if copied}
            <svg class="zone-icon zone-icon--success">
              <use href="#icon-check" />
            </svg>
          {:else}
            <svg class="zone-icon">
              <use href="#icon-copy" />
            </svg>
          {/if}
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .rotate-90 {
    transform: rotate(90deg);
    transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
  }
</style>
```

---

## Citation Chunk

### Purpose
Display source references with metadata, links, and optional snippets.

### Decision Criteria for AI

Use Citation Chunk when:
- Response references external sources
- Web search results need attribution
- Academic or research context requires citations
- Multiple sources support the answer

### Data Structure

```typescript
interface CitationChunk {
  type: 'citation';
  id: string;
  citations: Array<{
    index: number;
    title: string;
    url: string;
    snippet?: string;
    author?: string;
    date?: string;
    source?: string;     // domain or publication name
    favicon?: string;    // URL to favicon
  }>;
  timestamp: number;
}
```

### Implementation

Due to length constraints, I'll provide the HTMX implementation here and reference it for other frameworks with key differences noted.

### HTMX + Alpine.js Implementation

```html
<!-- citation-chunk.html -->
<div class="zone-chunk zone-chunk--citation"
     x-data="citationChunk()"
     x-init="init()"
     data-chunk-id="{{ chunk.id }}"
     data-chunk-type="citation">
  
  <div class="zone-citation-header">
    <svg class="zone-icon">
      <use href="#icon-bookmark"></use>
    </svg>
    <span class="zone-chunk__label">Sources</span>
    <span class="zone-citation-count" x-text="`(${citations.length})`"></span>
  </div>
  
  <div class="zone-citation-list">
    <template x-for="citation in citations" :key="citation.index">
      <a :href="citation.url"
         class="zone-citation-item"
         target="_blank"
         rel="noopener noreferrer"
         @click="trackCitationClick(citation)">
        
        <!-- Index badge -->
        <span class="zone-citation-index" x-text="citation.index"></span>
        
        <!-- Favicon -->
        <img x-show="citation.favicon"
             :src="citation.favicon"
             :alt="citation.source"
             class="zone-citation-favicon"
             loading="lazy"
             onerror="this.style.display='none'">
        
        <!-- Content -->
        <div class="zone-citation-content">
          <span class="zone-citation-title" x-text="citation.title"></span>
          
          <div class="zone-citation-meta">
            <span x-show="citation.source" x-text="citation.source"></span>
            <span x-show="citation.date" x-text="formatDate(citation.date)"></span>
          </div>
          
          <p x-show="citation.snippet"
             class="zone-citation-snippet"
             x-text="citation.snippet"></p>
        </div>
        
        <!-- External link icon -->
        <svg class="zone-icon zone-icon--small zone-icon--external">
          <use href="#icon-external-link"></use>
        </svg>
      </a>
    </template>
  </div>
</div>

<script>
function citationChunk() {
  return {
    citations: [],
    
    init() {
      this.citations = JSON.parse(this.$el.dataset.citations || '[]');
    },
    
    formatDate(dateStr) {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short',
        day: 'numeric'
      });
    },
    
    trackCitationClick(citation) {
      this.$dispatch('ai:event', {
        type: 'citation-clicked',
        chunkId: this.$el.dataset.chunkId,
        citationIndex: citation.index,
        citationUrl: citation.url
      });
    }
  };
}
</script>
```

---

## Memory Chunk

### Purpose
Display recalled context, user preferences, or previous conversation references.

### Decision Criteria for AI

Use Memory Chunk when:
- Referencing previous conversations
- Showing stored user preferences
- Displaying context retrieved from long-term memory
- Explaining personalization choices

### Data Structure

```typescript
interface MemoryChunk {
  type: 'memory';
  id: string;
  memories: Array<{
    key: string;
    value: string;
    timestamp: string;
    source?: 'user' | 'learned' | 'preference';
  }>;
  timestamp: number;
}
```

### HTMX + Alpine.js Implementation

```html
<!-- memory-chunk.html -->
<div class="zone-chunk zone-chunk--memory"
     x-data="memoryChunk()"
     x-init="init()"
     data-chunk-id="{{ chunk.id }}">
  
  <button class="zone-chunk__toggle"
          @click="expanded = !expanded"
          :aria-expanded="expanded.toString()">
    <svg class="zone-icon" :class="{ 'rotate-90': expanded }">
      <use href="#icon-chevron-right"></use>
    </svg>
    <svg class="zone-icon zone-icon--memory">
      <use href="#icon-database"></use>
    </svg>
    <span class="zone-chunk__label">
      Context recalled (<span x-text="memories.length"></span>)
    </span>
  </button>
  
  <div class="zone-memory-items"
       x-show="expanded"
       x-collapse>
    <template x-for="memory in memories" :key="memory.key">
      <div class="zone-memory-item">
        <div class="zone-memory-key">
          <svg class="zone-icon zone-icon--small">
            <use :href="`#icon-${getMemoryIcon(memory.source)}`"></use>
          </svg>
          <span x-text="memory.key"></span>
        </div>
        <div class="zone-memory-value" x-text="memory.value"></div>
        <div class="zone-memory-meta">
          <span x-text="formatTimestamp(memory.timestamp)"></span>
        </div>
      </div>
    </template>
  </div>
</div>

<script>
function memoryChunk() {
  return {
    memories: [],
    expanded: false,
    
    init() {
      this.memories = JSON.parse(this.$el.dataset.memories || '[]');
    },
    
    getMemoryIcon(source) {
      const icons = {
        user: 'user',
        learned: 'brain',
        preference: 'settings'
      };
      return icons[source] || 'info';
    },
    
    formatTimestamp(ts) {
      const date = new Date(ts);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      
      if (days === 0) return 'Today';
      if (days === 1) return 'Yesterday';
      if (days < 7) return `${days} days ago`;
      if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
      return date.toLocaleDateString();
    }
  };
}
</script>
```

---

## Artifact Chunk

### Purpose
Container for generated code, diagrams, or other interactive content.

**Note**: Full artifact implementations are in [ARTIFACT_VIEWERS.md](./ARTIFACT_VIEWERS.md)

### Decision Criteria for AI

Use Artifact Chunk when:
- Generating executable code (HTML, React, etc.)
- Creating diagrams (Mermaid, SVG)
- Producing downloadable content
- Building interactive components
- Content exceeds 50 lines

### Data Structure

```typescript
interface ArtifactChunk {
  type: 'artifact';
  id: string;
  artifactType: 'html' | 'react' | 'markdown' | 'mermaid' | 'svg' | 'image' | 'video' | 'code';
  language?: string;
  title?: string;
  content: string;
  metadata?: {
    filename?: string;
    description?: string;
    dependencies?: string[];
  };
  timestamp: number;
}
```

### Basic Implementation (see ARTIFACT_VIEWERS.md for complete versions)

```html
<!-- artifact-chunk.html -->
<div class="zone-artifact"
     x-data="artifactChunk()"
     data-artifact-id="{{ artifact.id }}">
  
  <div class="zone-artifact__header">
    <div class="zone-artifact__meta">
      <svg class="zone-icon">
        <use :href="`#icon-${getTypeIcon(type)}`"></use>
      </svg>
      <span class="zone-artifact__title" x-text="title"></span>
      <span class="zone-artifact__type" x-text="type"></span>
    </div>
    
    <div class="zone-artifact__tools">
      <!-- View mode toggle -->
      <!-- Copy, download, share buttons -->
      <!-- See ARTIFACT_VIEWERS.md for complete implementation -->
    </div>
  </div>
  
  <div class="zone-artifact__content">
    <!-- Type-specific rendering -->
  </div>
</div>
```

---

## Error Chunk

### Purpose
Display error messages with context and recovery options.

### Decision Criteria for AI

Use Error Chunk when:
- API call fails
- Validation error occurs
- Rate limit hit
- Timeout or network error
- Any recoverable error condition

### Data Structure

```typescript
interface ErrorChunk {
  type: 'error';
  id: string;
  errorType: 'api' | 'validation' | 'rate_limit' | 'timeout' | 'network' | 'unknown';
  message: string;
  details?: string;
  recoveryOptions?: Array<{
    label: string;
    action: string;
  }>;
  timestamp: number;
}
```

### HTMX + Alpine.js Implementation

```html
<!-- error-chunk.html -->
<div class="zone-chunk zone-chunk--error"
     x-data="errorChunk()"
     x-init="init()"
     data-chunk-id="{{ chunk.id }}">
  
  <div class="zone-error-content">
    <div class="zone-error-icon">
      <svg class="zone-icon zone-icon--error">
        <use href="#icon-alert-circle"></use>
      </svg>
    </div>
    
    <div class="zone-error-text">
      <h4 class="zone-error-title" x-text="getErrorTitle(errorType)"></h4>
      <p class="zone-error-message" x-text="message"></p>
      
      <details x-show="details" class="zone-error-details">
        <summary>Technical details</summary>
        <pre x-text="details"></pre>
      </details>
    </div>
  </div>
  
  <div class="zone-error-actions" x-show="recoveryOptions.length > 0">
    <template x-for="option in recoveryOptions" :key="option.action">
      <button class="zone-button zone-button--secondary"
              @click="executeRecovery(option.action)"
              x-text="option.label"></button>
    </template>
  </div>
</div>

<script>
function errorChunk() {
  return {
    errorType: 'unknown',
    message: '',
    details: null,
    recoveryOptions: [],
    
    init() {
      this.errorType = this.$el.dataset.errorType || 'unknown';
      this.message = this.$el.dataset.message || '';
      this.details = this.$el.dataset.details || null;
      this.recoveryOptions = JSON.parse(this.$el.dataset.recoveryOptions || '[]');
    },
    
    getErrorTitle(type) {
      const titles = {
        api: 'API Error',
        validation: 'Validation Error',
        rate_limit: 'Rate Limit Exceeded',
        timeout: 'Request Timeout',
        network: 'Network Error',
        unknown: 'An Error Occurred'
      };
      return titles[type] || titles.unknown;
    },
    
    executeRecovery(action) {
      this.$dispatch('ai:error-recovery', { action });
    }
  };
}
</script>
```

---

## Loading/Stream Chunk

### Purpose
Show loading states and streaming content progress.

### Decision Criteria for AI

Use Loading Chunk when:
- Response is streaming
- Long-running operation in progress
- Waiting for external API
- Processing user upload

### Data Structure

```typescript
interface LoadingChunk {
  type: 'loading';
  id: string;
  message?: string;
  progress?: number;      // 0-100
  stage?: string;         // Optional stage label
  timestamp: number;
}
```

### HTMX + Alpine.js Implementation

```html
<!-- loading-chunk.html -->
<div class="zone-chunk zone-chunk--loading"
     x-data="loadingChunk()"
     data-chunk-id="{{ chunk.id }}">
  
  <div class="zone-loading-content">
    <!-- Spinner -->
    <div class="zone-spinner">
      <svg class="zone-spinner__svg" viewBox="0 0 50 50">
        <circle class="zone-spinner__circle"
                cx="25" cy="25" r="20"
                fill="none"
                stroke-width="4"></circle>
      </svg>
    </div>
    
    <!-- Message -->
    <div class="zone-loading-text">
      <span x-text="message || 'Processing...'"></span>
      <span x-show="stage" class="zone-loading-stage" x-text="stage"></span>
    </div>
    
    <!-- Progress bar -->
    <div x-show="progress !== null" class="zone-progress-bar">
      <div class="zone-progress-fill"
           :style="`width: ${progress}%`"></div>
      <span class="zone-progress-text" x-text="`${progress}%`"></span>
    </div>
  </div>
</div>

<script>
function loadingChunk() {
  return {
    message: this.$el.dataset.message || null,
    progress: this.$el.dataset.progress ? parseInt(this.$el.dataset.progress) : null,
    stage: this.$el.dataset.stage || null
  };
}
</script>
```

---

## Tool Result Chunk

### Purpose
Display results from tool/function calls with structured output.

### Decision Criteria for AI

Use Tool Result Chunk when:
- External tool/API was called
- Function execution completed
- File operation performed
- Search results returned

### Data Structure

```typescript
interface ToolResultChunk {
  type: 'tool_result';
  id: string;
  toolName: string;
  input?: any;
  output: any;
  duration?: number;
  success: boolean;
  timestamp: number;
}
```

### HTMX + Alpine.js Implementation

```html
<!-- tool-result-chunk.html -->
<div class="zone-chunk zone-chunk--tool-result"
     x-data="toolResultChunk()"
     x-init="init()"
     data-chunk-id="{{ chunk.id }}">
  
  <button class="zone-chunk__toggle"
          @click="expanded = !expanded">
    <svg class="zone-icon" :class="{ 'rotate-90': expanded }">
      <use href="#icon-chevron-right"></use>
    </svg>
    <svg class="zone-icon" :class="success ? 'zone-icon--success' : 'zone-icon--error'">
      <use :href="success ? '#icon-check-circle' : '#icon-x-circle'"></use>
    </svg>
    <span class="zone-chunk__label">
      Tool: <strong x-text="toolName"></strong>
    </span>
    <span x-show="duration" class="zone-chunk__badge" x-text="`${duration}ms`"></span>
  </button>
  
  <div class="zone-tool-result-content"
       x-show="expanded"
       x-collapse>
    
    <!-- Input -->
    <div x-show="input" class="zone-tool-section">
      <h5 class="zone-tool-section__title">Input</h5>
      <pre class="zone-tool-section__content" x-text="JSON.stringify(input, null, 2)"></pre>
    </div>
    
    <!-- Output -->
    <div class="zone-tool-section">
      <h5 class="zone-tool-section__title">Output</h5>
      <pre class="zone-tool-section__content" x-text="formatOutput(output)"></pre>
    </div>
    
    <div class="zone-chunk__tools">
      <button class="zone-tool-button" @click="copyOutput()">
        <svg class="zone-icon"><use href="#icon-copy"></use></svg>
      </button>
    </div>
  </div>
</div>

<script>
function toolResultChunk() {
  return {
    toolName: '',
    input: null,
    output: null,
    duration: null,
    success: true,
    expanded: false,
    
    init() {
      this.toolName = this.$el.dataset.toolName || '';
      this.input = JSON.parse(this.$el.dataset.input || 'null');
      this.output = JSON.parse(this.$el.dataset.output || 'null');
      this.duration = parseInt(this.$el.dataset.duration) || null;
      this.success = this.$el.dataset.success !== 'false';
    },
    
    formatOutput(output) {
      if (typeof output === 'string') return output;
      return JSON.stringify(output, null, 2);
    },
    
    copyOutput() {
      const text = this.formatOutput(this.output);
      navigator.clipboard.writeText(text);
    }
  };
}
</script>
```

---

## AI Selection Decision Tree

Use this decision tree to help AI assistants automatically choose the correct chunk type:

```
Is this reasoning/thinking process?
  └─ YES → ThinkingChunk
  └─ NO ↓

Does it reference external sources?
  └─ YES → CitationChunk
  └─ NO ↓

Is it generated code/diagram/artifact?
  └─ YES → ArtifactChunk (see ARTIFACT_VIEWERS.md for type selection)
  └─ NO ↓

Is it an error condition?
  └─ YES → ErrorChunk
  └─ NO ↓

Is it loading/streaming?
  └─ YES → LoadingChunk
  └─ NO ↓

Is it a tool/function result?
  └─ YES → ToolResultChunk
  └─ NO ↓

Is it recalled context/memory?
  └─ YES → MemoryChunk
  └─ NO ↓

Default → TextChunk
```

---

## Next Steps

- **[Artifact Viewers](./ARTIFACT_VIEWERS.md)** - Complete implementations for all artifact types
- **[JavaScript Utility Library](./MATERIAL_ZONES_JS.md)** - Cross-framework facade for consistent behavior
- **[Flutter Library](./MATERIAL_ZONES_FLUTTER.md)** - Complete Flutter implementation

---

## Common Patterns

### Chunk Container Wrapper

All chunks can be wrapped in a universal container for consistent layout:

```html
<div class="zone-chat-message"
     data-message-id="{{ message.id }}">
  <!-- Multiple chunks here -->
  <div class="zone-chunk-container">
    <!-- TextChunk -->
    <!-- ThinkingChunk -->
    <!-- CitationChunk -->
    <!-- ArtifactChunk -->
  </div>
  
  <!-- Message-level tools -->
  <div class="zone-message-tools">
    <button>Copy all</button>
    <button>Regenerate</button>
    <button>Share</button>
  </div>
</div>
```

### Event Handling

All chunk implementations dispatch standard events:

```javascript
// Listen for chunk events
document.addEventListener('ai:event', (e) => {
  const { type, chunkId, ...rest } = e.detail;
  
  switch(type) {
    case 'chunk-copied':
      showToast('Content copied');
      break;
    case 'thinking-expanded':
      trackAnalytics('thinking_expanded', { chunkId });
      break;
    case 'citation-clicked':
      trackAnalytics('citation_clicked', rest);
      break;
  }
});
```

---

This guide provides production-ready implementations for all AI chunk types. For artifact-specific implementations and viewers, see [ARTIFACT_VIEWERS.md](./ARTIFACT_VIEWERS.md).
