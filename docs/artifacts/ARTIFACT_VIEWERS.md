# Material Zones: Artifact Viewer & Editor Guide

**Parent Document**: [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)  
**Related Documents**: 
- [Chunk Implementations](./CHUNK_IMPLEMENTATIONS.md)
- [JavaScript Utility Library](./MATERIAL_ZONES_JS.md)
- [Flutter Library](./MATERIAL_ZONES_FLUTTER.md)

**Version**: 1.0.0

---

## Overview

This document provides complete implementations of artifact viewers and editors for all supported content types across four frameworks:
- HTMX + Alpine.js
- React
- Flutter
- Svelte

Each artifact type includes rendering strategies, sandboxing approaches, and interactive tools.

## Critical Features

### 🔧 Advanced Infrastructure

This specification covers **production-grade artifact systems** including:

1. **External Library Support** - Artifacts can use shadcn-ui, Supabase, Axios, React Flow, and other external libraries without LLM-generated boilerplate

2. **Dual Execution Environments**:
   - **iframe + Shadow DOM** - Strong isolation for HTMX/HTML artifacts
   - **Sandpack** - Full React dev environment with hot reload and npm packages

3. **LLM-Assisted Live Editing** - Two streaming modes:
   - **Chat Stream** - LLM explains changes in chat bubbles
   - **Code Stream** - LLM streams edits directly to code editor in real-time

4. **Interactive Data Fetching** - Artifacts fetch their own data using bundled libraries, keeping them lean (no "fat artifacts")

5. **Versioned Storage** - Complete version history with:
   - IndexedDB for structured storage
   - PGlite for SQL queries in browser
   - Git-style commit messages and rollback

6. **Dynamic Form Generation** - LLMs generate forms via JSON Schema to collect user input, reducing manual typing

### 🎯 Key Principles

**Lean Artifacts**: LLMs generate UI logic only. Artifacts fetch their own data.

**Live Editing**: Users can chat with LLMs to fix, optimize, or refactor code with real-time preview updates.

**Versioned History**: Every edit creates a version with optional commit message, enabling full rollback.

**Schema-Driven Forms**: LLMs can generate data collection forms on-the-fly using JSON Schema with validation.

---

## Table of Contents

