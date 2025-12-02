# Material Zones: JavaScript Utility Library

**Parent Document**: [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)  
**Related Documents**: 
- [Chunk Implementations](./CHUNK_IMPLEMENTATIONS.md)
- [Artifact Viewers](./ARTIFACT_VIEWERS.md)
- [Flutter Library](./MATERIAL_ZONES_FLUTTER.md)

**Version**: 1.0.0

---

## Overview

The Material Zones JavaScript Library (`material-zones.js`) provides a unified facade API that works consistently across HTMX/Alpine.js, React, and Svelte. This ensures AI coding assistants can generate code once that runs everywhere.

**Key Principle**: Write once, render anywhere.

---

## Installation

### NPM/Yarn

```bash
npm install material-zones
# or
yarn add material-zones
```

### CDN

```html
<!-- Core library -->
<script src="https://cdn.jsdelivr.net/npm/material-zones@1.0.0/dist/material-zones.min.js"></script>

<!-- Framework adapters -->
<script src="https://cdn.jsdelivr.net/npm/material-zones@1.0.0/dist/adapters/htmx.min.js"></script>
<!-- OR -->
<script src="https://cdn.jsdelivr.net/npm/material-zones@1.0.0/dist/adapters/react.min.js"></script>
<!-- OR -->
<script src="https://cdn.jsdelivr.net/npm/material-zones@1.0.0/dist/adapters/svelte.min.js"></script>
```

---

## Core Architecture

### Adapter Pattern

The library uses an adapter pattern to provide framework-specific implementations while maintaining a consistent API.

```
MaterialZones API (Unified Interface)
    ↓
Framework Detector
    ↓
├─ HTMX/Alpine Adapter
├─ React Adapter
└─ Svelte Adapter
```

---

## Initialization

### Auto-Detection

```javascript
// Automatically detects and initializes the appropriate adapter
import MaterialZones from 'material-zones';

const zones = new MaterialZones({
  // Optional configuration
  theme: {
    primaryHue: 210,
    darkMode: 'auto' // 'auto', 'light', 'dark'
  },
  events: {
    onChunkRendered: (chunk) => console.log('Rendered:', chunk),
    onArtifactViewed: (artifact) => console.log('Viewed:', artifact)
  }
});
```

### Manual Adapter Selection

```javascript
import MaterialZones from 'material-zones';
import HTMXAdapter from 'material-zones/adapters/htmx';

const zones = new MaterialZones({
  adapter: new HTMXAdapter()
});
```

---

## API Reference

### Chunk Rendering

#### `renderChunk(chunk, container)`

Renders any chunk type to the specified container.

```javascript
// Works identically in HTMX, React, and Svelte
zones.renderChunk({
  type: 'text',
  id: 'chunk-1',
  content: 'Hello **world**!'
}, document.getElementById('container'));
```

**Framework Implementations**:

```javascript
// HTMX/Alpine - Injects HTML
zones.renderChunk(chunk, element); // Adds Alpine.js component

// React - Returns component
const ChunkComponent = zones.renderChunk(chunk);
<ChunkComponent />

// Svelte - Returns component
const ChunkComponent = zones.renderChunk(chunk);
<svelte:component this={ChunkComponent} />
```

#### `renderTextChunk(content, options)`

```javascript
zones.renderTextChunk('# Hello World\n\nThis is **markdown**.', {
  containerId: 'chat-area',
  tools: ['copy', 'regenerate']
});
```

#### `renderThinkingChunk(content, options)`

```javascript
zones.renderThinkingChunk('Step 1: Analyze the problem...', {
  containerId: 'chat-area',
  expanded: false,
  metadata: {
    duration: 1200
  }
});
```

#### `renderCitationChunk(citations, options)`

```javascript
zones.renderCitationChunk([
  {
    index: 1,
    title: 'Example Article',
    url: 'https://example.com',
    snippet: 'This is a snippet...'
  }
], {
  containerId: 'chat-area'
});
```

#### `renderArtifactChunk(artifact, options)`

```javascript
zones.renderArtifactChunk({
  id: 'artifact-1',
  type: 'react',
  title: 'Counter Component',
  content: 'function Counter() { ... }'
}, {
  containerId: 'artifacts',
  viewMode: 'preview'
});
```

---

### Message Management

#### `createMessage(content, options)`

Creates a complete message with multiple chunks.

