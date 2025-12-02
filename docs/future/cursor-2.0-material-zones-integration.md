# Cursor 2.0 + Material Zones Design System: Complete Integration Guide

**Version:** 1.0.0  
**Last Updated:** December 2024  
**Platform:** Cursor IDE 2.0  
**Complexity:** ⭐⭐ Medium

---

## Table of Contents

1. [Overview](#overview)
2. [Cursor 2.0 Architecture](#cursor-20-architecture)
3. [Quick Setup](#quick-setup)
4. [Cursor Rules System](#cursor-rules-system)
5. [Agent Mode Configuration](#agent-mode-configuration)
6. [Multi-Agent Workflows](#multi-agent-workflows)
7. [Notepads Integration](#notepads-integration)
8. [Custom Documentation](#custom-documentation)
9. [Advanced Features](#advanced-features)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

---

## Overview

Cursor 2.0 represents a paradigm shift in AI-assisted development, introducing **agentic coding** where AI agents can autonomously explore codebases, make multi-file changes, run terminal commands, and test their own work. This guide shows you how to configure Cursor 2.0 to generate **precise, production-ready UI/UX** following Material Zones Design System patterns.

### Why Cursor 2.0 is Different

**Traditional IDEs:** You write code → AI suggests completions  
**Cursor 2.0:** You describe intent → AI agents plan, implement, test, and iterate

### Key Capabilities for Material Zones

- **Agent Mode**: Autonomous agents that understand your entire codebase
- **Parallel Agents**: Run up to 8 agents simultaneously for complex tasks
- **Composer 1 Model**: 4x faster inference, completes tasks in <30 seconds
- **Browser Tool**: Agents can test UI changes in real-time
- **Sandboxed Terminals**: Secure command execution
- **Rules System**: Project-specific and path-specific AI guidelines
- **Notepads**: Built-in documentation storage
- **Custom Docs**: Index external documentation (Material Zones docs)

---

## Cursor 2.0 Architecture

### Three Core Modes

```
┌─────────────────────────────────────────────────┐
│           Cursor 2.0 Composer                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  1. ASK MODE (⌘L)                              │
│     • Questions about code                      │
│     • Explanations and discovery                │
│     • Read-only, no edits                      │
│                                                 │
│  2. EDIT MODE (⌘I)                             │
│     • Single-turn focused edits                 │
│     • Uses only context you provide             │
│     • Fast, targeted changes                    │
│                                                 │
│  3. AGENT MODE (⌘. to toggle)                  │
│     ✨ RECOMMENDED FOR MATERIAL ZONES          │
│     • Autonomous codebase exploration           │
│     • Multi-file changes                        │
│     • Terminal command execution                │
│     • Reasoning and planning                    │
│     • Up to 25 tool calls per request          │
│     • Web search capability                     │
│     • Browser testing (2.0 feature)            │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Agent Mode Tools

When Agent mode is enabled, AI has access to:

1. **File Operations**
   - Search codebase
   - Read files
   - Create files
   - Edit files (multi-file atomic changes)
   - Delete files

2. **Terminal Commands**
   - Run npm/yarn/pnpm commands
   - Execute shell scripts
   - Run tests
   - Git operations

3. **Codebase Understanding**
   - Semantic search via embeddings
   - LSP (Language Server Protocol) integration
   - Definition/reference lookups
   - Dependency graph analysis

4. **Web & Documentation**
   - Search web for documentation
   - Access custom indexed docs
   - Query APIs and references

5. **Browser Tool** (Cursor 2.0)
   - Test changes in built-in browser
   - Chrome DevTools integration
   - DOM inspection
   - Performance auditing

### Parallel Agent Architecture (2.0)

```
┌────────────────────────────────────────────┐
│         Your Prompt                        │
│  "Create Material Zones artifact system"  │
└─────────────┬──────────────────────────────┘
              │
    ┌─────────▼─────────┐
    │  Cursor Splits     │
    │  Into 8 Agents     │
    └───────┬───────────┘
            │
    ┌───────┴───────┬───────────┬───────────┐
    ▼               ▼           ▼           ▼
┌────────┐      ┌────────┐  ┌────────┐  ┌────────┐
│Agent 1 │      │Agent 2 │  │Agent 3 │  │Agent 4 │
│React   │      │HTMX    │  │Flutter │  │Testing │
│Impl    │      │Impl    │  │Impl    │  │Suite   │
└────────┘      └────────┘  └────────┘  └────────┘
    │               │           │           │
    └───────┬───────┴───────────┴───────────┘
            │
    ┌───────▼────────┐
    │  Git Worktrees  │
    │  (Isolated)     │
    └───────┬─────────┘
            │
    ┌───────▼─────────┐
    │  Compare Results │
    │  Pick Best       │
    └──────────────────┘
```

**Key Feature:** Each agent works in isolated git worktree, preventing conflicts

---

## Quick Setup

### Step 1: Install Cursor 2.0

```bash
# Download from cursor.com
# Or via Homebrew
brew install --cask cursor

# Verify version (should be 2.0+)
cursor --version
```

### Step 2: Project Structure

```bash
# Create Material Zones project structure
mkdir -p your-project
cd your-project

# Create Cursor rules directory
mkdir -p .cursor/rules

# Create documentation directory
mkdir -p docs/ui

# Copy Material Zones documentation
cp DESIGN_SYSTEM.md docs/ui/
cp CHUNK_IMPLEMENTATIONS.md docs/ui/
cp ARTIFACT_VIEWERS.md docs/ui/
cp MATERIAL_ZONES_JS.md docs/ui/
cp MATERIAL_ZONES_FLUTTER.md docs/ui/
```

### Step 3: Configure Global Settings

Open Cursor → Settings (⌘,) → Features → Chat & Composer

```
✅ Enable Agent mode by default
✅ Enable auto-context
✅ Enable sound on finish
✅ Auto-run terminal commands: SELECTIVE
✅ Auto-fix errors: YES
✅ Browser tool: ENABLED
```

### Step 4: Configure Model Preferences

Cursor Settings → Models

```
Primary Model: claude-sonnet-4 (Anthropic)
Fallback: gpt-4-turbo (OpenAI)
Tab Completion: cursor-small (Cursor's custom model)

For Agent Mode:
✅ claude-sonnet-4 (recommended for Material Zones)
✅ gpt-4-turbo (alternative)
✅ Composer 1 (Cursor's proprietary model, 4x faster)
```

---

## Cursor Rules System

Cursor 2.0 introduces a sophisticated three-tier rules system:

### 1. Global Rules

**Location:** Cursor Settings → General → Rules for AI

**Purpose:** Universal guidelines that apply to ALL projects

**Recommended Global Rules for Material Zones:**

```markdown
# Global Material Zones Guidelines

## Universal Principles

1. Always prioritize user experience and accessibility
2. Follow WCAG 2.1 AA standards minimum
3. Use semantic HTML/proper component structure
4. Write clear, maintainable, documented code
5. Test code before committing

## Code Style

- Use TypeScript for type safety
- Follow functional programming patterns
- Prefer composition over inheritance
- Write self-documenting code with clear names

## Documentation

- Include JSDoc/TSDoc comments for public APIs
- Document complex logic inline
- Keep README files up-to-date

## Testing

- Write unit tests for business logic
- Include integration tests for critical paths
- Test accessibility with automated tools
```

### 2. Project Rules (Always Active)

**Location:** `.cursor/rules/index.md`

**Purpose:** Project-wide standards that apply to ENTIRE codebase

**Create `.cursor/rules/index.md`:**

```markdown
---
name: "Material Zones Project Rules"
description: "Core guidelines for Material Zones Design System implementation"
ruleType: "always"
---

# Material Zones Design System - Project Rules

## Project Configuration

**Project:** {{PROJECT_NAME}}  
**Primary Framework:** {{PRIMARY_FRAMEWORK}}  
**Supported Frameworks:** {{SUPPORTED_FRAMEWORKS}}  
**Storage Backend:** {{ARTIFACT_STORAGE_BACKEND}}  
**Documentation:** `docs/ui/`

---

## Critical Requirements

### 1. ALWAYS Read Documentation First

Before generating ANY UI component:

```typescript
// REQUIRED WORKFLOW
1. Read relevant docs from docs/ui/
2. Extract exact pattern for framework
3. Implement pattern EXACTLY as documented
4. Verify all features are included
5. Test the implementation
```

**Documentation Files Available:**
- `docs/ui/DESIGN_SYSTEM.md` - Core philosophy, patterns, tokens
- `docs/ui/CHUNK_IMPLEMENTATIONS.md` - Component implementations by framework
- `docs/ui/ARTIFACT_VIEWERS.md` - Viewer/editor implementations
- `docs/ui/MATERIAL_ZONES_JS.md` - JavaScript/TypeScript API
- `docs/ui/MATERIAL_ZONES_FLUTTER.md` - Flutter library

### 2. Core Design Principles

#### Borderless Design (CRITICAL)
```css
/* ❌ NEVER DO THIS */
.component {
  border: 1px solid #ccc;
}

/* ✅ ALWAYS DO THIS */
.component {
  background: var(--md-sys-surface);
  padding: var(--md-sys-spacing-400);
}
```

**Why:** Material Zones uses visual zones, not borders. Separation through background colors, elevation, and spacing.

#### Material 3 Dynamic Theming

```typescript
// ✅ CORRECT - Use CSS custom properties
const Component = () => (
  <div style={{
    background: 'var(--md-sys-surface)',
    color: 'var(--md-sys-on-surface)',
    borderRadius: 'var(--md-sys-corner-medium)'
  }}>
    Content
  </div>
);

// ❌ WRONG - Hardcoded colors
const Bad = () => (
  <div style={{ background: '#f5f5f5', color: '#333' }}>
    Content
  </div>
);
```

#### Responsive Breakpoints

```typescript
// Material Zones Breakpoints (MUST USE THESE)
const BREAKPOINTS = {
  mobile: '0px',      // 0-767px
  tablet: '768px',    // 768-1023px
  desktop: '1024px'   // 1024px+
};

// Sidebar → Bottom Navigation at 768px
@media (max-width: 767px) {
  .sidebar { display: none; }
  .bottom-nav { display: flex; }
}
```

### 3. Lean Artifacts Philosophy

```typescript
// ✅ CORRECT - Artifacts fetch their own data
const ArtifactViewer = () => {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    // Fetch data when artifact loads
    fetch('/api/data').then(res => setData(res));
  }, []);
  
  return <DataDisplay data={data} />;
};

// ❌ WRONG - Embedding data in artifact
const BadArtifact = () => {
  const hardcodedData = [/* 1000 items */];
  return <DataDisplay data={hardcodedData} />;
};
```

**Why:** 
- Keeps artifacts lean (low token count)
- Enables real-time data
- Reduces generation time
- Improves performance

### 4. Event-Driven Architecture

```typescript
// ALL components MUST dispatch events for important actions

// ✅ CORRECT
const TextChunk = ({ content }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('ai:chunk-copied', {
      detail: { type: 'text', content }
    }));
  };
  
  return <button onClick={handleCopy}>Copy</button>;
};

// Event naming convention: ai:{action-name}
// Examples: ai:chunk-copied, ai:artifact-saved, ai:error-shown
```

### 5. Dual Streaming for LLM Editing

```typescript
// Artifacts support TWO streaming modes

// Chat Stream - Explanations to user
const handleChatStream = (chunk) => {
  appendToChatBubble(chunk);
};

// Code Stream - Direct code edits
const handleCodeStream = (chunk) => {
  updateEditorContent(chunk);
  debouncePreviewUpdate();
};

// User can toggle between modes
<StreamTargetToggle 
  mode={streamTarget} 
  onChange={setStreamTarget} 
/>
```

### 6. Four View Modes

```typescript
// REQUIRED for all artifact viewers
type ViewMode = 'preview' | 'code' | 'split' | 'browser';

const ArtifactViewer = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  
  return (
    <>
      <ViewModeToggle mode={viewMode} onChange={setViewMode} />
      {/* Render based on mode */}
    </>
  );
};
```

### 7. Versioned Storage

```typescript
// ALL artifacts MUST support version history

interface ArtifactStorage {
  save(artifact: Artifact): Promise<void>;
  load(id: string): Promise<Artifact>;
  loadVersion(id: string, version: number): Promise<Artifact>;
  listVersions(id: string): Promise<ArtifactVersion[]>;
}

// Use PGlite, IndexedDB, or SQLite
// Include commit messages for versions
```

### 8. JSON Schema Forms

```typescript
// Generate forms from JSON Schema instead of asking users

const schema = {
  type: 'object',
  properties: {
    name: { 
      type: 'string',
      'x-render': { component: 'input', placeholder: 'Name' }
    },
    bio: {
      type: 'string',
      'x-render': { component: 'textarea', rows: 4 }
    }
  }
};

<SchemaFormGenerator schema={schema} onSubmit={handleSubmit} />
```

---

## Agent Mode Workflow for UI Generation

When you request UI generation, Agent MUST follow this workflow:

```
1. ANALYZE REQUEST
   ├─ Identify component type (text chunk, artifact viewer, etc.)
   ├─ Determine framework (React, HTMX, Flutter, Svelte)
   └─ List required features

2. READ DOCUMENTATION
   ├─ Open docs/ui/CHUNK_IMPLEMENTATIONS.md (or relevant file)
   ├─ Find section for component type
   ├─ Extract pattern for framework
   └─ Note all required features

3. VALIDATE PATTERN
   ├─ Check for borderless design
   ├─ Verify Material 3 theming
   ├─ Confirm event dispatching
   └─ Ensure accessibility

4. GENERATE CODE
   ├─ Follow pattern EXACTLY
   ├─ Include ALL features from docs
   ├─ Add TypeScript types
   └─ Write tests

5. TEST & VERIFY
   ├─ Use browser tool to test visually
   ├─ Run terminal commands for lint/test
   ├─ Verify no missing features
   └─ Check accessibility

6. DELIVER
   ├─ Create files in correct locations
   ├─ Add to exports/index
   ├─ Update documentation if needed
   └─ Summarize changes
```

---

## Code Generation Templates

### React Component Template

```typescript
// File: src/components/[ComponentName].tsx

import React, { useState, useEffect } from 'react';
import './[ComponentName].css'; // Material Zones CSS

interface [ComponentName]Props {
  // Props with clear types
}

/**
 * [ComponentName] - [Brief description]
 * 
 * Material Zones Design System Component
 * 
 * @see docs/ui/CHUNK_IMPLEMENTATIONS.md - [Component Type] section
 */
export const [ComponentName]: React.FC<[ComponentName]Props> = ({
  // Props destructuring
}) => {
  // Event dispatching for Material Zones
  const dispatchEvent = (action: string, detail: any) => {
    window.dispatchEvent(new CustomEvent(`ai:${action}`, { detail }));
  };

  return (
    <div 
      className="mz-[component-name]"
      role="[appropriate-role]"
      aria-label="[descriptive-label]"
      style={{
        background: 'var(--md-sys-surface)',
        color: 'var(--md-sys-on-surface)',
        borderRadius: 'var(--md-sys-corner-medium)',
        padding: 'var(--md-sys-spacing-400)'
      }}
    >
      {/* Implementation */}
    </div>
  );
};
```

### HTMX Component Template

```html
<!-- File: components/[component-name].html -->

<!-- Material Zones Component: [ComponentName] -->
<div 
  class="mz-[component-name]"
  x-data="[componentName]Data()"
  role="[appropriate-role]"
  aria-label="[descriptive-label]"
  style="
    background: var(--md-sys-surface);
    color: var(--md-sys-on-surface);
    border-radius: var(--md-sys-corner-medium);
    padding: var(--md-sys-spacing-400);
  "
>
  <!-- Implementation -->
</div>

<script>
function [componentName]Data() {
  return {
    // Alpine.js data
    dispatchEvent(action, detail) {
      window.dispatchEvent(new CustomEvent(`ai:${action}`, { detail }));
    }
  };
}
</script>
```

---

## External Libraries Configuration

### React Projects

```json
// Available without LLM generation:
{
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "axios": "^1.6.0",
    "reactflow": "^11.10.0",
    "recharts": "^2.10.0",
    "zustand": "^4.4.0",
    "@tanstack/react-query": "^5.0.0",
    "shadcn-ui": "latest"
  }
}
```

Use these libraries directly - don't generate custom implementations.

---

## Quality Checklist

Before submitting code, verify:

```
Component Checklist:
☐ Follows borderless design (no borders)
☐ Uses Material 3 CSS custom properties
☐ Responsive (mobile/tablet/desktop)
☐ Dispatches events (ai: prefix)
☐ Accessible (ARIA attributes, keyboard nav)
☐ Lean (fetches data, doesn't embed)
☐ TypeScript types included
☐ Documentation comments added
☐ Tests written (if applicable)
☐ Matches documentation pattern EXACTLY

Artifact Checklist:
☐ Dual streaming support
☐ Four view modes (preview/code/split/browser)
☐ Version control with commit messages
☐ Proper execution environment (Sandpack/iframe)
☐ External library support configured
☐ Data fetching implemented
☐ JSON Schema forms (if needed)
```

---

## File Organization

```
project/
├── .cursor/
│   └── rules/
│       ├── index.md              # Always active
│       ├── react-components.md   # *.tsx, *.jsx
│       ├── htmx-components.md    # *.html
│       └── styles.md             # *.css
├── docs/
│   └── ui/
│       ├── DESIGN_SYSTEM.md
│       ├── CHUNK_IMPLEMENTATIONS.md
│       ├── ARTIFACT_VIEWERS.md
│       ├── MATERIAL_ZONES_JS.md
│       └── MATERIAL_ZONES_FLUTTER.md
├── src/
│   ├── components/
│   │   ├── chunks/               # Chunk components
│   │   ├── artifacts/            # Artifact viewers
│   │   └── ui/                   # UI primitives
│   ├── styles/
│   │   └── material-zones.css    # Theme tokens
│   └── types/
│       └── material-zones.d.ts   # TypeScript types
└── tests/
    └── components/
```

---

## Important Reminders

1. **NEVER create custom implementations** - Follow documentation patterns EXACTLY
2. **ALWAYS read documentation first** - Don't guess patterns
3. **Borderless design is non-negotiable** - No borders, ever
4. **Material 3 theming required** - CSS custom properties only
5. **Events must be dispatched** - All important actions
6. **Artifacts must be lean** - Fetch data, don't embed
7. **Four view modes mandatory** - For all artifact viewers
8. **Version history required** - All artifacts must support rollback
9. **Accessibility is required** - WCAG 2.1 AA minimum
10. **Test before delivering** - Use browser tool to verify
```

**End of File: `.cursor/rules/index.md`**

---

### 3. Path-Specific Rules

**Location:** `.cursor/rules/[rule-name].md`

**Purpose:** Auto-activate for specific files/paths

**Example: React Component Rule**

Create `.cursor/rules/react-components.md`:

```markdown
---
name: "React Components"
description: "Material Zones React component guidelines"
filePattern: "**/*.tsx"
filePattern: "**/*.jsx"
ruleType: "auto"
---

# React Component Rules

## When This Rule Activates

This rule automatically activates when you work with `.tsx` or `.jsx` files.

## React-Specific Requirements

### 1. Use Functional Components

```typescript
// ✅ CORRECT
const Component: React.FC<Props> = ({ prop }) => {
  return <div>{prop}</div>;
};

// ❌ WRONG
class Component extends React.Component {
  render() { return <div>{this.props.prop}</div>; }
}
```

### 2. Hooks for State Management

```typescript
import { useState, useEffect, useCallback } from 'react';

const Component = () => {
  const [state, setState] = useState(initialValue);
  
  useEffect(() => {
    // Side effects
  }, [dependencies]);
  
  const handler = useCallback(() => {
    // Memoized handler
  }, [dependencies]);
};
```

### 3. Material Zones Event Integration

```typescript
// Create event dispatcher hook
const useMaterialZonesEvents = () => {
  const dispatch = useCallback((action: string, detail: any) => {
    window.dispatchEvent(new CustomEvent(`ai:${action}`, { 
      detail: { ...detail, timestamp: Date.now() }
    }));
  }, []);
  
  return dispatch;
};

// Use in components
const Component = () => {
  const dispatchEvent = useMaterialZonesEvents();
  
  const handleAction = () => {
    dispatchEvent('chunk-copied', { type: 'text', content });
  };
};
```

### 4. Sandpack Configuration for React Artifacts

```typescript
// When creating artifact viewers for React
import { Sandpack } from '@codesandbox/sandpack-react';

const ReactArtifactViewer = ({ code }) => (
  <Sandpack
    template="react-ts"
    files={{
      '/App.tsx': code,
      '/styles.css': materialZonesStyles
    }}
    options={{
      showNavigator: true,
      showTabs: true,
      showLineNumbers: true,
      editorHeight: 500
    }}
    customSetup={{
      dependencies: {
        '@supabase/supabase-js': '^2.38.0',
        'reactflow': '^11.10.0',
        'recharts': '^2.10.0'
      }
    }}
  />
);
```

### 5. Reference Documentation

When generating React components, ALWAYS reference:
- @file:docs/ui/CHUNK_IMPLEMENTATIONS.md (React sections)
- @file:docs/ui/MATERIAL_ZONES_JS.md (API reference)
- @file:docs/ui/ARTIFACT_VIEWERS.md (Viewer implementations)
```

**Create `.cursor/rules/htmx-components.md`:**

```markdown
---
name: "HTMX Components"
description: "Material Zones HTMX component guidelines"
filePattern: "**/*.html"
ruleType: "auto"
---

# HTMX Component Rules

## When This Rule Activates

Auto-activates for `.html` files using HTMX patterns.

## HTMX-Specific Requirements

### 1. Alpine.js for Interactivity

```html
<!-- ✅ CORRECT -->
<div x-data="componentData()">
  <button @click="handleAction()">Action</button>
</div>

<script>
function componentData() {
  return {
    state: null,
    handleAction() {
      // Logic here
    }
  };
}
</script>
```

### 2. HTMX Attributes for Data Fetching

```html
<!-- ✅ CORRECT - Lean artifact with data fetching -->
<div hx-get="/api/data"
     hx-trigger="load"
     hx-target="#data-container"
     hx-swap="innerHTML">
  <div id="data-container">Loading...</div>
</div>

<!-- ❌ WRONG - Embedded data -->
<div>
  <!-- 1000 items hardcoded -->
</div>
```

### 3. Material Zones Styling

```html
<div style="
  background: var(--md-sys-surface);
  color: var(--md-sys-on-surface);
  border-radius: var(--md-sys-corner-medium);
  padding: var(--md-sys-spacing-400);
">
  Content
</div>
```

### 4. Reference Documentation

Always reference:
- @file:docs/ui/CHUNK_IMPLEMENTATIONS.md (HTMX sections)
- @file:docs/ui/ARTIFACT_VIEWERS.md (iframe + Shadow DOM patterns)
```

---

## Agent Mode Configuration

### Optimal Agent Settings

Open Cursor Settings → Features → Agent

```
🔧 RECOMMENDED CONFIGURATION

Model Selection:
Primary: claude-sonnet-4
Fallback: Composer 1 (Cursor's fast model)

Tool Settings:
✅ Enable file search
✅ Enable file creation
✅ Enable file editing
✅ Enable terminal commands
✅ Enable web search
✅ Enable browser tool

Auto-run Settings:
✅ Auto-run terminal commands: SELECTIVE
   - Allow: npm install, npm test, git status
   - Deny: rm -rf, sudo, dd
✅ Auto-fix errors: YES
✅ Continue on error: NO (stop and ask)

Context Settings:
✅ Auto-context: ENABLED
✅ Max context files: 50
✅ Include @Recommended: YES

Yolo Mode:
⚠️  Use with caution
✅ Enabled for trusted projects only
```

### Agent Mode Keyboard Shortcuts

```
⌘I (Cmd+I)      - Open Composer
⌘L (Cmd+L)      - Open Chat/Ask mode
⌘. (Cmd+Period) - Toggle Agent mode
⌘N (Cmd+N)      - New Composer conversation
⌘T (Cmd+T)      - New tab (multiple agents)
⌘↵ (Cmd+Enter)  - Send message
⌘K (Cmd+K)      - Quick edit mode
```

### Using Agent Mode Effectively

#### Example 1: Generate Text Chunk Component

```
User: Create a text chunk component following Material Zones patterns

Agent Workflow:
1. [Agent] Searching codebase for existing patterns...
2. [Agent] Reading docs/ui/CHUNK_IMPLEMENTATIONS.md...
3. [Agent] Found Text Chunk section for React
4. [Agent] Extracting pattern with markdown rendering, copy function, events
5. [Agent] Creating src/components/chunks/TextChunk.tsx...
6. [Agent] Adding Material 3 theming with CSS custom properties
7. [Agent] Implementing event dispatching
8. [Agent] Adding TypeScript types
9. [Agent] Creating test file
10. [Agent] Running npm test...
11. ✅ All tests passing
12. [Agent] Summary: Created TextChunk component with all Material Zones features

Files created:
- src/components/chunks/TextChunk.tsx
- src/components/chunks/TextChunk.test.tsx
- src/components/chunks/TextChunk.css
```

#### Example 2: Build Complete Artifact System

```
User: Build the complete artifact editing system from ARTIFACT_VIEWERS.md

Agent Workflow:
1. [Agent] Reading docs/ui/ARTIFACT_VIEWERS.md...
2. [Agent] Analyzing requirements:
   - Dual streaming (chat/code modes)
   - Four view modes (preview/code/split/browser)
   - PGlite versioning
   - Sandpack integration
   - JSON Schema forms
3. [Agent] Planning file structure:
   - ArtifactEditor.tsx (main component)
   - ViewModeToggle.tsx
   - StreamTargetToggle.tsx
   - useArtifactStreaming.ts (custom hook)
   - PGliteArtifactStorage.ts
   - SchemaFormGenerator.tsx
4. [Agent] Generating components in parallel...
5. [Agent] Creating 6 files...
6. [Agent] Setting up imports and exports...
7. [Agent] Adding integration tests...
8. [Agent] Running tests... ✅ Pass
9. [Agent] Testing in browser tool...
10. [Agent] Verifying UI responsiveness... ✅
11. [Agent] Done! Artifact system ready.

Summary:
Created complete artifact editing system with all Material Zones features.
All components follow borderless design and use Material 3 theming.
```

---

## Multi-Agent Workflows

### Parallel Agent Architecture

Cursor 2.0 can run up to **8 agents simultaneously**, each in isolated git worktrees.

#### Use Case: Cross-Framework Implementation

```
Prompt: "Implement text chunk component for all frameworks"

Cursor spawns 4 agents in parallel:

Agent 1 (React):        Agent 2 (HTMX):
├─ TextChunk.tsx        ├─ text-chunk.html
├─ Uses Sandpack        ├─ Uses Alpine.js
├─ TypeScript           ├─ Native fetch
└─ Tests                └─ Tests

Agent 3 (Flutter):      Agent 4 (Svelte):
├─ TextChunk.dart       ├─ TextChunk.svelte
├─ Material widgets     ├─ Svelte stores
├─ Dart types          ├─ TypeScript
└─ Tests               └─ Tests

Each agent:
1. Reads CHUNK_IMPLEMENTATIONS.md
2. Extracts framework-specific pattern
3. Implements in isolation
4. Tests independently
5. Reports completion

Result: 4 implementations, consistent API, all tested
Time: ~60 seconds (vs. 4 minutes serial)
```

#### Configuring Parallel Agents

```bash
# Enable parallel agents
Cursor Settings → Features → Agent → Parallel Agents: ENABLED

# Set max parallel agents (1-8)
Max Parallel Agents: 4

# Isolation method
Isolation: git worktrees (recommended)
Alternative: remote machines (for complex projects)
```

#### Multi-Agent Prompt Patterns

```
# Pattern 1: Parallel Implementation
"Implement [component] for React, HTMX, Flutter, and Svelte in parallel"

# Pattern 2: Comparative Analysis
"Generate 3 different implementations of [feature] and compare performance"

# Pattern 3: Test Matrix
"Run tests with 4 different model configurations and report results"

# Pattern 4: Documentation Generation
"Generate documentation for all components in parallel"
```

### Role-Based Agent Orchestration

Assign specific roles to agents within a single session:

```
You are coordinating 3 specialized agents:

AGENT 1 - "Frontend Agent"
- Generates UI components
- Reads CHUNK_IMPLEMENTATIONS.md
- Follows Material Zones patterns exactly
- Creates React/HTMX components

AGENT 2 - "Testing Agent"  
- Writes comprehensive tests
- Verifies accessibility
- Checks Material Zones compliance
- Uses browser tool for visual testing

AGENT 3 - "Documentation Agent"
- Updates documentation
- Generates API references
- Creates usage examples
- Maintains README files

Workflow:
1. Frontend Agent creates component
2. Testing Agent verifies implementation
3. Documentation Agent updates docs
4. Repeat until complete
```

### Agent Handoff Pattern

```
Goal: Build artifact editing system

Task 1: Frontend Agent
Create ArtifactEditor component with:
- Dual streaming
- View mode toggle
- Sandpack integration

→ Handoff to Testing Agent

Task 2: Testing Agent
Verify ArtifactEditor:
- Test dual streaming works
- Test all view modes
- Check Material Zones compliance
- Use browser tool for visual test

→ Handoff to Storage Agent

Task 3: Storage Agent
Implement PGlite versioning:
- Create storage interface
- Implement version history
- Add rollback functionality

→ Handoff to Integration Agent

Task 4: Integration Agent
Integrate all components:
- Wire up storage to editor
- Connect event system
- Test end-to-end flow
```

---

## Notepads Integration

Cursor 2.0 introduces **Notepads** - built-in storage for frequently referenced content.

### Creating Material Zones Notepads

```
1. Open Cursor
2. View → Notepads (or ⌘⇧E)
3. Create notepads for each documentation section
```

#### Notepad 1: Design System Principles

```markdown
# Material Zones Design Principles

Quick reference for core principles:

1. **Borderless Design**
   - No borders, ever
   - Use zones: background, elevation, spacing

2. **Material 3 Theming**
   - CSS custom properties only
   - Dynamic color tokens
   - --md-sys-* variables

3. **Responsive Breakpoints**
   - Mobile: 0-767px
   - Tablet: 768-1023px  
   - Desktop: 1024px+

4. **Lean Artifacts**
   - Fetch data, don't embed
   - Keep token count low
   - Enable real-time updates

5. **Event-Driven**
   - ai:* event prefix
   - Dispatch for important actions
   - Enable parent coordination

[Full details: @file:docs/ui/DESIGN_SYSTEM.md]
```

#### Notepad 2: Common Patterns

```typescript
// Material Zones Code Snippets

// 1. Event Dispatcher Hook
const useMZEvents = () => {
  return useCallback((action: string, detail: any) => {
    window.dispatchEvent(new CustomEvent(`ai:${action}`, { detail }));
  }, []);
};

// 2. Material 3 Styling
const mzStyles = {
  surface: 'var(--md-sys-surface)',
  onSurface: 'var(--md-sys-on-surface)',
  surfaceVariant: 'var(--md-sys-surface-variant)',
  cornerMedium: 'var(--md-sys-corner-medium)',
  spacing400: 'var(--md-sys-spacing-400)'
};

// 3. Responsive Hook
const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  
  useEffect(() => {
    const handler = () => {
      const width = window.innerWidth;
      if (width < 768) setBreakpoint('mobile');
      else if (width < 1024) setBreakpoint('tablet');
      else setBreakpoint('desktop');
    };
    
    handler();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  
  return breakpoint;
};

// 4. Supabase Data Fetching
const useSupabaseData = (table: string) => {
  const [data, setData] = useState([]);
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
  
  useEffect(() => {
    supabase.from(table).select('*').then(({ data }) => setData(data));
  }, [table]);
  
  return data;
};
```

#### Notepad 3: Checklist

```
Material Zones Component Checklist

Before submitting code, verify:

Design:
☐ No borders (borderless design)
☐ Material 3 CSS custom properties
☐ Responsive (768px breakpoint)
☐ Proper elevation/spacing

Functionality:
☐ Events dispatched (ai:* prefix)
☐ Data fetching (not embedded)
☐ TypeScript types included
☐ Error handling implemented

Accessibility:
☐ ARIA labels
☐ Keyboard navigation
☐ Focus indicators
☐ Screen reader tested

Testing:
☐ Unit tests written
☐ Visual test in browser tool
☐ Responsive test (mobile/tablet/desktop)
☐ Accessibility audit passed

Documentation:
☐ JSDoc comments
☐ Usage examples
☐ README updated
```

### Using Notepads with Agent

```
User: Create a text chunk component

Agent: Let me check the Notepad for common patterns...
[Agent references Notepad 2 for event dispatcher]
[Agent references Notepad 1 for design principles]
[Agent creates component following patterns]
```

---

## Custom Documentation

### Indexing Material Zones Documentation

Cursor 2.0 can index external documentation for semantic search.

#### Step 1: Add Custom Docs

```
1. Open Cursor
2. Settings → Features → Docs
3. Click "Add New Doc"
4. Choose documentation method:
   - URL: Enter root URL (e.g., https://docs.materialzones.com)
   - Local Files: Select docs/ui/ directory
```

#### Step 2: Index Documentation

```bash
# Cursor will crawl and index:
docs/ui/DESIGN_SYSTEM.md
docs/ui/CHUNK_IMPLEMENTATIONS.md
docs/ui/ARTIFACT_VIEWERS.md
docs/ui/MATERIAL_ZONES_JS.md
docs/ui/MATERIAL_ZONES_FLUTTER.md

# Indexing creates embeddings for semantic search
# Agent can now search: "how to implement borderless design"
# Returns relevant sections from documentation
```

#### Step 3: Use in Agent Mode

```
User: How do I implement Material 3 theming?

Agent: Let me search the Material Zones documentation...
[Agent searches indexed docs]
[Agent finds DESIGN_SYSTEM.md section on theming]
[Agent reads section]
[Agent provides answer with code examples]

Agent: "Material 3 theming uses CSS custom properties:
```css
.component {
  background: var(--md-sys-surface);
  color: var(--md-sys-on-surface);
}
```
See full documentation: @docs/ui/DESIGN_SYSTEM.md"
```

### Documentation Search Patterns

```
# Pattern 1: Direct Search
User: "Search Material Zones docs for event dispatching"
Agent: [Searches indexed docs, returns results]

# Pattern 2: Automatic Context
User: "Create a component"
Agent: [Auto-searches docs for relevant patterns]

# Pattern 3: @Docs Symbol
User: "Implement @docs:borderless-design pattern"
Agent: [Searches for "borderless design" in docs]
```

---

## Advanced Features

### 1. Browser Tool for Testing

Cursor 2.0 includes built-in browser with Chrome DevTools.

#### Using Browser Tool

```
User: Create artifact viewer and test it

Agent Workflow:
1. [Agent] Creates ArtifactViewer.tsx
2. [Agent] Starts dev server: npm run dev
3. [Agent] Opens browser tool
4. [Agent] Navigates to http://localhost:3000
5. [Agent] Tests component visually
6. [Agent] Opens Chrome DevTools
7. [Agent] Checks console for errors
8. [Agent] Inspects DOM structure
9. [Agent] Tests responsive breakpoints
10. [Agent] Reports: "Component works correctly, responsive at 768px"
```

#### Browser Tool Commands

```
# Open browser tool
Agent: "Open browser and navigate to http://localhost:3000"

# Interact with page
Agent: "Click the 'Copy' button and verify event is dispatched"

# Check responsive
Agent: "Resize to 767px width and verify sidebar becomes bottom nav"

# DevTools inspection
Agent: "Open DevTools and check for console errors"

# Performance audit
Agent: "Run Lighthouse audit for performance"
```

### 2. Sandboxed Terminals (macOS)

Secure command execution with allowlists.

#### Configure Terminal Sandbox

```bash
# Cursor Settings → Features → Terminal

Sandbox Mode: ENABLED (macOS default)

Allowlist (auto-run):
✅ npm install
✅ npm test
✅ npm run dev
✅ git status
✅ git diff

Denylist (require approval):
❌ rm -rf
❌ sudo
❌ dd
❌ curl | bash
❌ chmod +x && ./

Network Access: ENABLED for workspace only
```

#### Agent Terminal Usage

```
Agent: "I need to install dependencies"
[Agent runs: npm install]
[Executes in sandbox]
[No approval needed - on allowlist]

Agent: "Tests failing, let me check"
[Agent runs: npm test]
[Shows output]
[Auto-fixes based on error messages]
```

### 3. Yolo Mode

**⚠️ WARNING: Use with extreme caution**

Yolo mode allows Agent to execute commands WITHOUT approval.

#### When to Enable Yolo Mode

```
✅ Good use cases:
- Trusted, well-understood projects
- Running comprehensive test suites
- Automated refactoring tasks
- CI/CD-like workflows

❌ Never enable for:
- Unfamiliar codebases
- Projects with sensitive data
- Production deployments
- Unknown third-party code
```

#### Configure Yolo Mode

```bash
# Cursor Settings → Features → Agent → Yolo Mode

Yolo Mode: ENABLED (use cautiously)

Task Pattern:
User: "Fix all failing tests and iterate until they pass"

Agent:
1. npm test (runs automatically)
2. [Sees failures]
3. [Fixes code]
4. npm test (runs automatically)
5. [Still failing]
6. [Fixes more]
7. npm test (runs automatically)
8. ✅ All tests pass
9. Done!

Without Yolo: You'd approve each npm test run
With Yolo: Agent iterates automatically until success
```

### 4. Plan Mode

Create execution plans with one model, execute with another.

#### Using Plan Mode

```
Step 1: Create Plan
Model: gpt-4-turbo (good at planning)
Prompt: "Plan out the complete artifact system implementation"

Agent generates plan:
1. Read ARTIFACT_VIEWERS.md
2. Create file structure
3. Implement ArtifactEditor component
4. Add dual streaming
5. Integrate Sandpack
6. Implement versioning
7. Add tests
8. Document API

Step 2: Execute Plan
Model: Composer 1 (fast execution)
Execute plan in background

Step 3: Review
[Review completed implementation]
[Accept or request changes]
```

### 5. Multiple Agent Tabs

Work on multiple tasks simultaneously.

```
⌘T - New Agent tab

Tab 1: "Frontend Agent"
- Working on UI components

Tab 2: "Testing Agent"  
- Writing tests

Tab 3: "Docs Agent"
- Updating documentation

Tab 4: "Refactor Agent"
- Restructuring codebase

Switch between tabs to coordinate work
```

---

## Best Practices

### 1. Start with Clear Context

```
❌ BAD:
"Create a component"

✅ GOOD:
"Create a text chunk component for React following the Material Zones pattern in docs/ui/CHUNK_IMPLEMENTATIONS.md. Include markdown rendering, copy functionality, and event dispatching."
```

### 2. Reference Documentation Explicitly

```
❌ BAD:
"Make it follow Material Zones"

✅ GOOD:
"Follow the exact pattern from @file:docs/ui/CHUNK_IMPLEMENTATIONS.md, React Text Chunk section. Include all features listed."
```

### 3. Use Checkpoints

```
Agent creates checkpoints after each major change.

If you don't like a change:
1. Click "Checkout" next to checkpoint
2. Return to previous state
3. Give new instructions

This enables safe iteration.
```

### 4. Leverage Auto-Context

```
Enable auto-context in settings.

Agent will automatically include:
- Related files
- Dependencies
- Recent changes
- Relevant documentation

You get better results without manual @ symbols.
```

### 5. Review Before Accepting

```
Agent shows diffs before applying changes.

Always review:
☐ Changes match requirements
☐ No unintended modifications
☐ Tests still pass
☐ Documentation updated

Then click "Accept" or "Reject".
```

### 6. Use Browser Tool for Visual Verification

```
After generating UI components:

1. Agent: "Open browser tool"
2. Agent: "Navigate to component"
3. Agent: "Test interactions"
4. Agent: "Verify responsive behavior"
5. Agent: "Check accessibility"

Catch visual issues before deployment.
```

### 7. Combine Notepads + Rules + Docs

```
Notepads: Quick reference snippets
Rules: Automatic guidelines  
Custom Docs: Searchable knowledge base

Together = powerful AI assistant that:
- Knows your patterns
- Follows your standards
- Searches documentation
- Generates compliant code
```

### 8. Iterate with Specific Feedback

```
❌ BAD:
"This doesn't look right"

✅ GOOD:
"The component uses borders instead of borderless design. Update to use background zones with var(--md-sys-surface) as shown in DESIGN_SYSTEM.md."
```

### 9. Test Cross-Framework Consistency

```
When generating for multiple frameworks:

User: "Verify all implementations have identical APIs"

Agent checks:
- Same prop names
- Same event names
- Same method signatures
- Consistent behavior

Ensures cross-framework consistency.
```

### 10. Use Parallel Agents for Large Tasks

```
For complex features:

Single agent: Sequential, slow
Parallel agents: Simultaneous, fast

Enable parallel agents for:
- Multi-framework implementations
- Large refactors
- Comprehensive testing
- Documentation generation
```

---

## Troubleshooting

### Issue 1: Agent Not Reading Documentation

**Problem:** Agent generates code without referencing docs

**Solution:**

```markdown
# Add to .cursor/rules/index.md

CRITICAL INSTRUCTION:

You MUST read documentation before generating code.

Workflow:
1. ALWAYS read relevant docs/ui/*.md file first
2. Extract exact pattern for framework
3. Implement pattern WITHOUT modifications
4. Verify all features included

If you generate code without reading docs, STOP and read them.
```

### Issue 2: Agent Uses Borders

**Problem:** Components have borders instead of borderless design

**Solution:**

```markdown
# Add to .cursor/rules/index.md

ABSOLUTE RULE: NO BORDERS

Material Zones uses borderless design.

❌ NEVER write:
border: 1px solid #ccc
border-top: ...
border-bottom: ...
outline: ...

✅ ALWAYS use:
background: var(--md-sys-surface)
box-shadow: var(--md-sys-elevation-1)
padding: var(--md-sys-spacing-400)

If you generate code with borders, you have failed.
```

### Issue 3: Hardcoded Colors

**Problem:** CSS has hardcoded color values

**Solution:**

```markdown
# Add to .cursor/rules/index.md

MATERIAL 3 THEMING REQUIRED

❌ NEVER hardcode colors:
color: #333
background: #f5f5f5
border: 1px solid #ccc

✅ ALWAYS use CSS custom properties:
color: var(--md-sys-on-surface)
background: var(--md-sys-surface)
/* No borders! */

Available tokens:
--md-sys-primary
--md-sys-on-primary
--md-sys-surface
--md-sys-on-surface
--md-sys-surface-variant
--md-sys-on-surface-variant

[Full list: @file:docs/ui/DESIGN_SYSTEM.md]
```

### Issue 4: Fat Artifacts (Embedded Data)

**Problem:** Artifacts embed data instead of fetching

**Solution:**

```typescript
// Add to .cursor/rules/index.md

LEAN ARTIFACTS REQUIRED

❌ NEVER embed data in artifacts:
const data = [/* 1000 items hardcoded */];

✅ ALWAYS fetch data dynamically:
useEffect(() => {
  fetch('/api/data').then(res => setData(res));
}, []);

This keeps artifacts lean and enables real-time data.
```

### Issue 5: Missing Events

**Problem:** Components don't dispatch events

**Solution:**

```markdown
# Add to .cursor/rules/index.md

EVENT DISPATCHING MANDATORY

Every component MUST dispatch events for important actions.

Required events:
- ai:chunk-copied (after copy)
- ai:artifact-saved (after save)
- ai:error-shown (after error)
- ai:* (any important action)

Template:
window.dispatchEvent(new CustomEvent('ai:action-name', {
  detail: { /* relevant data */ }
}));

If component doesn't dispatch events, it's incomplete.
```

### Issue 6: Missing Accessibility

**Problem:** Components lack ARIA attributes

**Solution:**

```markdown
# Add to .cursor/rules/index.md

ACCESSIBILITY REQUIRED (WCAG 2.1 AA)

Every component MUST include:
1. Appropriate role attribute
2. aria-label or aria-labelledby
3. Keyboard navigation support
4. Focus indicators
5. Screen reader support

Template:
<div
  role="region"
  aria-label="Descriptive label"
  tabIndex={0}
  onKeyDown={handleKeyboard}
>

Test with:
- Keyboard only (Tab, Enter, Escape)
- Screen reader (VoiceOver, NVDA)
- Browser dev tools accessibility audit
```

### Issue 7: Agent Times Out

**Problem:** Agent reaches 25 tool call limit

**Solution:**

```
Agent stopped: "Reached tool call limit"

Option 1: Click "Continue" to allow 25 more tool calls
Option 2: Break task into smaller subtasks
Option 3: Enable Yolo mode for auto-iteration
```

### Issue 8: Browser Tool Not Working

**Problem:** Browser tool fails to open

**Solution:**

```bash
# Check settings
Cursor Settings → Features → Browser Tool → ENABLED

# Ensure dev server running
npm run dev

# Check port is correct
Agent: "Navigate to http://localhost:3000"
(Update port if different)

# Check firewall
Browser tool needs localhost access
```

### Issue 9: Tests Failing After Generation

**Problem:** Generated code doesn't pass tests

**Solution:**

```
Enable auto-fix in settings:
Cursor Settings → Features → Agent → Auto-fix errors: YES

Agent will:
1. Run tests
2. See failures
3. Fix code automatically
4. Re-run tests
5. Iterate until passing
```

### Issue 10: Inconsistent Cross-Framework

**Problem:** React and HTMX implementations differ

**Solution:**

```markdown
# Add to prompt

"Ensure all framework implementations have:
1. Identical prop/attribute names
2. Same event names (ai:*)
3. Same method signatures
4. Consistent behavior

Verify by comparing:
- React: TextChunk.tsx
- HTMX: text-chunk.html

Props should map 1:1."
```

---

## Example Workflows

### Workflow 1: Single Component Generation

```
User: "Create citation chunk for React"

Agent:
1. ✅ Read docs/ui/CHUNK_IMPLEMENTATIONS.md
2. ✅ Found Citation Chunk section for React
3. ✅ Extract pattern:
   - Citation text with author
   - Copy functionality
   - Click to expand
   - Event dispatching
4. ✅ Generate src/components/chunks/CitationChunk.tsx
5. ✅ Material 3 theming applied
6. ✅ Events: ai:chunk-copied, ai:citation-expanded
7. ✅ TypeScript types included
8. ✅ Tests created
9. ✅ npm test... PASSED
10. ✅ Browser tool visual verification
11. ✅ Done!

Files created:
- src/components/chunks/CitationChunk.tsx
- src/components/chunks/CitationChunk.test.tsx
- src/components/chunks/CitationChunk.css
```

### Workflow 2: Multi-Framework Parallel Generation

```
User: "Implement memory chunk for all frameworks in parallel"

Cursor spawns 4 agents:

Agent 1 (React):
├─ Read CHUNK_IMPLEMENTATIONS.md
├─ Extract React Memory Chunk
├─ Generate MemoryChunk.tsx
└─ Test ✅

Agent 2 (HTMX):
├─ Read CHUNK_IMPLEMENTATIONS.md
├─ Extract HTMX Memory Chunk
├─ Generate memory-chunk.html
└─ Test ✅

Agent 3 (Flutter):
├─ Read CHUNK_IMPLEMENTATIONS.md
├─ Extract Flutter Memory Chunk
├─ Generate MemoryChunk.dart
└─ Test ✅

Agent 4 (Svelte):
├─ Read CHUNK_IMPLEMENTATIONS.md
├─ Extract Svelte Memory Chunk
├─ Generate MemoryChunk.svelte
└─ Test ✅

[All complete in ~45 seconds]

Verification Agent:
├─ Compare all implementations
├─ Verify API consistency
├─ Check Material Zones compliance
└─ Report: "All implementations consistent ✅"
```

### Workflow 3: Complete Feature Implementation

```
User: "Build complete artifact system from ARTIFACT_VIEWERS.md"

Agent (using Agent + Plan modes):

PHASE 1: PLANNING
[Agent reads ARTIFACT_VIEWERS.md]
[Agent creates 15-step implementation plan]
[User reviews plan]
[User: "Looks good, proceed"]

PHASE 2: IMPLEMENTATION
Step 1-3: Core Components
[Agent creates ArtifactEditor, ViewModeToggle, StreamTargetToggle]
[Checkpoint created]

Step 4-6: Storage System
[Agent implements PGliteArtifactStorage]
[Agent adds version history UI]
[Checkpoint created]

Step 7-9: Sandpack Integration
[Agent configures Sandpack for React]
[Agent adds external library support]
[Checkpoint created]

Step 10-12: Testing
[Agent writes unit tests]
[Agent uses browser tool for visual testing]
[Agent runs full test suite]
[All tests passing ✅]

Step 13-15: Documentation
[Agent generates API docs]
[Agent creates usage examples]
[Agent updates README]

PHASE 3: VERIFICATION
[Agent runs full integration test]
[Agent tests in browser tool]
[Agent verifies Material Zones compliance]
[Agent checks accessibility]

✅ Complete! Artifact system ready for production.

Summary:
- 12 files created
- 847 lines of code
- 134 tests (all passing)
- Full documentation
- Accessible (WCAG 2.1 AA)
- Material Zones compliant
- Time: 8 minutes
```

### Workflow 4: Debugging with Agent

```
User: "Component has an error when copying text"

Agent:
1. ✅ Read error message from terminal
2. ✅ Open TextChunk.tsx
3. ✅ Identify issue: missing clipboard permission
4. ✅ Fix: Add try-catch with user feedback
5. ✅ Test fix in browser tool
6. ✅ Verify error resolved
7. ✅ Commit fix

Before:
const handleCopy = () => {
  navigator.clipboard.writeText(content);
};

After:
const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(content);
    dispatchEvent('chunk-copied', { type: 'text', content });
  } catch (err) {
    console.error('Copy failed:', err);
    dispatchEvent('error-shown', { 
      message: 'Copy failed. Please check clipboard permissions.' 
    });
  }
};

✅ Fixed! Error handling added.
```

---

## Advanced Tips

### Tip 1: Use @Recommended Symbol

```
In Agent mode, Cursor automatically suggests relevant context.

User: "Create text chunk"
Agent: [Shows @Recommended]
  - docs/ui/CHUNK_IMPLEMENTATIONS.md
  - src/components/chunks/index.ts
  - src/styles/material-zones.css

Click to add to context automatically.
```

### Tip 2: Context Pills

```
Composer shows active context as "pills" at top.

To remove context:
Click X on pill

To add context:
# for files
@ for symbols, docs, web

Keeps context focused and relevant.
```

### Tip 3: Model Switching

```
Switch models mid-conversation:

Planning: gpt-4-turbo (great at architecture)
Coding: claude-sonnet-4 (excellent at implementation)
Speed: Composer 1 (4x faster)

Click model selector in Composer to switch.
```

### Tip 4: Voice Mode

```
Cursor 2.0 includes voice input!

Press voice button in Composer
Speak your instructions
Agent transcribes and executes

Great for:
- Hands-free coding
- Quick edits while away from keyboard
- Accessibility
```

### Tip 5: Team Rules Distribution

```
Cursor Enterprise allows distributing rules to team.

Admin dashboard → Team Rules → Create
- Upload .cursor/rules/*.md files
- Auto-apply to all team members
- Ensure consistency across team
```

---

## Conclusion

Cursor 2.0 + Material Zones is a powerful combination:

✅ **Agent Mode**: Autonomous UI generation  
✅ **Rules System**: Enforces Material Zones patterns  
✅ **Parallel Agents**: 4-8x faster implementation  
✅ **Browser Tool**: Visual testing built-in  
✅ **Custom Docs**: Searchable Material Zones knowledge  
✅ **Notepads**: Quick access to common patterns  

**Result:** Precise, production-ready UI/UX that follows Material Zones Design System exactly.

### Next Steps

1. ✅ Install Cursor 2.0
2. ✅ Copy Material Zones docs to `docs/ui/`
3. ✅ Create `.cursor/rules/index.md` with project rules
4. ✅ Index documentation for semantic search
5. ✅ Create notepads with common patterns
6. ✅ Enable Agent mode and start building!

---

## Resources

- **Cursor Documentation:** https://docs.cursor.com
- **Material Zones Docs:** `docs/ui/*.md`
- **Cursor Forums:** https://forum.cursor.com
- **This Guide:** `/tmp/cursor-2.0-material-zones-integration.md`

---

**Version:** 1.0.0  
**Last Updated:** December 2024  
**Author:** Prometheus AI Platform Team  
**License:** MIT