### Core Infrastructure
1. [Packaging & External Library Support](#packaging--external-library-support)
2. [Execution Environments](#execution-environments)
   - iframe + Shadow DOM
   - Sandpack with Custom Preview Server
3. [LLM-Assisted Artifact Editing](#llm-assisted-artifact-editing)
4. [Interactive Artifacts with Data Fetching](#interactive-artifacts-with-data-fetching)
5. [Artifact Storage & Versioning](#artifact-storage--versioning)
6. [JSON Schema-Based Form Generation](#json-schema-based-form-generation)

### Artifact Viewers
7. [HTML/HTMX Artifact Viewer](#htmlhtmx-artifact-viewer)
8. [React Component Viewer](#react-component-viewer)
9. [Markdown Viewer/Editor](#markdown-viewereditor)
10. [PDF Viewer](#pdf-viewer)
11. [XYFlow/ReactFlow Diagram Viewer](#xyflowreactflow-diagram-viewer)
12. [Mermaid Diagram Viewer](#mermaid-diagram-viewer)
13. [SVG Viewer/Editor](#svg-viewereditor)
14. [Video Player](#video-player)
15. [Image Viewer](#image-viewer)
16. [Code Editor](#code-editor)

---

## Universal Artifact Container

All artifact types share this base structure:

```typescript
interface Artifact {
  id: string;
  type: 'html' | 'react' | 'markdown' | 'pdf' | 'xyflow' | 'mermaid' | 'svg' | 'video' | 'image' | 'code';
  title: string;
  content: string;
  language?: string;
  metadata?: {
    filename?: string;
    description?: string;
    dependencies?: string[];
    width?: number;
    height?: number;
  };
}
```

### Base Artifact Component (HTMX + Alpine.js)

```html
<!-- artifact-base.html -->
<div class="zone-artifact"
     x-data="artifactBase()"
     x-init="init()"
     data-artifact-id="{{ artifact.id }}"
     data-artifact-type="{{ artifact.type }}">
  
  <!-- Header -->
  <div class="zone-artifact__header">
    <div class="zone-artifact__meta">
      <svg class="zone-icon">
        <use :href="`#icon-${getTypeIcon(type)}`"></use>
      </svg>
      <span class="zone-artifact__title" x-text="title"></span>
      <span class="zone-artifact__type" x-text="type"></span>
    </div>
    
    <div class="zone-artifact__tools">
      <!-- View mode toggle (code/preview/split) -->
      <div class="zone-view-mode-toggle">
        <button class="zone-tool-button"
                :class="{ 'active': viewMode === 'code' }"
                @click="viewMode = 'code'"
                aria-label="Show code">
          <svg class="zone-icon"><use href="#icon-code"></use></svg>
        </button>
        <button class="zone-tool-button"
                :class="{ 'active': viewMode === 'preview' }"
                @click="viewMode = 'preview'"
                aria-label="Show preview">
          <svg class="zone-icon"><use href="#icon-eye"></use></svg>
        </button>
        <button class="zone-tool-button"
                :class="{ 'active': viewMode === 'split' }"
                @click="viewMode = 'split'"
                aria-label="Split view">
          <svg class="zone-icon"><use href="#icon-columns"></use></svg>
        </button>
      </div>
      
      <!-- Standard tools -->
      <button class="zone-tool-button"
              @click="copyContent()"
              :aria-label="copied ? 'Copied!' : 'Copy code'">
        <svg class="zone-icon" x-show="!copied"><use href="#icon-copy"></use></svg>
        <svg class="zone-icon zone-icon--success" x-show="copied"><use href="#icon-check"></use></svg>
      </button>
      
      <button class="zone-tool-button"
              @click="downloadArtifact()"
              aria-label="Download">
        <svg class="zone-icon"><use href="#icon-download"></use></svg>
      </button>
      
      <button class="zone-tool-button"
              @click="shareArtifact()"
              aria-label="Share">
        <svg class="zone-icon"><use href="#icon-share"></use></svg>
      </button>
      
      <button class="zone-tool-button"
              @click="fullscreen = !fullscreen"
              :aria-label="fullscreen ? 'Exit fullscreen' : 'Fullscreen'">
        <svg class="zone-icon" x-show="!fullscreen"><use href="#icon-maximize"></use></svg>
        <svg class="zone-icon" x-show="fullscreen"><use href="#icon-minimize"></use></svg>
      </button>
    </div>
  </div>
  
  <!-- Content Area -->
  <div class="zone-artifact__content"
       :class="{ 'zone-artifact__content--fullscreen': fullscreen, [`zone-artifact__content--${viewMode}`]: true }">
    
    <!-- Code view -->
    <div class="zone-artifact__code"
         x-show="viewMode === 'code' || viewMode === 'split'">
      <pre><code :class="`language-${language}`" x-text="content"></code></pre>
    </div>
    
    <!-- Preview view -->
    <div class="zone-artifact__preview"
         x-show="viewMode === 'preview' || viewMode === 'split'">
      <!-- Type-specific viewer renders here -->
    </div>
  </div>
</div>

<script>
function artifactBase() {
  return {
    id: '',
    type: '',
    title: '',
    content: '',
    language: '',
    metadata: {},
    viewMode: 'preview',  // 'code' | 'preview' | 'split'
    fullscreen: false,
    copied: false,
    
    init() {
      this.id = this.$el.dataset.artifactId;
      this.type = this.$el.dataset.artifactType;
      this.title = this.$el.dataset.title || 'Untitled';
      this.content = this.$el.dataset.content || '';
      this.language = this.$el.dataset.language || this.type;
      this.metadata = JSON.parse(this.$el.dataset.metadata || '{}');
      
      this.$nextTick(() => {
        this.highlightCode();
      });
    },
    
    highlightCode() {
      const codeBlocks = this.$el.querySelectorAll('pre code');
      codeBlocks.forEach(block => hljs.highlightElement(block));
    },
    
    getTypeIcon(type) {
      const icons = {
        html: 'code',
        react: 'react',
        markdown: 'markdown',
        pdf: 'file-text',
        xyflow: 'git-branch',
        mermaid: 'diagram',
        svg: 'image',
        video: 'video',
        image: 'image',
        code: 'code'
      };
      return icons[type] || 'file';
    },
    
    copyContent() {
      navigator.clipboard.writeText(this.content).then(() => {
        this.copied = true;
        setTimeout(() => this.copied = false, 2000);
        
        this.$dispatch('ai:event', {
          type: 'artifact-copied',
          artifactId: this.id
        });
      });
    },
    
    downloadArtifact() {
      const filename = this.metadata.filename || `artifact-${this.id}.${this.type}`;
      const blob = new Blob([this.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      
      this.$dispatch('ai:event', {
        type: 'artifact-downloaded',
        artifactId: this.id
      });
    },
    
    shareArtifact() {
      if (navigator.share) {
        navigator.share({
          title: this.title,
          text: this.content
        });
      } else {
        // Fallback: copy link
        this.copyContent();
      }
      
      this.$dispatch('ai:event', {
        type: 'artifact-shared',
        artifactId: this.id
      });
    }
  };
}
</script>
```

---

## Packaging & External Library Support

### Overview

Artifacts must support external libraries to remain lean and interactive. Rather than LLMs generating both data AND UI (fat artifacts), artifacts fetch their own data using bundled network libraries.

### Supported Libraries by Framework

#### React Artifacts

**UI Libraries:**
```javascript
// Available in all React artifacts
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sidebar, SidebarProvider } from "@/components/ui/sidebar";
// Full shadcn-ui canary library available
```

**Data Fetching:**
```javascript
// Supabase
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Axios
import axios from 'axios';
const response = await axios.get('/api/data');

// Native Fetch
const data = await fetch('/api/data').then(r => r.json());
```

**Diagrams & Visualization:**
```javascript
// React Flow / XYFlow
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap 
} from 'reactflow';

// Recharts
import { LineChart, BarChart, PieChart } from 'recharts';
```

**State Management:**
```javascript
// Zustand
import create from 'zustand';

// TanStack Query
import { useQuery } from '@tanstack/react-query';
```

#### HTMX Artifacts

**Data Fetching:**
```html
<!-- Supabase.js -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  const { createClient } = supabase;
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
</script>

<!-- Axios -->
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>

<!-- GraphQL Client -->
<script src="https://cdn.jsdelivr.net/npm/graphql-request@6/dist/index.umd.js"></script>
<script>
  const { GraphQLClient } = graphqlRequest;
  const client = new GraphQLClient('https://api.example.com/graphql');
</script>
```

**REST API with HTMX:**
```html
<button 
  hx-get="/api/data"
  hx-target="#result"
  hx-swap="innerHTML">
  Load Data
</button>

<div id="result"></div>
```

### Library Configuration

#### Package Manifest (artifacts.config.json)

```json
{
  "react": {
    "dependencies": {
      "@supabase/supabase-js": "^2.38.0",
      "axios": "^1.6.0",
      "reactflow": "^11.10.0",
      "@/components/ui/*": "canary",
      "recharts": "^2.10.0",
      "zustand": "^4.4.0",
      "@tanstack/react-query": "^5.0.0"
    },
    "environment": "sandpack"
  },
  "htmx": {
    "cdnLibraries": [
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
      "https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js",
      "https://unpkg.com/htmx.org@2.0.0",
      "https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js"
    ],
    "environment": "iframe-shadow-dom"
  }
}
```

---

## Execution Environments

### Environment Types

1. **iframe + Shadow DOM** - For HTMX, HTML, vanilla JS
2. **Sandpack** - For React with custom preview server

### iframe with Shadow DOM

#### Purpose
Provides strong isolation for HTMX/HTML artifacts while preventing style bleed.

#### Implementation

```javascript
class IframeShadowDOMViewer {
  constructor(container, artifact) {
    this.container = container;
    this.artifact = artifact;
    this.iframe = null;
  }
  
  render() {
    // Create iframe
    this.iframe = document.createElement('iframe');
    this.iframe.sandbox = 'allow-scripts allow-same-origin allow-forms';
    this.iframe.style.width = '100%';
    this.iframe.style.height = '600px';
    this.iframe.style.border = 'none';
    
    this.container.appendChild(this.iframe);
    
    // Setup shadow DOM inside iframe
    this.iframe.addEventListener('load', () => {
      const iframeDoc = this.iframe.contentDocument;
      const shadowHost = iframeDoc.createElement('div');
      shadowHost.id = 'shadow-host';
      iframeDoc.body.appendChild(shadowHost);
      
      const shadowRoot = shadowHost.attachShadow({ mode: 'open' });
      
      // Inject artifact content
      shadowRoot.innerHTML = this.wrapContent(this.artifact.content);
      
      // Load external libraries
      this.loadLibraries(iframeDoc, shadowRoot);
    });
    
    // Write initial HTML
    const doc = this.iframe.contentDocument;
    doc.open();
    doc.write(this.getBaseHTML());
    doc.close();
  }
  
  getBaseHTML() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 0; }
          #shadow-host { width: 100%; min-height: 100vh; }
        </style>
      </head>
      <body></body>
      </html>
    `;
  }
  
  wrapContent(content) {
    const libraries = this.artifact.metadata?.libraries || [];
    const cdnLinks = libraries.map(lib => 
      `<script src="${lib}"></script>`
    ).join('\n');
    
    return `
      <style>
        :host {
          display: block;
          padding: 1rem;
          font-family: system-ui, sans-serif;
        }
      </style>
      ${content}
      ${cdnLinks}
    `;
  }
  
  async loadLibraries(doc, shadowRoot) {
    const config = this.artifact.metadata?.libraries || [];
    
    for (const libUrl of config) {
      await this.loadScript(doc, libUrl);
    }
    
    // Initialize any framework-specific code
    if (typeof Alpine !== 'undefined') {
      Alpine.start();
    }
  }
  
  loadScript(doc, url) {
    return new Promise((resolve, reject) => {
      const script = doc.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = reject;
      doc.head.appendChild(script);
    });
  }
}
```

### Sandpack with Custom Preview Server

#### Purpose
Provides full React development environment with hot module reloading, npm packages, and custom preview.

#### Complete Sandpack Configuration

```typescript
import { Sandpack } from "@codesandbox/sandpack-react";

interface SandpackArtifactViewerProps {
  artifact: Artifact;
  onUpdate?: (code: string) => void;
}

export function SandpackArtifactViewer({ artifact, onUpdate }: SandpackArtifactViewerProps) {
  const files = {
    '/App.js': {
      code: artifact.content,
      active: true,
    },
    '/package.json': {
      code: JSON.stringify({
        dependencies: {
          'react': '^18.2.0',
          'react-dom': '^18.2.0',
          '@supabase/supabase-js': '^2.38.0',
          'axios': '^1.6.0',
          'reactflow': '^11.10.0',
          'recharts': '^2.10.0',
          'zustand': '^4.4.0',
          '@tanstack/react-query': '^5.0.0',
          // shadcn-ui components
          '@radix-ui/react-dialog': '^1.0.5',
          '@radix-ui/react-dropdown-menu': '^2.0.6',
          '@radix-ui/react-select': '^2.0.0',
          'class-variance-authority': '^0.7.0',
          'clsx': '^2.0.0',
          'tailwind-merge': '^2.0.0',
        },
      }, null, 2),
    },
    '/components/ui/button.tsx': {
      code: `
        import * as React from "react"
        import { Slot } from "@radix-ui/react-slot"
        import { cva, type VariantProps } from "class-variance-authority"
        import { cn } from "@/lib/utils"
        
        const buttonVariants = cva(
          "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            variants: {
              variant: {
                default: "bg-primary text-primary-foreground hover:bg-primary/90",
                destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
                secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                ghost: "hover:bg-accent hover:text-accent-foreground",
                link: "text-primary underline-offset-4 hover:underline",
              },
              size: {
                default: "h-10 px-4 py-2",
                sm: "h-9 rounded-md px-3",
                lg: "h-11 rounded-md px-8",
                icon: "h-10 w-10",
              },
            },
            defaultVariants: {
              variant: "default",
              size: "default",
            },
          }
        )
        
        export interface ButtonProps
          extends React.ButtonHTMLAttributes<HTMLButtonElement>,
            VariantProps<typeof buttonVariants> {
          asChild?: boolean
        }
        
        const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
          ({ className, variant, size, asChild = false, ...props }, ref) => {
            const Comp = asChild ? Slot : "button"
            return (
              <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
              />
            )
          }
        )
        Button.displayName = "Button"
        
        export { Button, buttonVariants }
      `,
    },
    '/lib/utils.ts': {
      code: `
        import { type ClassValue, clsx } from "clsx"
        import { twMerge } from "tailwind-merge"
        
        export function cn(...inputs: ClassValue[]) {
          return twMerge(clsx(inputs))
        }
      `,
    },
    '/styles.css': {
      code: `
        @tailwind base;
        @tailwind components;
        @tailwind utilities;
        
        @layer base {
          :root {
            --background: 0 0% 100%;
            --foreground: 222.2 84% 4.9%;
            --primary: var(--primary-hue) 60% 50%;
            --primary-foreground: var(--primary-hue) 20% 100%;
          }
        }
      `,
    },
  };
  
  return (
    <Sandpack
      template="react-ts"
      files={files}
      theme="dark"
      options={{
        showNavigator: true,
        showTabs: true,
        showLineNumbers: true,
        showInlineErrors: true,
        wrapContent: true,
        editorHeight: 500,
        externalResources: [
          "https://cdn.tailwindcss.com",
        ],
        // Custom preview server
        bundlerURL: "https://sandpack-bundler.codesandbox.io",
        // Enable all sandpack features
        classes: {
          "sp-wrapper": "zone-sandpack-wrapper",
          "sp-layout": "zone-sandpack-layout",
          "sp-editor": "zone-sandpack-editor",
          "sp-preview": "zone-sandpack-preview",
        },
      }}
      customSetup={{
        dependencies: {
          '@supabase/supabase-js': '^2.38.0',
          'axios': '^1.6.0',
          'reactflow': '^11.10.0',
        },
        environment: 'create-react-app',
      }}
    />
  );
}
```

#### All Sandpack Options

```typescript
interface SandpackOptions {
  // Display Options
  showNavigator?: boolean;          // Show file navigator
  showTabs?: boolean;               // Show file tabs
  showLineNumbers?: boolean;        // Show line numbers in editor
  showInlineErrors?: boolean;       // Show inline error messages
  showConsole?: boolean;            // Show console output
  showConsoleButton?: boolean;      // Show console toggle button
  showRefreshButton?: boolean;      // Show preview refresh button
  showOpenInCodeSandbox?: boolean;  // Show "Open in CodeSandbox" button
  wrapContent?: boolean;            // Wrap long lines
  
  // Editor Options
  editorHeight?: number | string;   // Editor height (px or %)
  editorWidthPercentage?: number;   // Editor width (0-100)
  readOnly?: boolean;               // Make editor read-only
  
  // Preview Options
  recompileMode?: 'immediate' | 'delayed';  // When to recompile
  recompileDelay?: number;          // Delay in ms for delayed mode
  autorun?: boolean;                // Auto-run code on mount
  autoReload?: boolean;             // Auto-reload on file changes
  
  // Bundler Options
  bundlerURL?: string;              // Custom bundler URL
  externalResources?: string[];     // External CSS/JS resources
  
  // Styling
  classes?: {
    'sp-wrapper'?: string;
    'sp-layout'?: string;
    'sp-editor'?: string;
    'sp-preview'?: string;
    'sp-console'?: string;
  };
  
  // Advanced
  skipEval?: boolean;               // Skip initial evaluation
  initMode?: 'lazy' | 'immediate'; // Initialization mode
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
}
```

---

## LLM-Assisted Artifact Editing

### Overview

Artifacts can be edited, fixed, and improved via LLM chat with **two streaming modes**:
1. **Chat Stream** - Stream responses to chat bubbles (standard)
2. **Code Stream** - Stream directly to artifact code view (live editing)

### Architecture

```
User Message → LLM → Stream Decision
                         ↓
         ┌───────────────┴───────────────┐
         ↓                               ↓
    Chat Bubble                    Code Editor
    (explanation)                  (live updates)
```

### Artifact Display Modes

Every artifact viewer supports 4 modes:

1. **Preview** - Rendered output only
2. **Code** - Source code editor only
3. **Split** - Preview + Code side-by-side
4. **Open in Browser** - Full-screen in new tab

```typescript
type ArtifactViewMode = 'preview' | 'code' | 'split' | 'browser';

interface ArtifactDisplayProps {
  artifact: Artifact;
  viewMode: ArtifactViewMode;
  onViewModeChange: (mode: ArtifactViewMode) => void;
  streamTarget?: 'chat' | 'code';  // Where to stream LLM updates
}
```

### Dual Streaming Implementation

#### Chat Stream (Standard Mode)

```typescript
async function handleChatStream(prompt: string) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ 
      prompt,
      artifactId: currentArtifact.id,
      mode: 'explain' // LLM explains changes
    }),
  });
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    
    // Stream to chat bubble
    updateChatBubble(currentMessageId, buffer);
  }
}
```

#### Code Stream (Live Edit Mode)

```typescript
async function handleCodeStream(prompt: string) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ 
      prompt,
      artifactId: currentArtifact.id,
      mode: 'edit', // LLM streams code changes
      context: artifact.content // Current code
    }),
  });
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    
    // Stream directly to code editor
    updateArtifactCode(currentArtifact.id, buffer);
    
    // Optionally trigger live preview update
    if (viewMode === 'preview' || viewMode === 'split') {
      debouncePreviewUpdate();
    }
  }
  
  // Save version after stream completes
  await saveArtifactVersion(currentArtifact.id, buffer);
}
```

### Unified Artifact Editor Component

```typescript
interface ArtifactEditorProps {
  artifact: Artifact;
  onUpdate: (content: string) => void;
  streamTarget: 'chat' | 'code';
}

function ArtifactEditor({ artifact, onUpdate, streamTarget }: ArtifactEditorProps) {
  const [viewMode, setViewMode] = useState<ArtifactViewMode>('preview');
  const [code, setCode] = useState(artifact.content);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  
  // Handle LLM edit request
  async function handleEditRequest(prompt: string) {
    if (streamTarget === 'chat') {
      // Add user message
      const userMsg = { role: 'user', content: prompt };
      setChatMessages(prev => [...prev, userMsg]);
      
      // Stream LLM response to chat
      await handleChatStream(prompt);
    } else {
      // Stream directly to code editor
      await handleCodeStream(prompt);
    }
  }
  
  return (
    <div className="zone-artifact-editor">
      {/* Mode Toggle */}
      <div className="zone-artifact-toolbar">
        <div className="zone-view-mode-toggle">
          <button onClick={() => setViewMode('preview')}>Preview</button>
          <button onClick={() => setViewMode('code')}>Code</button>
          <button onClick={() => setViewMode('split')}>Split</button>
          <button onClick={() => openInBrowser()}>Open in Browser</button>
        </div>
        
        {/* Stream Target Toggle */}
        <div className="zone-stream-target">
          <label>
            <input type="radio" checked={streamTarget === 'chat'} />
            Chat Stream
          </label>
          <label>
            <input type="radio" checked={streamTarget === 'code'} />
            Live Edit
          </label>
        </div>
      </div>
      
      {/* Display Area */}
      <div className={`zone-artifact-display zone-artifact-display--${viewMode}`}>
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className="zone-artifact-preview">
            <ArtifactPreview artifact={{ ...artifact, content: code }} />
          </div>
        )}
        
        {(viewMode === 'code' || viewMode === 'split') && (
          <div className="zone-artifact-code">
            <CodeEditor
              value={code}
              onChange={setCode}
              language={artifact.language}
              readOnly={streamTarget === 'code'} // Read-only during live edit
            />
          </div>
        )}
      </div>
      
      {/* LLM Chat Interface */}
      {streamTarget === 'chat' && (
        <div className="zone-artifact-chat">
          <ChatView messages={chatMessages} />
          <ChatInput onSend={handleEditRequest} />
        </div>
      )}
      
      {/* Quick Edit Commands */}
      {streamTarget === 'code' && (
        <div className="zone-quick-commands">
          <button onClick={() => handleEditRequest('Fix any errors')}>
            Fix Errors
          </button>
          <button onClick={() => handleEditRequest('Add comments')}>
            Add Comments
          </button>
          <button onClick={() => handleEditRequest('Optimize performance')}>
            Optimize
          </button>
        </div>
      )}
    </div>
  );
}
```

### Standard LLM Edit Commands

```typescript
const STANDARD_EDIT_COMMANDS = {
  fix: 'Fix any errors in the code',
  optimize: 'Optimize this code for performance',
  comment: 'Add detailed comments to explain the code',
  refactor: 'Refactor this code to follow best practices',
  test: 'Add unit tests for this code',
  accessibility: 'Improve accessibility of this component',
  responsive: 'Make this component fully responsive',
  style: 'Improve the visual styling',
  security: 'Fix any security vulnerabilities',
};
```

---

## Interactive Artifacts with Data Fetching

### Purpose

Artifacts should fetch their own data using bundled network libraries, keeping them lean and avoiding "fat artifacts" where the LLM generates both data AND UI.

### Data Fetching Patterns

#### React with Supabase

```typescript
// LLM generates this lean artifact
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchUsers() {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .limit(10);
      
      if (data) setUsers(data);
      setLoading(false);
    }
    
    fetchUsers();
  }, []);
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

#### HTMX with REST API

```html
<!-- LLM generates this lean artifact -->
<div x-data="userList()" x-init="fetchUsers()">
  <template x-if="loading">
    <div>Loading...</div>
  </template>
  
  <template x-if="!loading">
    <ul>
      <template x-for="user in users" :key="user.id">
        <li x-text="user.name"></li>
      </template>
    </ul>
  </template>
</div>

<script>
function userList() {
  return {
    users: [],
    loading: true,
    
    async fetchUsers() {
      const response = await fetch('/api/users?limit=10');
      this.users = await response.json();
      this.loading = false;
    }
  };
}
</script>
```

### Environment Variable Injection

```typescript
// artifacts.env.ts
export const ARTIFACT_ENV = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
};

// Injected into all artifacts automatically
```

---

## Artifact Storage & Versioning

### Storage Options

1. **localStorage** - Simple, synchronous, 5-10MB limit
2. **IndexedDB** - Async, structured, ~50MB+ limit
3. **PGlite** - Postgres in browser, SQL queries, unlimited
4. **SQLite (WASM)** - Full SQL database, file-based

### Unified Storage Interface

```typescript
interface ArtifactStorage {
  save(artifact: Artifact): Promise<void>;
  load(id: string): Promise<Artifact>;
  loadVersion(id: string, version: number): Promise<Artifact>;
  listVersions(id: string): Promise<ArtifactVersion[]>;
  delete(id: string): Promise<void>;
}

interface ArtifactVersion {
  version: number;
  timestamp: Date;
  content: string;
  message?: string;  // Commit message
  author?: string;   // Who made the change
}
```

### Implementation: IndexedDB

```typescript
class IndexedDBArtifactStorage implements ArtifactStorage {
  private db: IDBDatabase;
  
  async init() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('MaterialZonesArtifacts', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Artifacts store
        if (!db.objectStoreNames.contains('artifacts')) {
          const store = db.createObjectStore('artifacts', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // Versions store
        if (!db.objectStoreNames.contains('versions')) {
          const store = db.createObjectStore('versions', { 
            keyPath: ['artifactId', 'version'] 
          });
          store.createIndex('artifactId', 'artifactId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }
  
  async save(artifact: Artifact): Promise<void> {
    // Get current version
    const versions = await this.listVersions(artifact.id);
    const nextVersion = versions.length + 1;
    
    // Save new version
    const version: ArtifactVersion = {
      artifactId: artifact.id,
      version: nextVersion,
      content: artifact.content,
      timestamp: new Date(),
      message: artifact.metadata?.commitMessage,
    };
    
    const tx = this.db.transaction(['artifacts', 'versions'], 'readwrite');
    
    // Update artifact
    await this.promisify(tx.objectStore('artifacts').put(artifact));
    
    // Save version
    await this.promisify(tx.objectStore('versions').put(version));
    
    await this.promisify(tx);
  }
  
  async load(id: string): Promise<Artifact> {
    const tx = this.db.transaction('artifacts', 'readonly');
    const request = tx.objectStore('artifacts').get(id);
    return this.promisify(request);
  }
  
  async loadVersion(id: string, version: number): Promise<Artifact> {
    const tx = this.db.transaction('versions', 'readonly');
    const request = tx.objectStore('versions').get([id, version]);
    const versionData = await this.promisify<ArtifactVersion>(request);
    
    // Reconstruct artifact from version
    const artifact = await this.load(id);
    return {
      ...artifact,
      content: versionData.content,
    };
  }
  
  async listVersions(id: string): Promise<ArtifactVersion[]> {
    const tx = this.db.transaction('versions', 'readonly');
    const store = tx.objectStore('versions');
    const index = store.index('artifactId');
    const request = index.getAll(id);
    return this.promisify(request);
  }
  
  private promisify<T = any>(request: IDBRequest | IDBTransaction): Promise<T> {
    return new Promise((resolve, reject) => {
      if (request instanceof IDBTransaction) {
        request.oncomplete = () => resolve(undefined as T);
        request.onerror = () => reject(request.error);
      } else {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }
    });
  }
}
```

### Implementation: PGlite

```typescript
import { PGlite } from '@electric-sql/pglite';

class PGliteArtifactStorage implements ArtifactStorage {
  private db: PGlite;
  
  async init() {
    this.db = new PGlite();
    
    // Create tables
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        language TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS artifact_versions (
        artifact_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        content TEXT NOT NULL,
        message TEXT,
        author TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (artifact_id, version)
      );
      
      CREATE INDEX idx_artifacts_updated ON artifacts(updated_at DESC);
      CREATE INDEX idx_versions_artifact ON artifact_versions(artifact_id, version DESC);
    `);
  }
  
  async save(artifact: Artifact): Promise<void> {
    // Get current version count
    const versionResult = await this.db.query(
      'SELECT COALESCE(MAX(version), 0) as max_version FROM artifact_versions WHERE artifact_id = $1',
      [artifact.id]
    );
    const nextVersion = versionResult.rows[0].max_version + 1;
    
    // Update artifact
    await this.db.query(`
      INSERT INTO artifacts (id, type, title, content, language, metadata, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        content = EXCLUDED.content,
        metadata = EXCLUDED.metadata,
        updated_at = CURRENT_TIMESTAMP
    `, [
      artifact.id,
      artifact.type,
      artifact.title,
      artifact.content,
      artifact.language,
      JSON.stringify(artifact.metadata),
    ]);
    
    // Save version
    await this.db.query(`
      INSERT INTO artifact_versions (artifact_id, version, content, message)
      VALUES ($1, $2, $3, $4)
    `, [
      artifact.id,
      nextVersion,
      artifact.content,
      artifact.metadata?.commitMessage,
    ]);
  }
  
  async load(id: string): Promise<Artifact> {
    const result = await this.db.query(
      'SELECT * FROM artifacts WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Artifact not found');
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      content: row.content,
      language: row.language,
      metadata: row.metadata,
      timestamp: new Date(row.updated_at),
    };
  }
  
  async loadVersion(id: string, version: number): Promise<Artifact> {
    const artifact = await this.load(id);
    
    const result = await this.db.query(
      'SELECT content FROM artifact_versions WHERE artifact_id = $1 AND version = $2',
      [id, version]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Version not found');
    }
    
    return {
      ...artifact,
      content: result.rows[0].content,
    };
  }
  
  async listVersions(id: string): Promise<ArtifactVersion[]> {
    const result = await this.db.query(`
      SELECT version, content, message, author, created_at
      FROM artifact_versions
      WHERE artifact_id = $1
      ORDER BY version DESC
    `, [id]);
    
    return result.rows.map(row => ({
      version: row.version,
      timestamp: new Date(row.created_at),
      content: row.content,
      message: row.message,
      author: row.author,
    }));
  }
}
```

### Version History UI

```typescript
function ArtifactVersionHistory({ artifactId }: { artifactId: string }) {
  const [versions, setVersions] = useState<ArtifactVersion[]>([]);
  const storage = useArtifactStorage();
  
  useEffect(() => {
    storage.listVersions(artifactId).then(setVersions);
  }, [artifactId]);
  
  const handleRestore = async (version: number) => {
    const artifact = await storage.loadVersion(artifactId, version);
    // Restore to editor
    onArtifactUpdate(artifact);
  };
  
  return (
    <div className="zone-version-history">
      <h3>Version History</h3>
      <ul>
        {versions.map(v => (
          <li key={v.version}>
            <span className="version-number">v{v.version}</span>
            <span className="version-date">
              {v.timestamp.toLocaleString()}
            </span>
            {v.message && (
              <span className="version-message">{v.message}</span>
            )}
            <button onClick={() => handleRestore(v.version)}>
              Restore
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## JSON Schema-Based Form Generation

### Purpose

LLMs can generate dynamic forms to collect user input, avoiding manual typing. Forms are defined via JSON Schema with validation and custom render hints.

### JSON Schema with Render Hints

```typescript
interface FormSchema {
  $schema: string;
  type: 'object';
  properties: {
    [key: string]: PropertySchema;
  };
  required?: string[];
  title?: string;
  description?: string;
}

interface PropertySchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  title?: string;
  description?: string;
  default?: any;
  
  // Validation
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  enum?: any[];
  
  // Render hints (custom extension)
  'x-render'?: {
    component: 'input' | 'textarea' | 'markdown' | 'select' | 'checkbox' | 'file';
    placeholder?: string;
    rows?: number;  // For textarea
    accept?: string;  // For file input
  };
}
```

### Example Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "User Profile",
  "description": "Collect user profile information",
  "properties": {
    "name": {
      "type": "string",
      "title": "Full Name",
      "description": "Your full legal name",
      "minLength": 2,
      "maxLength": 100,
      "x-render": {
        "component": "input",
        "placeholder": "John Doe"
      }
    },
    "bio": {
      "type": "string",
      "title": "Biography",
      "description": "Tell us about yourself",
      "maxLength": 500,
      "x-render": {
        "component": "textarea",
        "placeholder": "I am a...",
        "rows": 5
      }
    },
    "description": {
      "type": "string",
      "title": "Rich Description",
      "description": "Detailed description with formatting",
      "x-render": {
        "component": "markdown",
        "placeholder": "## About Me\n\nWrite something..."
      }
    },
    "role": {
      "type": "string",
      "title": "Role",
      "enum": ["admin", "user", "guest"],
      "x-render": {
        "component": "select"
      }
    },
    "newsletter": {
      "type": "boolean",
      "title": "Subscribe to newsletter",
      "default": false,
      "x-render": {
        "component": "checkbox"
      }
    }
  },
  "required": ["name", "bio"]
}
```

### Form Generator Component

```typescript
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

function SchemaFormGenerator({ schema, onSubmit }: { 
  schema: FormSchema;
  onSubmit: (data: any) => void;
}) {
  // Convert JSON Schema to Zod schema
  const zodSchema = jsonSchemaToZod(schema);
  
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(zodSchema),
  });
  
  const renderField = (name: string, property: PropertySchema) => {
    const renderHint = property['x-render'];
    const component = renderHint?.component || 'input';
    
    switch (component) {
      case 'input':
        return (
          <Controller
            name={name}
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type={property.type === 'number' ? 'number' : 'text'}
                placeholder={renderHint?.placeholder}
                className="zone-input"
              />
            )}
          />
        );
      
      case 'textarea':
        return (
          <Controller
            name={name}
            control={control}
            render={({ field }) => (
              <textarea
                {...field}
                rows={renderHint?.rows || 3}
                placeholder={renderHint?.placeholder}
                className="zone-textarea"
              />
            )}
          />
        );
      
      case 'markdown':
        return (
          <Controller
            name={name}
            control={control}
            render={({ field }) => (
              <MarkdownEditor
                value={field.value}
                onChange={field.onChange}
                placeholder={renderHint?.placeholder}
              />
            )}
          />
        );
      
      case 'select':
        return (
          <Controller
            name={name}
            control={control}
            render={({ field }) => (
              <select {...field} className="zone-select">
                <option value="">Select...</option>
                {property.enum?.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
          />
        );
      
      case 'checkbox':
        return (
          <Controller
            name={name}
            control={control}
            render={({ field }) => (
              <label className="zone-checkbox-label">
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  className="zone-checkbox"
                />
                {property.title}
              </label>
            )}
          />
        );
      
      default:
        return null;
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="zone-schema-form">
      <h2>{schema.title}</h2>
      {schema.description && <p>{schema.description}</p>}
      
      {Object.entries(schema.properties).map(([name, property]) => (
        <div key={name} className="zone-form-field">
          <label>
            {property.title || name}
            {schema.required?.includes(name) && <span className="required">*</span>}
          </label>
          {property.description && (
            <p className="zone-field-description">{property.description}</p>
          )}
          {renderField(name, property)}
          {errors[name] && (
            <span className="zone-field-error">{errors[name]?.message}</span>
          )}
        </div>
      ))}
      
      <button type="submit" className="zone-button zone-button--primary">
        Submit
      </button>
    </form>
  );
}

// Helper: Convert JSON Schema to Zod
function jsonSchemaToZod(schema: FormSchema) {
  const shape: Record<string, z.ZodType> = {};
  
  Object.entries(schema.properties).forEach(([name, property]) => {
    let zodType: z.ZodType;
    
    switch (property.type) {
      case 'string':
        zodType = z.string();
        if (property.minLength) zodType = zodType.min(property.minLength);
        if (property.maxLength) zodType = zodType.max(property.maxLength);
        if (property.pattern) zodType = zodType.regex(new RegExp(property.pattern));
        if (property.enum) zodType = z.enum(property.enum as [string, ...string[]]);
        break;
      
      case 'number':
        zodType = z.number();
        if (property.minimum) zodType = zodType.min(property.minimum);
        if (property.maximum) zodType = zodType.max(property.maximum);
        break;
      
      case 'boolean':
        zodType = z.boolean();
        break;
      
      default:
        zodType = z.any();
    }
    
    if (!schema.required?.includes(name)) {
      zodType = zodType.optional();
    }
    
    shape[name] = zodType;
  });
  
  return z.object(shape);
}
```

### LLM-Generated Form Example

```typescript
// LLM generates this artifact to collect user data
const contactFormSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "Contact Information",
  "properties": {
    "email": {
      "type": "string",
      "title": "Email Address",
      "pattern": "^[^@]+@[^@]+\\.[^@]+$",
      "x-render": { "component": "input", "placeholder": "you@example.com" }
    },
    "message": {
      "type": "string",
      "title": "Your Message",
      "minLength": 10,
      "maxLength": 1000,
      "x-render": { "component": "markdown", "rows": 10 }
    },
    "priority": {
      "type": "string",
      "title": "Priority",
      "enum": ["low", "medium", "high", "urgent"],
      "default": "medium",
      "x-render": { "component": "select" }
    }
  },
  "required": ["email", "message"]
};

// Rendered as interactive form artifact
function ContactForm() {
  const handleSubmit = (data) => {
    // Send to API
    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  };
  
  return <SchemaFormGenerator schema={contactFormSchema} onSubmit={handleSubmit} />;
}
```

---

## HTML/HTMX Artifact Viewer

### Purpose
Render and preview HTML/HTMX code in a sandboxed iframe with shadow DOM.

### HTMX + Alpine.js Implementation

```html
<!-- html-artifact-viewer.html -->
<div class="zone-artifact zone-artifact--html"
     x-data="htmlArtifactViewer()"
     x-init="init()">
  
  <!-- Use base artifact header -->
  <!-- ... (see artifact-base.html) -->
  
  <div class="zone-artifact__preview">
    <iframe
      x-ref="preview"
      sandbox="allow-scripts allow-same-origin allow-forms"
      class="zone-artifact__iframe"
      @load="onIframeLoad()"></iframe>
  </div>
</div>

<script>
function htmlArtifactViewer() {
  return {
    ...artifactBase(),
    
    init() {
      this.id = this.$el.dataset.artifactId;
      this.content = this.$el.dataset.content;
      this.$nextTick(() => this.renderPreview());
    },
    
    renderPreview() {
      const iframe = this.$refs.preview;
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      
      const html = this.wrapHTML(this.content);
      
      doc.open();
      doc.write(html);
      doc.close();
    },
    
    wrapHTML(content) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://unpkg.com/htmx.org@2.0.0"></script>
          <script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            body { padding: 1rem; font-family: system-ui, sans-serif; }
          </style>
        </head>
        <body>
          ${content}
        </body>
        </html>
      `;
    },
    
    onIframeLoad() {
      this.$dispatch('ai:event', {
        type: 'artifact-loaded',
        artifactId: this.id,
        artifactType: 'html'
      });
    }
  };
}
</script>
```

### React Implementation

```typescript
// HTMLArtifactViewer.tsx
import React, { useEffect, useRef, useState } from 'react';
import { ArtifactViewerProps } from './types';

export const HTMLArtifactViewer: React.FC<ArtifactViewerProps> = ({ artifact }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  
  useEffect(() => {
    renderPreview();
  }, [artifact.content]);
  
  const renderPreview = () => {
    if (!iframeRef.current) return;
    
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    
    const html = wrapHTML(artifact.content);
    
    doc.open();
    doc.write(html);
    doc.close();
  };
  
  const wrapHTML = (content: string): string => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://unpkg.com/htmx.org@2.0.0"></script>
        <script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        <style>
          body { padding: 1rem; font-family: system-ui, sans-serif; }
        </style>
      </head>
      <body>
        ${content}
      </body>
      </html>
    `;
  };
  
  const handleLoad = () => {
    setLoaded(true);
  };
  
  return (
    <div className="zone-artifact__preview">
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts allow-same-origin allow-forms"
        className="zone-artifact__iframe"
        onLoad={handleLoad}
      />
      {!loaded && (
        <div className="zone-artifact__loading">
          <span>Loading preview...</span>
        </div>
      )}
    </div>
  );
};
```

### Flutter Implementation

```dart
// html_artifact_viewer.dart
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../models/artifact.dart';

class HTMLArtifactViewer extends StatefulWidget {
  final Artifact artifact;
  
  const HTMLArtifactViewer({
    Key? key,
    required this.artifact,
  }) : super(key: key);
  
  @override
  State<HTMLArtifactViewer> createState() => _HTMLArtifactViewerState();
}

class _HTMLArtifactViewerState extends State<HTMLArtifactViewer> {
  late WebViewController _controller;
  bool _isLoading = true;
  
  @override
  void initState() {
    super.initState();
    _initializeController();
  }
  
  void _initializeController() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (url) {
            setState(() {
              _isLoading = false;
            });
          },
        ),
      )
      ..loadHtmlString(_wrapHTML(widget.artifact.content));
  }
  
  String _wrapHTML(String content) {
    return '''
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://unpkg.com/htmx.org@2.0.0"></script>
        <script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
        <style>
          body { padding: 1rem; font-family: system-ui, sans-serif; }
        </style>
      </head>
      <body>
        $content
      </body>
      </html>
    ''';
  }
  
  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        WebViewWidget(controller: _controller),
        if (_isLoading)
          const Center(
            child: CircularProgressIndicator(),
          ),
      ],
    );
  }
}
```

### Svelte Implementation

```svelte
<!-- HTMLArtifactViewer.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import type { Artifact } from './types';
  
  export let artifact: Artifact;
  
  let iframeRef: HTMLIFrameElement;
  let loaded = false;
  
  onMount(() => {
    renderPreview();
  });
  
  function renderPreview() {
    if (!iframeRef) return;
    
    const doc = iframeRef.contentDocument;
    if (!doc) return;
    
    const html = wrapHTML(artifact.content);
    
    doc.open();
    doc.write(html);
    doc.close();
  }
  
  function wrapHTML(content: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://unpkg.com/htmx.org@2.0.0"></script>
        <script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        <style>
          body { padding: 1rem; font-family: system-ui, sans-serif; }
        </style>
      </head>
      <body>
        ${content}
      </body>
      </html>
    `;
  }
  
  function handleLoad() {
    loaded = true;
  }
</script>

<div class="zone-artifact__preview">
  <iframe
    bind:this={iframeRef}
    sandbox="allow-scripts allow-same-origin allow-forms"
    class="zone-artifact__iframe"
    on:load={handleLoad}
  />
  {#if !loaded}
    <div class="zone-artifact__loading">
      <span>Loading preview...</span>
    </div>
  {/if}
</div>
```

---

## React Component Viewer

### Purpose
Render React components with JSX in a sandboxed environment.

### HTMX + Alpine.js Implementation

```html
<!-- react-artifact-viewer.html -->
<div class="zone-artifact zone-artifact--react"
     x-data="reactArtifactViewer()"
     x-init="init()">
  
  <div class="zone-artifact__preview">
    <iframe
      x-ref="preview"
      sandbox="allow-scripts allow-same-origin"
      class="zone-artifact__iframe"></iframe>
  </div>
</div>

<script>
function reactArtifactViewer() {
  return {
    ...artifactBase(),
    
    renderPreview() {
      const iframe = this.$refs.preview;
      const doc = iframe.contentDocument;
      
      const html = this.wrapReact(this.content);
      
      doc.open();
      doc.write(html);
      doc.close();
    },
    
    wrapReact(content) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
          <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            body { padding: 1rem; font-family: system-ui, sans-serif; }
          </style>
        </head>
        <body>
          <div id="root"></div>
          <script type="text/babel">
            const { useState, useEffect } = React;
            
            ${content}
            
            // Auto-render component if default export exists
            const Component = typeof exports !== 'undefined' ? exports.default : 
                             typeof App !== 'undefined' ? App : null;
            
            if (Component) {
              ReactDOM.render(<Component />, document.getElementById('root'));
            } else {
              document.getElementById('root').innerHTML = 
                '<div style="padding: 20px; color: red;">No component found. Export a default component or define an App component.</div>';
            }
          </script>
        </body>
        </html>
      `;
    }
  };
}
</script>
```

### React Implementation

```typescript
// ReactArtifactViewer.tsx
import React, { useEffect, useRef } from 'react';
import { ArtifactViewerProps } from './types';

export const ReactArtifactViewer: React.FC<ArtifactViewerProps> = ({ artifact }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  useEffect(() => {
    renderPreview();
  }, [artifact.content]);
  
  const renderPreview = () => {
    if (!iframeRef.current) return;
    
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    
    const html = wrapReact(artifact.content);
    
    doc.open();
    doc.write(html);
    doc.close();
  };
  
  const wrapReact = (content: string): string => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
        <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        <style>
          body { padding: 1rem; font-family: system-ui, sans-serif; }
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script type="text/babel">
          const { useState, useEffect } = React;
          
          ${content}
          
          const Component = typeof exports !== 'undefined' ? exports.default : 
                           typeof App !== 'undefined' ? App : null;
          
          if (Component) {
            ReactDOM.render(<Component />, document.getElementById('root'));
          } else {
            document.getElementById('root').innerHTML = 
              '<div style="padding: 20px; color: red;">No component found.</div>';
          }
        </script>
      </body>
      </html>
    `;
  };
  
  return (
    <div className="zone-artifact__preview">
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts allow-same-origin"
        className="zone-artifact__iframe"
      />
    </div>
  );
};
```

---

## Markdown Viewer/Editor

### Purpose
Render and optionally edit markdown with live preview.

### HTMX + Alpine.js Implementation

```html
<!-- markdown-artifact-viewer.html -->
<div class="zone-artifact zone-artifact--markdown"
     x-data="markdownArtifactViewer()"
     x-init="init()">
  
  <div class="zone-artifact__content"
       :class="{ 'zone-artifact__content--split': viewMode === 'edit' }">
    
    <!-- Editor (if in edit mode) -->
    <div class="zone-markdown-editor"
         x-show="viewMode === 'edit'">
      <textarea
        x-model="content"
        @input.debounce.300ms="renderMarkdown()"
        class="zone-markdown-textarea"
        placeholder="Enter markdown..."></textarea>
    </div>
    
    <!-- Preview -->
    <div class="zone-markdown-preview"
         x-ref="preview"
         x-html="renderedContent"></div>
  </div>
</div>

<script>
function markdownArtifactViewer() {
  return {
    ...artifactBase(),
    renderedContent: '',
    editable: false,
    
    init() {
      this.content = this.$el.dataset.content || '';
      this.editable = this.$el.dataset.editable === 'true';
      this.renderMarkdown();
    },
    
    renderMarkdown() {
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
      
      this.renderedContent = marked.parse(this.content);
      
      this.$nextTick(() => {
        // Render mermaid diagrams
        const mermaidBlocks = this.$refs.preview.querySelectorAll('.language-mermaid');
        mermaidBlocks.forEach(block => {
          const code = block.textContent;
          const div = document.createElement('div');
          div.className = 'mermaid';
          div.textContent = code;
          block.parentElement.replaceWith(div);
        });
        
        if (mermaidBlocks.length > 0) {
          mermaid.run({ nodes: this.$refs.preview.querySelectorAll('.mermaid') });
        }
      });
    }
  };
}
</script>
```

### React Implementation

```typescript
// MarkdownArtifactViewer.tsx
import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import mermaid from 'mermaid';
import { ArtifactViewerProps } from './types';

mermaid.initialize({ startOnLoad: false, theme: 'neutral' });

export const MarkdownArtifactViewer: React.FC<ArtifactViewerProps> = ({ 
  artifact,
  editable = false 
}) => {
  const [content, setContent] = useState(artifact.content);
  const [renderedContent, setRenderedContent] = useState('');
  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview');
  const previewRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    renderMarkdown();
  }, [content]);
  
  useEffect(() => {
    if (previewRef.current) {
      renderMermaidDiagrams();
    }
  }, [renderedContent]);
  
  const renderMarkdown = () => {
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
    
    setRenderedContent(marked.parse(content));
  };
  
  const renderMermaidDiagrams = async () => {
    if (!previewRef.current) return;
    
    const mermaidBlocks = previewRef.current.querySelectorAll('.language-mermaid');
    
    for (const block of Array.from(mermaidBlocks)) {
      const code = block.textContent || '';
      const div = document.createElement('div');
      div.className = 'mermaid';
      div.textContent = code;
      block.parentElement?.replaceWith(div);
    }
    
    if (mermaidBlocks.length > 0) {
      await mermaid.run({ nodes: previewRef.current.querySelectorAll('.mermaid') });
    }
  };
  
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };
  
  return (
    <div className={`zone-artifact__content ${viewMode === 'edit' ? 'zone-artifact__content--split' : ''}`}>
      {editable && viewMode === 'edit' && (
        <div className="zone-markdown-editor">
          <textarea
            value={content}
            onChange={handleContentChange}
            className="zone-markdown-textarea"
            placeholder="Enter markdown..."
          />
        </div>
      )}
      
      <div 
        ref={previewRef}
        className="zone-markdown-preview"
        dangerouslySetInnerHTML={{ __html: renderedContent }}
      />
    </div>
  );
};
```

---

## PDF Viewer

### Purpose
Display PDF files with navigation and zoom controls.

### HTMX + Alpine.js Implementation

```html
<!-- pdf-artifact-viewer.html -->
<div class="zone-artifact zone-artifact--pdf"
     x-data="pdfArtifactViewer()"
     x-init="init()">
  
  <div class="zone-pdf-controls">
    <button @click="previousPage()" :disabled="currentPage === 1">
      <svg class="zone-icon"><use href="#icon-chevron-left"></use></svg>
    </button>
    <span>Page <span x-text="currentPage"></span> of <span x-text="totalPages"></span></span>
    <button @click="nextPage()" :disabled="currentPage === totalPages">
      <svg class="zone-icon"><use href="#icon-chevron-right"></use></svg>
    </button>
    
    <div class="zone-pdf-zoom">
      <button @click="zoomOut()">
        <svg class="zone-icon"><use href="#icon-zoom-out"></use></svg>
      </button>
      <span x-text="`${Math.round(zoom * 100)}%`"></span>
      <button @click="zoomIn()">
        <svg class="zone-icon"><use href="#icon-zoom-in"></use></svg>
      </button>
    </div>
  </div>
  
  <div class="zone-pdf-viewer">
    <canvas x-ref="canvas"></canvas>
  </div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script>
function pdfArtifactViewer() {
  return {
    pdfDoc: null,
    currentPage: 1,
    totalPages: 0,
    zoom: 1.0,
    
    async init() {
      const url = this.$el.dataset.url;
      
      pdfjsLib.GlobalWorkerOptions.workerSrc = 
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      
      this.pdfDoc = await pdfjsLib.getDocument(url).promise;
      this.totalPages = this.pdfDoc.numPages;
      
      await this.renderPage(this.currentPage);
    },
    
    async renderPage(num) {
      const page = await this.pdfDoc.getPage(num);
      const viewport = page.getViewport({ scale: this.zoom });
      
      const canvas = this.$refs.canvas;
      const context = canvas.getContext('2d');
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
    },
    
    async previousPage() {
      if (this.currentPage <= 1) return;
      this.currentPage--;
      await this.renderPage(this.currentPage);
    },
    
    async nextPage() {
      if (this.currentPage >= this.totalPages) return;
      this.currentPage++;
      await this.renderPage(this.currentPage);
    },
    
    async zoomIn() {
      this.zoom = Math.min(this.zoom + 0.25, 3.0);
      await this.renderPage(this.currentPage);
    },
    
    async zoomOut() {
      this.zoom = Math.max(this.zoom - 0.25, 0.5);
      await this.renderPage(this.currentPage);
    }
  };
}
</script>
```

### React Implementation

```typescript
// PDFArtifactViewer.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { ArtifactViewerProps } from './types';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export const PDFArtifactViewer: React.FC<ArtifactViewerProps> = ({ artifact }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };
  
  const previousPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  };
  
  const nextPage = () => {
    setPageNumber(prev => Math.min(prev + 1, numPages));
  };
  
  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3.0));
  };
  
  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };
  
  return (
    <div className="zone-artifact zone-artifact--pdf">
      <div className="zone-pdf-controls">
        <button onClick={previousPage} disabled={pageNumber === 1}>
          <svg className="zone-icon"><use href="#icon-chevron-left" /></svg>
        </button>
        <span>Page {pageNumber} of {numPages}</span>
        <button onClick={nextPage} disabled={pageNumber === numPages}>
          <svg className="zone-icon"><use href="#icon-chevron-right" /></svg>
        </button>
        
        <div className="zone-pdf-zoom">
          <button onClick={zoomOut}>
            <svg className="zone-icon"><use href="#icon-zoom-out" /></svg>
          </button>
          <span>{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn}>
            <svg className="zone-icon"><use href="#icon-zoom-in" /></svg>
          </button>
        </div>
      </div>
      
      <div className="zone-pdf-viewer">
        <Document
          file={artifact.content}
          onLoadSuccess={onDocumentLoadSuccess}>
          <Page pageNumber={pageNumber} scale={scale} />
        </Document>
      </div>
    </div>
  );
};
```

---

## XYFlow/ReactFlow Diagram Viewer

### Purpose
Render interactive node-based diagrams for workflows, system architecture, etc.

### React Implementation (Primary)

```typescript
// XYFlowArtifactViewer.tsx
import React, { useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { ArtifactViewerProps } from './types';

export const XYFlowArtifactViewer: React.FC<ArtifactViewerProps> = ({ artifact }) => {
  const flowData = JSON.parse(artifact.content);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(flowData.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowData.edges || []);
  
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );
  
  return (
    <div className="zone-artifact__preview" style={{ height: '500px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectionMode={ConnectionMode.Loose}
        fitView>
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
};
```

### HTMX + Alpine.js Implementation (Embedded React)

```html
<!-- xyflow-artifact-viewer.html -->
<div class="zone-artifact zone-artifact--xyflow"
     x-data="xyflowArtifactViewer()"
     x-init="init()">
  
  <div class="zone-artifact__preview" x-ref="container"></div>
</div>

<script type="module">
import React from 'https://esm.sh/react@18';
import ReactDOM from 'https://esm.sh/react-dom@18';
import ReactFlow from 'https://esm.sh/reactflow@11';

function xyflowArtifactViewer() {
  return {
    init() {
      const flowData = JSON.parse(this.$el.dataset.content);
      
      const FlowComponent = () => {
        return React.createElement(ReactFlow, {
          nodes: flowData.nodes,
          edges: flowData.edges,
          fitView: true
        });
      };
      
      ReactDOM.render(
        React.createElement(FlowComponent),
        this.$refs.container
      );
    }
  };
}
</script>
```

---

## Mermaid Diagram Viewer

### Purpose
Render Mermaid.js diagrams (flowcharts, sequence diagrams, etc.).

### Universal Implementation (All Frameworks)

```html
<!-- mermaid-artifact-viewer.html -->
<div class="zone-artifact zone-artifact--mermaid"
     x-data="mermaidArtifactViewer()"
     x-init="init()">
  
  <div class="zone-artifact__preview">
    <div class="zone-mermaid-container" x-ref="diagram"></div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<script>
mermaid.initialize({ 
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose'
});

function mermaidArtifactViewer() {
  return {
    async init() {
      const code = this.$el.dataset.content;
      
      try {
        const { svg } = await mermaid.render('mermaid-' + Date.now(), code);
        this.$refs.diagram.innerHTML = svg;
      } catch (error) {
        this.$refs.diagram.innerHTML = `
          <div class="zone-error">
            <p>Failed to render diagram</p>
            <pre>${error.message}</pre>
          </div>
        `;
      }
    }
  };
}
</script>
```

---

## SVG Viewer/Editor

### Purpose
Display and optionally edit SVG graphics.

### HTMX + Alpine.js Implementation

```html
<!-- svg-artifact-viewer.html -->
<div class="zone-artifact zone-artifact--svg"
     x-data="svgArtifactViewer()"
     x-init="init()">
  
  <div class="zone-artifact__preview" x-html="content"></div>
</div>

<script>
function svgArtifactViewer() {
  return {
    content: '',
    
    init() {
      this.content = this.$el.dataset.content;
    }
  };
}
</script>
```

---

## Video Player

### Purpose
Play video files with standard controls.

### Universal HTML Implementation

```html
<!-- video-artifact-viewer.html -->
<div class="zone-artifact zone-artifact--video">
  <video 
    controls
    class="zone-video-player"
    preload="metadata">
    <source src="{{ video_url }}" type="video/mp4">
    <source src="{{ video_url }}" type="video/webm">
    Your browser does not support video playback.
  </video>
</div>
```

---

## Image Viewer

### Purpose
Display images with zoom and pan capabilities.

### HTMX + Alpine.js Implementation

```html
<!-- image-artifact-viewer.html -->
<div class="zone-artifact zone-artifact--image"
     x-data="imageArtifactViewer()">
  
  <div class="zone-image-controls">
    <button @click="zoomIn()">
      <svg class="zone-icon"><use href="#icon-zoom-in"></use></svg>
    </button>
    <button @click="zoomOut()">
      <svg class="zone-icon"><use href="#icon-zoom-out"></use></svg>
    </button>
    <button @click="resetZoom()">
      <svg class="zone-icon"><use href="#icon-maximize"></use></svg>
    </button>
  </div>
  
  <div class="zone-image-container"
       @wheel="handleWheel($event)">
    <img 
      :src="src"
      :alt="alt"
      :style="`transform: scale(${zoom})`"
      class="zone-image"
      draggable="false">
  </div>
</div>

<script>
function imageArtifactViewer() {
  return {
    src: this.$el.dataset.src,
    alt: this.$el.dataset.alt || 'Image',
    zoom: 1.0,
    
    zoomIn() {
      this.zoom = Math.min(this.zoom + 0.25, 5.0);
    },
    
    zoomOut() {
      this.zoom = Math.max(this.zoom - 0.25, 0.25);
    },
    
    resetZoom() {
      this.zoom = 1.0;
    },
    
    handleWheel(e) {
      e.preventDefault();
      if (e.deltaY < 0) {
        this.zoomIn();
      } else {
        this.zoomOut();
      }
    }
  };
}
</script>
```

---

## Code Editor

### Purpose
Interactive code editor with syntax highlighting and execution.

### HTMX + Alpine.js Implementation (Monaco Editor)

```html
<!-- code-editor-artifact.html -->
<div class="zone-artifact zone-artifact--code-editor"
     x-data="codeEditorArtifact()"
     x-init="init()">
  
  <div class="zone-editor-toolbar">
    <select x-model="language" @change="updateLanguage()">
      <option value="javascript">JavaScript</option>
      <option value="python">Python</option>
      <option value="typescript">TypeScript</option>
      <option value="html">HTML</option>
      <option value="css">CSS</option>
    </select>
    
    <button @click="formatCode()">
      <svg class="zone-icon"><use href="#icon-format"></use></svg>
      Format
    </button>
    
    <button @click="runCode()" x-show="canExecute()">
      <svg class="zone-icon"><use href="#icon-play"></use></svg>
      Run
    </button>
  </div>
  
  <div class="zone-editor-container" x-ref="editor"></div>
  
  <div class="zone-editor-output" x-show="output" x-html="output"></div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js"></script>
<script>
function codeEditorArtifact() {
  return {
    editor: null,
    language: 'javascript',
    output: '',
    
    init() {
      require.config({ 
        paths: { 
          vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' 
        } 
      });
      
      require(['vs/editor/editor.main'], () => {
        this.editor = monaco.editor.create(this.$refs.editor, {
          value: this.$el.dataset.content || '',
          language: this.language,
          theme: 'vs-dark',
          automaticLayout: true,
          minimap: { enabled: false }
        });
      });
    },
    
    updateLanguage() {
      if (this.editor) {
        monaco.editor.setModelLanguage(
          this.editor.getModel(),
          this.language
        );
      }
    },
    
    formatCode() {
      if (this.editor) {
        this.editor.getAction('editor.action.formatDocument').run();
      }
    },
    
    canExecute() {
      return ['javascript', 'python'].includes(this.language);
    },
    
    async runCode() {
      const code = this.editor.getValue();
      
      if (this.language === 'javascript') {
        try {
          const result = eval(code);
          this.output = `<pre>${JSON.stringify(result, null, 2)}</pre>`;
        } catch (error) {
          this.output = `<pre class="error">${error.message}</pre>`;
        }
      }
      
      // For Python, would need server-side execution
    }
  };
}
</script>
```

---

## AI Assistant Workflow

### Complete Artifact Generation Flow

When an AI assistant generates an artifact, follow this standardized workflow:

```typescript
// 1. Determine artifact type and requirements
const artifactSpec = {
  type: 'react', // or 'html', 'markdown', etc.
  title: 'User Dashboard',
  requiresData: true,
  libraries: ['@supabase/supabase-js', 'recharts'],
  interactiveForm: false,
};

// 2. Generate lean artifact (data fetching, not data inclusion)
const artifactCode = `
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BarChart, Bar } from 'recharts';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default function UserDashboard() {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from('analytics')
        .select('*')
        .limit(10);
      setData(data);
    }
    fetchData();
  }, []);
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <BarChart width={600} height={300} data={data}>
        <Bar dataKey="value" fill="#8884d8" />
      </BarChart>
    </div>
  );
}
`;

// 3. Create artifact with metadata
const artifact = zones.createArtifact('react', artifactCode, {
  title: artifactSpec.title,
  language: 'typescript',
  dependencies: artifactSpec.libraries,
  environment: 'sandpack',
});

// 4. Save with version tracking
await storage.save(artifact);

// 5. Render in appropriate environment
zones.renderArtifactChunk(artifact, {
  container: document.getElementById('artifacts'),
  viewMode: 'preview',
  streamTarget: 'chat', // or 'code' for live editing
});
```

### Decision Matrix for AI Assistants

**When to use Chat Stream vs Code Stream:**

| Scenario | Stream Target | Reason |
|----------|--------------|--------|
| User asks "explain this code" | `chat` | User wants explanation, not edits |
| User asks "fix the errors" | `code` | Direct code modification needed |
| User asks "add comments" | `code` | Code modification with explanation in chat |
| User asks "how does this work?" | `chat` | Educational explanation |
| User asks "make it responsive" | `code` | Structural code changes |
| User asks "optimize performance" | `code` | Code refactoring needed |

**When to generate data-fetching artifacts:**

```
User needs: Dynamic list/table/chart with >10 items
  └─ YES → Generate artifact with data fetching
  └─ NO → Include data inline if <10 items

User needs: Real-time data
  └─ YES → Generate artifact with polling/websockets
  └─ NO → Static data is fine

User needs: Form to collect input
  └─ YES → Generate JSON Schema form artifact
  └─ NO → Generate standard form
```

### Best Practices

#### ✅ DO: Generate Lean Artifacts

```typescript
// GOOD: Artifact fetches its own data
function ProductList() {
  const [products, setProducts] = useState([]);
  
  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(setProducts);
  }, []);
  
  return <ul>{products.map(p => <li>{p.name}</li>)}</ul>;
}
```

```typescript
// BAD: LLM generates data + UI (fat artifact)
function ProductList() {
  const products = [
    { id: 1, name: 'Product 1', price: 10, description: '...' },
    { id: 2, name: 'Product 2', price: 20, description: '...' },
    // ... 100 more products
  ];
  
  return <ul>{products.map(p => <li>{p.name}</li>)}</ul>;
}
```

#### ✅ DO: Use JSON Schema for Data Collection

```typescript
// GOOD: Generate form artifact for data collection
const schema = {
  type: 'object',
  properties: {
    feedback: {
      type: 'string',
      title: 'Your Feedback',
      'x-render': { component: 'markdown', rows: 10 }
    },
    rating: {
      type: 'number',
      title: 'Rating',
      minimum: 1,
      maximum: 5,
      'x-render': { component: 'select' }
    }
  },
  required: ['feedback']
};
```

```typescript
// BAD: Ask user to type everything manually in chat
"Please type your feedback here, and then rate it from 1-5..."
```

#### ✅ DO: Version Every Significant Change

```typescript
// GOOD: Save version after LLM edit
await storage.save({
  ...artifact,
  content: updatedCode,
  metadata: {
    commitMessage: 'Added error handling',
    author: 'LLM-assisted edit',
  }
});
```

#### ✅ DO: Use Appropriate Execution Environment

```typescript
// React artifacts → Sandpack
environment: 'sandpack'

// HTMX/HTML artifacts → iframe + Shadow DOM
environment: 'iframe-shadow-dom'

// Static content (markdown, images) → Direct render
environment: 'inline'
```

### Standardized Error Handling

All artifact viewers must handle errors consistently:

```typescript
interface ArtifactError {
  type: 'syntax' | 'runtime' | 'network' | 'security';
  message: string;
  stack?: string;
  line?: number;
  column?: number;
}

function ArtifactErrorDisplay({ error }: { error: ArtifactError }) {
  return (
    <div className="zone-artifact-error">
      <div className="zone-error-header">
        <svg className="zone-icon zone-icon--error">
          <use href="#icon-alert-circle" />
        </svg>
        <h4>{error.type} Error</h4>
      </div>
      
      <p className="zone-error-message">{error.message}</p>
      
      {error.line && (
        <p className="zone-error-location">
          Line {error.line}
          {error.column && `, Column ${error.column}`}
        </p>
      )}
      
      {error.stack && (
        <details className="zone-error-stack">
          <summary>Stack Trace</summary>
          <pre>{error.stack}</pre>
        </details>
      )}
      
      {/* Suggest LLM fix */}
      <button 
        onClick={() => handleLLMFix(error)}
        className="zone-button zone-button--secondary">
        Ask AI to Fix
      </button>
    </div>
  );
}
```

---

## Artifact Type Decision Matrix

Use this matrix to help AI assistants select the correct viewer:

| Content Type | Viewer | Detection Pattern |
|-------------|--------|------------------|
| HTML/HTMX | HTMLArtifactViewer | Contains `<html>`, `<div>`, `hx-*` attributes |
| React/JSX | ReactArtifactViewer | Contains `function`, `const`, `return (`, JSX syntax |
| Markdown | MarkdownArtifactViewer | Contains `#`, `**`, `- `, markdown syntax |
| PDF | PDFArtifactViewer | File extension `.pdf` or MIME type |
| XYFlow | XYFlowArtifactViewer | JSON with `nodes` and `edges` arrays |
| Mermaid | MermaidArtifactViewer | Starts with `graph`, `sequenceDiagram`, etc. |
| SVG | SVGArtifactViewer | Contains `<svg>` tag |
| Video | VideoPlayer | File extensions `.mp4`, `.webm`, `.mov` |
| Image | ImageViewer | File extensions `.jpg`, `.png`, `.gif`, `.webp` |
| Code | CodeEditor | Any programming language code |
| Form | SchemaFormGenerator | JSON Schema with `properties` |

---

## Next Steps

- **[JavaScript Utility Library](./MATERIAL_ZONES_JS.md)** - Unified facade for all frameworks
- **[Flutter Library](./MATERIAL_ZONES_FLUTTER.md)** - Complete Flutter implementation

---

This comprehensive guide provides production-ready artifact viewers for all common content types across multiple frameworks.