```javascript
const message = zones.createMessage({
  id: 'msg-1',
  role: 'assistant',
  chunks: [
    {
      type: 'thinking',
      content: 'Let me analyze this...'
    },
    {
      type: 'text',
      content: 'Based on my analysis...'
    },
    {
      type: 'artifact',
      artifactType: 'code',
      content: 'function example() { ... }'
    }
  ]
});

zones.renderMessage(message, document.getElementById('chat'));
```

---

### Event System

#### `on(eventName, callback)`

```javascript
zones.on('chunk-rendered', (data) => {
  console.log('Chunk rendered:', data.chunkId);
});

zones.on('artifact-copied', (data) => {
  console.log('Artifact copied:', data.artifactId);
});

zones.on('thinking-expanded', (data) => {
  console.log('Thinking expanded:', data.chunkId);
});
```

#### `off(eventName, callback)`

```javascript
const handler = (data) => console.log(data);
zones.on('chunk-rendered', handler);
zones.off('chunk-rendered', handler);
```

#### `dispatch(eventName, data)`

```javascript
zones.dispatch('custom-event', {
  customData: 'value'
});
```

---

### Markdown Utilities

#### `parseMarkdown(content, options)`

```javascript
const html = zones.parseMarkdown('# Hello\n\n```js\nconsole.log("hi");\n```', {
  gfm: true,
  breaks: true,
  sanitize: false
});
```

#### `highlightCode(code, language)`

```javascript
const highlighted = zones.highlightCode('function test() {}', 'javascript');
```

---

### Artifact Management

#### `createArtifact(type, content, metadata)`

```javascript
const artifact = zones.createArtifact('html', '<h1>Hello</h1>', {
  title: 'My Page',
  filename: 'index.html'
});
```

#### `renderArtifact(artifact, container)`

```javascript
zones.renderArtifact(artifact, document.getElementById('preview'));
```

#### `downloadArtifact(artifact)`

```javascript
zones.downloadArtifact(artifact); // Triggers download
```

---

### Theme Management

#### `setTheme(theme)`

```javascript
zones.setTheme({
  primaryHue: 200,
  darkMode: true
});
```

#### `getTheme()`

```javascript
const currentTheme = zones.getTheme();
console.log(currentTheme.primaryHue); // 200
```

#### `applyPersonalization(image)`

```javascript
// Extract primary color from image and apply theme
zones.applyPersonalization(imageFile)
  .then(theme => {
    console.log('Applied theme:', theme);
  });
```

---

## Complete Implementation

### Core Library (`material-zones.js`)

```javascript
/**
 * Material Zones - Universal AI Component Library
 * @version 1.0.0
 */

class MaterialZones {
  constructor(options = {}) {
    this.options = options;
    this.adapter = options.adapter || this.detectAdapter();
    this.eventHandlers = new Map();
    this.theme = options.theme || this.getDefaultTheme();
    
    this.init();
  }
  
  /**
   * Initialize the library
   */
  init() {
    this.applyTheme(this.theme);
    this.setupEventListeners();
    
    if (this.options.events) {
      Object.entries(this.options.events).forEach(([event, handler]) => {
        this.on(event, handler);
      });
    }
  }
  
  /**
   * Detect which framework is being used
   */
  detectAdapter() {
    // Check for React
    if (typeof React !== 'undefined' && typeof ReactDOM !== 'undefined') {
      return new ReactAdapter();
    }
    
    // Check for Svelte (look for svelte runtime)
    if (window.__SVELTE__) {
      return new SvelteAdapter();
    }
    
    // Check for HTMX + Alpine
    if (typeof htmx !== 'undefined' || typeof Alpine !== 'undefined') {
      return new HTMXAdapter();
    }
    
    // Default to HTMX
    console.warn('No framework detected, defaulting to HTMX adapter');
    return new HTMXAdapter();
  }
  
  /**
   * Render any chunk type
   */
  renderChunk(chunk, container) {
    const rendered = this.adapter.renderChunk(chunk);
    
    if (container) {
      this.adapter.mount(rendered, container);
    }
    
    this.dispatch('chunk-rendered', { 
      chunkId: chunk.id, 
      chunkType: chunk.type 
    });
    
    return rendered;
  }
  
  /**
   * Render text chunk
   */
  renderTextChunk(content, options = {}) {
    const chunk = {
      type: 'text',
      id: options.id || this.generateId(),
      content,
      timestamp: Date.now()
    };
    
    return this.renderChunk(chunk, options.container);
  }
  
  /**
   * Render thinking chunk
   */
  renderThinkingChunk(content, options = {}) {
    const chunk = {
      type: 'thinking',
      id: options.id || this.generateId(),
      content,
      expanded: options.expanded || false,
      metadata: options.metadata || {},
      timestamp: Date.now()
    };
    
    return this.renderChunk(chunk, options.container);
  }
  
  /**
   * Render citation chunk
   */
  renderCitationChunk(citations, options = {}) {
    const chunk = {
      type: 'citation',
      id: options.id || this.generateId(),
      citations,
      timestamp: Date.now()
    };
    
    return this.renderChunk(chunk, options.container);
  }
  
  /**
   * Render artifact chunk
   */
  renderArtifactChunk(artifact, options = {}) {
    const chunk = {
      type: 'artifact',
      id: options.id || this.generateId(),
      ...artifact,
      timestamp: Date.now()
    };
    
    return this.renderChunk(chunk, options.container);
  }
  
  /**
   * Create and render a complete message
   */
  createMessage(data) {
    return {
      id: data.id || this.generateId(),
      role: data.role || 'assistant',
      chunks: data.chunks || [],
      timestamp: data.timestamp || Date.now()
    };
  }
  
  /**
   * Render a complete message
   */
  renderMessage(message, container) {
    const messageContainer = this.adapter.createMessageContainer(message);
    
    message.chunks.forEach(chunk => {
      const rendered = this.renderChunk(chunk);
      this.adapter.appendToMessage(messageContainer, rendered);
    });
    
    if (container) {
      this.adapter.mount(messageContainer, container);
    }
    
    return messageContainer;
  }
  
  /**
   * Parse markdown to HTML
   */
  parseMarkdown(content, options = {}) {
    if (typeof marked === 'undefined') {
      console.error('Marked.js is required for markdown parsing');
      return content;
    }
    
    marked.setOptions({
      gfm: options.gfm !== false,
      breaks: options.breaks !== false,
      highlight: options.highlight || ((code, lang) => {
        if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang }).value;
        }
        return code;
      })
    });
    
    return marked.parse(content);
  }
  
  /**
   * Highlight code
   */
  highlightCode(code, language) {
    if (typeof hljs === 'undefined') {
      console.error('Highlight.js is required for syntax highlighting');
      return code;
    }
    
    if (language && hljs.getLanguage(language)) {
      return hljs.highlight(code, { language }).value;
    }
    
    return hljs.highlightAuto(code).value;
  }
  
  /**
   * Create artifact
   */
  createArtifact(type, content, metadata = {}) {
    return {
      id: this.generateId(),
      type,
      content,
      title: metadata.title || 'Untitled',
      language: metadata.language || type,
      metadata,
      timestamp: Date.now()
    };
  }
  
  /**
   * Render artifact
   */
  renderArtifact(artifact, container) {
    return this.renderArtifactChunk(artifact, { container });
  }
  
  /**
   * Download artifact
   */
  downloadArtifact(artifact) {
    const filename = artifact.metadata?.filename || `artifact-${artifact.id}.${artifact.type}`;
    const blob = new Blob([artifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    
    this.dispatch('artifact-downloaded', { artifactId: artifact.id });
  }
  
  /**
   * Event management
   */
  on(eventName, callback) {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, []);
    }
    this.eventHandlers.get(eventName).push(callback);
  }
  
  off(eventName, callback) {
    if (!this.eventHandlers.has(eventName)) return;
    
    const handlers = this.eventHandlers.get(eventName);
    const index = handlers.indexOf(callback);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }
  
  dispatch(eventName, data) {
    if (this.eventHandlers.has(eventName)) {
      this.eventHandlers.get(eventName).forEach(handler => {
        handler(data);
      });
    }
    
    // Also dispatch as DOM event
    const event = new CustomEvent('ai:event', {
      detail: { type: eventName, ...data },
      bubbles: true
    });
    document.dispatchEvent(event);
  }
  
  /**
   * Setup global event listeners
   */
  setupEventListeners() {
    document.addEventListener('ai:event', (e) => {
      const { type, ...data } = e.detail;
      if (this.eventHandlers.has(type)) {
        this.eventHandlers.get(type).forEach(handler => handler(data));
      }
    });
  }
  
  /**
   * Theme management
   */
  getDefaultTheme() {
    return {
      primaryHue: 210,
      darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches
    };
  }
  
  setTheme(theme) {
    this.theme = { ...this.theme, ...theme };
    this.applyTheme(this.theme);
  }
  
  getTheme() {
    return { ...this.theme };
  }
  
  applyTheme(theme) {
    const root = document.documentElement;
    root.style.setProperty('--primary-hue', theme.primaryHue);
    
    if (theme.darkMode !== undefined) {
      root.setAttribute('data-theme', theme.darkMode ? 'dark' : 'light');
    }
  }
  
  async applyPersonalization(image) {
    // Extract dominant color from image
    const hue = await this.extractHueFromImage(image);
    
    const theme = {
      ...this.theme,
      primaryHue: hue
    };
    
    this.setTheme(theme);
    return theme;
  }
  
  async extractHueFromImage(image) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
        }
        
        const pixelCount = data.length / 4;
        r = Math.floor(r / pixelCount);
        g = Math.floor(g / pixelCount);
        b = Math.floor(b / pixelCount);
        
        const hue = this.rgbToHue(r, g, b);
        resolve(hue);
      };
      
      if (typeof image === 'string') {
        img.src = image;
      } else {
        img.src = URL.createObjectURL(image);
      }
    });
  }
  
  rgbToHue(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    
    let hue = 0;
    
    if (delta === 0) {
      hue = 0;
    } else if (max === r) {
      hue = ((g - b) / delta) % 6;
    } else if (max === g) {
      hue = (b - r) / delta + 2;
    } else {
      hue = (r - g) / delta + 4;
    }
    
    hue = Math.round(hue * 60);
    if (hue < 0) hue += 360;
    
    return hue;
  }
  
  /**
   * Utility: Generate unique ID
   */
  generateId() {
    return `mz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MaterialZones;
} else if (typeof define === 'function' && define.amd) {
  define([], () => MaterialZones);
} else {
  window.MaterialZones = MaterialZones;
}
```

---

## Framework Adapters

### HTMX/Alpine Adapter

```javascript
/**
 * HTMX/Alpine.js Adapter
 */
class HTMXAdapter {
  renderChunk(chunk) {
    const template = this.getChunkTemplate(chunk);
    const html = this.compileTemplate(template, chunk);
    return this.createElementFromHTML(html);
  }
  
  getChunkTemplate(chunk) {
    const templates = {
      text: `
        <div class="zone-chunk zone-chunk--text"
             x-data="textChunk()"
             x-init="init()"
             data-chunk-id="${chunk.id}"
             data-content="${this.escapeHtml(chunk.content)}">
          <div class="zone-chunk__content" x-html="renderedContent"></div>
          <div class="zone-chunk__tools">
            <button class="zone-tool-button" @click="copyContent()">
              <svg class="zone-icon"><use href="#icon-copy"></use></svg>
            </button>
          </div>
        </div>
      `,
      
      thinking: `
        <div class="zone-chunk zone-chunk--thinking"
             x-data="thinkingChunk()"
             data-chunk-id="${chunk.id}"
             data-content="${this.escapeHtml(chunk.content)}"
             data-expanded="${chunk.expanded}">
          <button class="zone-chunk__toggle" @click="toggle()">
            <svg class="zone-icon" :class="{ 'rotate-90': expanded }">
              <use href="#icon-chevron-right"></use>
            </svg>
            <span x-text="expanded ? 'Hide reasoning' : 'Thinking...'"></span>
          </button>
          <div x-show="expanded" x-collapse>
            <pre class="zone-thinking-content" x-text="content"></pre>
          </div>
        </div>
      `,
      
      // Add other chunk types...
    };
    
    return templates[chunk.type] || templates.text;
  }
  
  compileTemplate(template, data) {
    return template; // Template already has data embedded
  }
  
  createElementFromHTML(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
  }
  
  mount(element, container) {
    container.appendChild(element);
    
    // Initialize Alpine.js components
    if (typeof Alpine !== 'undefined' && element.hasAttribute('x-data')) {
      Alpine.initTree(element);
    }
  }
  
  createMessageContainer(message) {
    return this.createElementFromHTML(`
      <div class="zone-chat-message" 
           data-message-id="${message.id}"
           data-role="${message.role}">
        <div class="zone-chunk-container"></div>
      </div>
    `);
  }
  
  appendToMessage(messageContainer, chunk) {
    const container = messageContainer.querySelector('.zone-chunk-container');
    container.appendChild(chunk);
  }
  
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}
```

### React Adapter

```javascript
/**
 * React Adapter
 */
class ReactAdapter {
  renderChunk(chunk) {
    const ChunkComponents = {
      text: TextChunk,
      thinking: ThinkingChunk,
      citation: CitationChunk,
      artifact: ArtifactChunk,
      // ... other types
    };
    
    const Component = ChunkComponents[chunk.type] || TextChunk;
    return React.createElement(Component, { chunk });
  }
  
  mount(component, container) {
    ReactDOM.render(component, container);
  }
  
  createMessageContainer(message) {
    return React.createElement(MessageContainer, { message });
  }
  
  appendToMessage(messageContainer, chunk) {
    // In React, this is handled by the MessageContainer component
    // which renders all chunks in its render method
  }
}

// React Components would be imported/defined separately
```

### Svelte Adapter

```javascript
/**
 * Svelte Adapter
 */
class SvelteAdapter {
  renderChunk(chunk) {
    const ChunkComponents = {
      text: TextChunk,
      thinking: ThinkingChunk,
      citation: CitationChunk,
      artifact: ArtifactChunk,
    };
    
    const Component = ChunkComponents[chunk.type] || TextChunk;
    return Component;
  }
  
  mount(component, container) {
    new component({
      target: container,
      props: { chunk }
    });
  }
  
  createMessageContainer(message) {
    return MessageContainer;
  }
  
  appendToMessage(messageContainer, chunk) {
    // Handled by Svelte's reactivity
  }
}
```

---

## Usage Examples

### HTMX + Alpine.js

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/material-zones@1.0.0/dist/material-zones.min.js"></script>
  <script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
</head>
<body>
  <div id="chat-container"></div>
  
  <script>
    const zones = new MaterialZones({
      theme: { primaryHue: 210 }
    });
    
    // Render a text chunk
    zones.renderTextChunk('Hello **world**!', {
      container: document.getElementById('chat-container')
    });
    
    // Listen for events
    zones.on('chunk-copied', (data) => {
      console.log('Copied:', data.chunkId);
    });
  </script>
</body>
</html>
```

### React

```javascript
import MaterialZones from 'material-zones';
import { useEffect, useRef } from 'react';

function ChatInterface() {
  const zonesRef = useRef(null);
  const containerRef = useRef(null);
  
  useEffect(() => {
    zonesRef.current = new MaterialZones({
      theme: { primaryHue: 210 }
    });
    
    zonesRef.current.renderTextChunk('Hello **world**!', {
      container: containerRef.current
    });
  }, []);
  
  return <div ref={containerRef} />;
}
```

### Svelte

```svelte
<script>
  import MaterialZones from 'material-zones';
  import { onMount } from 'svelte';
  
  let container;
  let zones;
  
  onMount(() => {
    zones = new MaterialZones({
      theme: { primaryHue: 210 }
    });
    
    zones.renderTextChunk('Hello **world**!', { container });
  });
</script>

<div bind:this={container}></div>
```

---

## AI Assistant Integration

### Prompt Template for AI Assistants

```
When generating UI code for AI chat interfaces, use the Material Zones library:

```javascript
import MaterialZones from 'material-zones';

const zones = new MaterialZones();

// For text responses
zones.renderTextChunk(content, { container });

// For thinking/reasoning
zones.renderThinkingChunk(thinking, { container, expanded: false });

// For citations
zones.renderCitationChunk(citations, { container });

// For artifacts (code, diagrams, etc.)
zones.renderArtifactChunk(artifact, { container, viewMode: 'preview' });
```

This code works identically in HTMX, React, and Svelte.
```

---

## Building from Source

```bash
git clone https://github.com/material-zones/material-zones-js
cd material-zones-js
npm install
npm run build
```

---

## Testing

```bash
npm test              # Run all tests
npm run test:htmx     # Test HTMX adapter
npm run test:react    # Test React adapter
npm run test:svelte   # Test Svelte adapter
```

---

## Next Steps

- **[Flutter Library](./MATERIAL_ZONES_FLUTTER.md)** - Flutter/Dart implementation

---

This unified library ensures consistent behavior across all web frameworks, making AI-generated code truly write-once, run-anywhere.
