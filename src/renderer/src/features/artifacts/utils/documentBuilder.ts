/**
 * Document Builder
 *
 * Builds complete HTML documents for rendering artifacts in sandboxed iframes.
 * Supports various artifact types: HTML, HTMX, React, SVG, Mermaid, Markdown, Code
 */

import { type Artifact, type ArtifactMetadata, ArtifactStatus, type ArtifactType, type RenderOptions } from '../types'
import { buildReactBrowserDocument } from './reactBrowserTemplate'

/**
 * CDN URLs for external dependencies
 */
const CDN_URLS = {
  // Tailwind CSS
  tailwind: 'https://cdn.tailwindcss.com',

  // HTMX
  htmx: 'https://unpkg.com/htmx.org@2.0.4',

  // Alpine.js - Lightweight reactive framework, great companion for HTMX
  alpinejs: 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js',

  // React + ReactDOM + Babel
  react: 'https://unpkg.com/react@19/umd/react.development.js',
  reactDom: 'https://unpkg.com/react-dom@19/umd/react-dom.development.js',
  babel: 'https://unpkg.com/@babel/standalone/babel.min.js',

  // Mermaid
  mermaid: 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs',

  // Marked (Markdown)
  marked: 'https://cdn.jsdelivr.net/npm/marked/marked.min.js',

  // Highlight.js
  highlightJs: 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.10.0/build/highlight.min.js',
  highlightCss: 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.10.0/build/styles/github.min.css',
  highlightCssDark: 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.10.0/build/styles/github-dark.min.css'
}

/**
 * Generate CSS variables for theme
 * Includes both v1.0 (--color-*) and v2.0 (--bg-*, --text-*, --accent) variables
 */
function getThemeVariables(theme: 'light' | 'dark'): string {
  if (theme === 'dark') {
    return `
      :root {
        /* v2.0 CSS Variables */
        --bg-primary: #1a1a2e;
        --bg-secondary: #16213e;
        --text-primary: #eaeaea;
        --text-secondary: #a0a0a0;
        --accent: #4f8cff;

        /* v1.0 CSS Variables (legacy support) */
        --color-background: #1a1a1a;
        --color-background-soft: #242424;
        --color-background-mute: #2e2e2e;
        --color-text: #ffffff;
        --color-text-soft: #a8a8a8;
        --color-text-muted: #6e6e6e;
        --color-border: #3e3e3e;
        --color-border-soft: #2e2e2e;
        --color-primary: #3b82f6;
        --color-primary-soft: #1d4ed8;
        --color-error: #ef4444;
        --color-success: #22c55e;
        --color-warning: #eab308;
      }
      body {
        background-color: var(--bg-primary);
        color: var(--text-primary);
      }
    `
  }

  return `
    :root {
      /* v2.0 CSS Variables */
      --bg-primary: #ffffff;
      --bg-secondary: #f5f5f5;
      --text-primary: #1a1a1a;
      --text-secondary: #666666;
      --accent: #2563eb;

      /* v1.0 CSS Variables (legacy support) */
      --color-background: #ffffff;
      --color-background-soft: #f8f8f8;
      --color-background-mute: #f0f0f0;
      --color-text: #1a1a1a;
      --color-text-soft: #6e6e6e;
      --color-text-muted: #a8a8a8;
      --color-border: #e0e0e0;
      --color-border-soft: #f0f0f0;
      --color-primary: #3b82f6;
      --color-primary-soft: #60a5fa;
      --color-error: #ef4444;
      --color-success: #22c55e;
      --color-warning: #eab308;
    }
    body {
      background-color: var(--bg-primary);
      color: var(--text-primary);
    }
  `
}

/**
 * Default Tailwind-like styles for artifacts without explicit styling
 * These provide sensible defaults for light/dark mode
 */
function getDefaultTailwindStyles(theme: 'light' | 'dark'): string {
  const isDark = theme === 'dark'

  return `
    /* Default component styles when artifact has no explicit Tailwind classes */

    /* Body defaults */
    body:not(:has([class*="bg-"])):not(:has([class*="min-h-"])) {
      min-height: 100vh;
    }

    /* Default button styles */
    button:not([class*="bg-"]):not([class*="btn"]) {
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      background: ${isDark ? '#3b82f6' : '#2563eb'};
      color: white;
      border: none;
    }
    button:not([class*="bg-"]):not([class*="btn"]):hover {
      background: ${isDark ? '#2563eb' : '#1d4ed8'};
    }
    button:not([class*="bg-"]):not([class*="btn"]):disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Default input styles */
    input:not([class*="border"]):not([class*="bg-"]),
    textarea:not([class*="border"]):not([class*="bg-"]),
    select:not([class*="border"]):not([class*="bg-"]) {
      padding: 8px 12px;
      border: 1px solid ${isDark ? '#374151' : '#d1d5db'};
      border-radius: 6px;
      background: ${isDark ? '#1f2937' : '#ffffff'};
      color: ${isDark ? '#f3f4f6' : '#111827'};
      font-size: 14px;
    }
    input:not([class*="border"]):not([class*="bg-"]):focus,
    textarea:not([class*="border"]):not([class*="bg-"]):focus,
    select:not([class*="border"]):not([class*="bg-"]):focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px ${isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'};
    }

    /* Default card styles */
    .card:not([class*="bg-"]),
    [class*="card"]:not([class*="bg-"]) {
      background: ${isDark ? '#1f2937' : '#ffffff'};
      border: 1px solid ${isDark ? '#374151' : '#e5e7eb'};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${isDark ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'};
    }

    /* Default heading styles */
    h1:not([class*="text-"]) {
      font-size: 2rem;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 1rem;
      color: ${isDark ? '#f9fafb' : '#111827'};
    }
    h2:not([class*="text-"]) {
      font-size: 1.5rem;
      font-weight: 600;
      line-height: 1.3;
      margin-bottom: 0.75rem;
      color: ${isDark ? '#f3f4f6' : '#1f2937'};
    }
    h3:not([class*="text-"]) {
      font-size: 1.25rem;
      font-weight: 600;
      line-height: 1.4;
      margin-bottom: 0.5rem;
      color: ${isDark ? '#e5e7eb' : '#374151'};
    }

    /* Default paragraph/text */
    p:not([class*="text-"]) {
      color: ${isDark ? '#d1d5db' : '#4b5563'};
      line-height: 1.6;
    }

    /* Default list styles */
    ul:not([class*="list-"]),
    ol:not([class*="list-"]) {
      padding-left: 1.5rem;
      color: ${isDark ? '#d1d5db' : '#4b5563'};
    }

    /* Default link styles */
    a:not([class*="text-"]):not([class*="no-underline"]) {
      color: #3b82f6;
      text-decoration: none;
    }
    a:not([class*="text-"]):not([class*="no-underline"]):hover {
      text-decoration: underline;
    }

    /* Default table styles */
    table:not([class*="border"]) {
      width: 100%;
      border-collapse: collapse;
    }
    table:not([class*="border"]) th,
    table:not([class*="border"]) td {
      padding: 12px;
      border: 1px solid ${isDark ? '#374151' : '#e5e7eb'};
      text-align: left;
    }
    table:not([class*="border"]) th {
      background: ${isDark ? '#1f2937' : '#f9fafb'};
      font-weight: 600;
    }
    table:not([class*="border"]) tr:nth-child(even) {
      background: ${isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'};
    }
  `
}

/**
 * Base styles for all artifacts
 */
function getBaseStyles(): string {
  return `
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    img, video {
      max-width: 100%;
      height: auto;
    }
    a {
      color: var(--color-primary);
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    pre {
      background: var(--color-background-soft);
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
    }
    code {
      font-family: 'SF Mono', 'Fira Code', 'Monaco', 'Menlo', monospace;
      font-size: 13px;
    }
    .error {
      background: #fee2e2;
      color: #dc2626;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid #fecaca;
    }
    .htmx-indicator {
      display: none;
    }
    .htmx-request .htmx-indicator {
      display: inline;
    }
    .htmx-request.htmx-indicator {
      display: inline;
    }
  `
}

function buildA2uiDocument(
  content: string,
  metadata: ArtifactMetadata,
  options: RenderOptions,
  artifactId: string
): string {
  const cssTheme = options.theme === 'auto' ? 'light' : options.theme
  const escapedSchema = JSON.stringify(content)

  return `<!DOCTYPE html>
<html lang="en" class="${cssTheme === 'dark' ? 'dark' : ''}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>A2UI Artifact Preview</title>
  ${metadata.tailwind ? `<script src="${CDN_URLS.tailwind}"></script>` : ''}
  <style>
    ${getThemeVariables(cssTheme)}
    ${getBaseStyles()}
    .a2ui-root { display: flex; flex-direction: column; gap: 16px; min-height: 100%; }
    .a2ui-card { border: 1px solid var(--color-border); border-radius: 16px; padding: 16px; background: var(--color-background-soft); }
    .a2ui-stack { display: flex; flex-direction: column; }
    .a2ui-grid { display: grid; gap: 16px; }
    .a2ui-heading { margin: 0; }
    .a2ui-text { color: var(--color-text-soft); }
    .a2ui-button { display: inline-flex; align-items: center; justify-content: center; padding: 10px 16px; border-radius: 10px; border: none; cursor: pointer; font-weight: 600; }
    .a2ui-button-primary { background: var(--color-primary); color: white; }
    .a2ui-button-secondary { background: var(--color-background-mute); color: var(--color-text); border: 1px solid var(--color-border); }
    .a2ui-input { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--color-border); background: var(--color-background); color: var(--color-text); }
    .a2ui-badge { display: inline-flex; padding: 4px 10px; border-radius: 999px; background: var(--color-background-mute); color: var(--color-text-soft); font-size: 12px; font-weight: 600; }
    .a2ui-divider { border-top: 1px solid var(--color-border); margin: 4px 0; }
    .a2ui-list { display: flex; flex-direction: column; gap: 8px; padding-left: 20px; }
    .a2ui-empty { color: var(--color-text-soft); font-style: italic; }
  </style>
  <script>${getBridgeScript(artifactId)}</script>
</head>
<body>
  <div id="root" class="a2ui-root"></div>
  <script>
    const rawSchema = ${escapedSchema};

    function safeParseSchema(value) {
      try {
        return JSON.parse(value);
      } catch (error) {
        return {
          version: 1,
          type: 'page',
          title: 'Invalid A2UI artifact',
          children: [
            {
              id: 'error',
              type: 'text',
              props: { text: 'The A2UI schema could not be parsed. Check the JSON structure.' }
            }
          ]
        };
      }
    }

    function appendChildren(node, element) {
      const children = Array.isArray(node?.children) ? node.children : [];
      children.forEach((child) => element.appendChild(renderNode(child)));
      return element;
    }

    function renderNode(node) {
      const type = node?.type || 'text';
      const props = node?.props || {};
      switch (type) {
        case 'page':
          return appendChildren(node, document.createElement('section'));
        case 'stack': {
          const el = document.createElement('div');
          el.className = 'a2ui-stack';
          el.style.gap = typeof props.gap === 'number' ? props.gap * 4 + 'px' : '16px';
          return appendChildren(node, el);
        }
        case 'grid': {
          const el = document.createElement('div');
          el.className = 'a2ui-grid';
          const columns = typeof props.columns === 'number' ? props.columns : 2;
          el.style.gridTemplateColumns = 'repeat(' + columns + ', minmax(0, 1fr))';
          return appendChildren(node, el);
        }
        case 'card':
          return appendChildren(node, Object.assign(document.createElement('div'), { className: 'a2ui-card' }));
        case 'heading': {
          const level = Math.min(6, Math.max(1, Number(props.level || 2)));
          const el = document.createElement('h' + level);
          el.className = 'a2ui-heading';
          el.textContent = props.text || node.title || 'Heading';
          return el;
        }
        case 'text': {
          const el = document.createElement('p');
          el.className = 'a2ui-text';
          el.textContent = props.text || '';
          return el;
        }
        case 'button': {
          const el = document.createElement('button');
          el.className = 'a2ui-button ' + (props.variant === 'secondary' ? 'a2ui-button-secondary' : 'a2ui-button-primary');
          el.textContent = props.label || 'Button';
          return el;
        }
        case 'input': {
          const el = document.createElement('input');
          el.className = 'a2ui-input';
          el.placeholder = props.placeholder || '';
          el.value = props.value || '';
          return el;
        }
        case 'badge': {
          const el = document.createElement('span');
          el.className = 'a2ui-badge';
          el.textContent = props.label || 'Badge';
          return el;
        }
        case 'divider':
          return Object.assign(document.createElement('div'), { className: 'a2ui-divider' });
        case 'list': {
          const listType = props.ordered ? 'ol' : 'ul';
          const el = document.createElement(listType);
          el.className = 'a2ui-list';
          const items = Array.isArray(props.items) ? props.items : [];
          items.forEach((item) => {
            const li = document.createElement('li');
            li.textContent = typeof item === 'string' ? item : item?.label || JSON.stringify(item);
            el.appendChild(li);
          });
          if (!items.length) {
            const li = document.createElement('li');
            li.textContent = 'List item';
            el.appendChild(li);
          }
          return el;
        }
        default: {
          const fallback = document.createElement('div');
          fallback.className = 'a2ui-empty';
          fallback.textContent = 'Unsupported A2UI node type: ' + type;
          return fallback;
        }
      }
    }

    const schema = safeParseSchema(rawSchema);
    const root = document.getElementById('root');
    if (schema?.title) {
      const title = document.createElement('h1');
      title.className = 'a2ui-heading';
      title.textContent = schema.title;
      root.appendChild(title);
    }
    root.appendChild(renderNode(schema));
    window.artifactBridge.send('ready');
  </script>
</body>
</html>`
}

/**
 * Communication bridge script for iframe-parent messaging
 * Implements v2.0 API: emit, onMessage, setState, getState
 */
function getBridgeScript(artifactId: string, htmxServerPort?: number): string {
  return `
    (function() {
      window.artifactBridge = {
        artifactId: '${artifactId}',
        htmxServerPort: ${htmxServerPort || 'null'},
        _state: {},
        _messageCallbacks: [],

        // v1.0 API: send (internal use)
        send: function(type, payload) {
          window.parent.postMessage({
            type: type,
            artifactId: this.artifactId,
            payload: payload || {},
            timestamp: Date.now()
          }, '*');
        },

        // v2.0 API: emit - Emit custom events to parent
        emit: function(event, data) {
          window.parent.postMessage({
            type: event,
            data: data,
            artifactId: this.artifactId,
            timestamp: Date.now()
          }, '*');
        },

        // v2.0 API: onMessage - Listen for commands from parent
        onMessage: function(callback) {
          this._messageCallbacks.push(callback);
        },

        // v2.0 API: setState - State management (persisted)
        setState: function(state) {
          this._state = { ...this._state, ...state };
          this.emit('state-change', this._state);
        },

        // v2.0 API: getState - Retrieve current state
        getState: function() {
          return this._state || {};
        },

        // v1.0 API: ready
        ready: function() {
          this.send('ready');
          this.emit('ready', { artifactId: this.artifactId });
        },

        // v1.0 API: error
        error: function(error) {
          var errorData = {
            message: error.message || String(error),
            stack: error.stack
          };
          this.send('error', errorData);
          this.emit('error', errorData);
        },

        // v1.0 API: resize
        resize: function() {
          this.send('resize', {
            width: document.body.scrollWidth,
            height: document.body.scrollHeight
          });
        },

        // v1.0 API: log
        log: function(level, ...args) {
          this.send('console', {
            level: level,
            args: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a))
          });
        }
      };

      // Listen for messages from parent and dispatch to callbacks
      window.addEventListener('message', function(event) {
        window.artifactBridge._messageCallbacks.forEach(function(callback) {
          try {
            callback(event.data);
          } catch (e) {
            console.error('Message callback error:', e);
          }
        });
      });

      // Capture console methods
      ['log', 'warn', 'error', 'info'].forEach(function(method) {
        var original = console[method];
        console[method] = function() {
          window.artifactBridge.log(method, ...arguments);
          original.apply(console, arguments);
        };
      });

      // Capture global errors
      window.onerror = function(message, source, lineno, colno, error) {
        window.artifactBridge.error({
          message: message,
          source: source,
          line: lineno,
          column: colno,
          stack: error ? error.stack : null
        });
      };

      // Capture unhandled promise rejections
      window.onunhandledrejection = function(event) {
        window.artifactBridge.error({
          message: 'Unhandled Promise Rejection: ' + (event.reason?.message || event.reason),
          stack: event.reason?.stack
        });
      };

      // Setup dark mode detection for Tailwind's dark: variants
      function setupDarkMode() {
        var htmlEl = document.documentElement;
        var currentClass = htmlEl.className;

        // If theme is 'auto' or not set, detect system preference
        if (!currentClass || currentClass === 'auto') {
          if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            htmlEl.classList.add('dark');
            htmlEl.classList.remove('light', 'auto');
          } else {
            htmlEl.classList.add('light');
            htmlEl.classList.remove('dark', 'auto');
          }
        }

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
          if (e.matches) {
            htmlEl.classList.add('dark');
            htmlEl.classList.remove('light');
          } else {
            htmlEl.classList.add('light');
            htmlEl.classList.remove('dark');
          }
        });
      }

      // Setup resize observer
      var resizeObserver = new ResizeObserver(function() {
        window.artifactBridge.resize();
      });
      document.addEventListener('DOMContentLoaded', function() {
        setupDarkMode();
        resizeObserver.observe(document.body);
        window.artifactBridge.ready();
      });
    })();
  `
}

/**
 * HTMX configuration script
 */
function getHtmxConfigScript(serverPort: number, artifactId: string): string {
  return `
    document.addEventListener('DOMContentLoaded', function() {
      // Configure HTMX to use local server
      htmx.config.defaultSettleDelay = 0;
      htmx.config.defaultSwapDelay = 0;

      // Add artifact ID header to all requests
      document.body.addEventListener('htmx:configRequest', function(event) {
        event.detail.headers['X-Artifact-Id'] = '${artifactId}';
      });

      // Intercept HTMX requests and rewrite URLs to local server
      document.body.addEventListener('htmx:beforeRequest', function(event) {
        var path = event.detail.path;
        // Only intercept relative paths
        if (!path.startsWith('http://') && !path.startsWith('https://')) {
          var newPath = 'http://127.0.0.1:${serverPort}' + (path.startsWith('/') ? '' : '/') + path;
          event.detail.path = newPath;
        }

        window.artifactBridge.send('htmx:request', {
          method: event.detail.verb,
          path: event.detail.path
        });
      });

      // Handle HTMX responses
      document.body.addEventListener('htmx:afterRequest', function(event) {
        window.artifactBridge.send('htmx:response', {
          status: event.detail.xhr?.status,
          path: event.detail.path
        });
      });

      // Handle HTMX errors
      document.body.addEventListener('htmx:responseError', function(event) {
        window.artifactBridge.send('htmx:error', {
          status: event.detail.xhr?.status,
          message: event.detail.xhr?.statusText,
          path: event.detail.path
        });
      });
    });
  `
}

/**
 * Build document for HTML/HTMX artifacts
 */
function buildHtmlDocument(
  content: string,
  metadata: ArtifactMetadata,
  options: RenderOptions,
  artifactId: string,
  isHtmx: boolean
): string {
  // Keep 'auto' for HTML class - script will detect system preference
  const theme = options.theme
  const cssTheme = options.theme === 'auto' ? 'light' : options.theme // CSS vars default to light
  const scripts: string[] = []
  const headContent: string[] = []

  // Add Tailwind if enabled
  if (metadata.tailwind) {
    scripts.push(`<script src="${CDN_URLS.tailwind}"></script>`)
  }

  // Add HTMX and Alpine.js if needed
  if (isHtmx) {
    // Alpine.js - lightweight reactive framework, great companion for HTMX
    // Must be loaded with defer attribute and before HTMX for proper initialization
    scripts.push(`<script defer src="${CDN_URLS.alpinejs}"></script>`)

    if (options.htmxServerPort) {
      scripts.push(`<script src="${CDN_URLS.htmx}"></script>`)
      scripts.push(`<script>${getHtmxConfigScript(options.htmxServerPort, artifactId)}</script>`)
    } else {
      // Still include HTMX even without server port for client-side only usage
      scripts.push(`<script src="${CDN_URLS.htmx}"></script>`)
    }
  }

  // Custom styles
  if (metadata.customStyles) {
    headContent.push(`<style>${metadata.customStyles}</style>`)
  }

  return `<!DOCTYPE html>
<html lang="en" class="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${getThemeVariables(cssTheme)}${getBaseStyles()}${getDefaultTailwindStyles(cssTheme)}</style>
  ${headContent.join('\n')}
  ${scripts.join('\n')}
  <script>${getBridgeScript(artifactId, options.htmxServerPort)}</script>
</head>
<body>
${content}
</body>
</html>`
}

/**
 * Build document for React artifacts
 * Uses the shared React browser template with full shadcn/ui support
 */
function buildReactDocument(
  content: string,
  _metadata: ArtifactMetadata,
  options: RenderOptions,
  _artifactId: string
): string {
  void _metadata
  void _artifactId
  const cssTheme = options.theme === 'auto' ? 'light' : options.theme
  return buildReactBrowserDocument(content, 'React Artifact', cssTheme)
}

/**
 * Build document for SVG artifacts
 */
function buildSvgDocument(
  content: string,
  metadata: ArtifactMetadata,
  options: RenderOptions,
  artifactId: string
): string {
  // Keep 'auto' for HTML class - script will detect system preference
  const theme = options.theme
  const cssTheme = options.theme === 'auto' ? 'light' : options.theme // CSS vars default to light

  // Ensure SVG has proper attributes for scaling
  let svgContent = content.trim()
  if (!svgContent.includes('width=') && !svgContent.includes('viewBox=')) {
    svgContent = svgContent.replace('<svg', '<svg width="100%" height="auto"')
  }

  return `<!DOCTYPE html>
<html lang="en" class="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${getThemeVariables(cssTheme)}
    ${getBaseStyles()}
    body {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
    }
    svg {
      max-width: 100%;
      height: auto;
    }
  </style>
  ${metadata.customStyles ? `<style>${metadata.customStyles}</style>` : ''}
  <script>${getBridgeScript(artifactId)}</script>
</head>
<body>
${svgContent}
</body>
</html>`
}

/**
 * Build document for Mermaid artifacts
 */
function buildMermaidDocument(
  content: string,
  metadata: ArtifactMetadata,
  options: RenderOptions,
  artifactId: string
): string {
  // Keep 'auto' for HTML class - script will detect system preference
  const theme = options.theme
  const cssTheme = options.theme === 'auto' ? 'light' : options.theme // CSS vars default to light
  const mermaidTheme = cssTheme === 'dark' ? 'dark' : 'default'

  return `<!DOCTYPE html>
<html lang="en" class="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${getThemeVariables(cssTheme)}
    ${getBaseStyles()}
    body {
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }
    .mermaid {
      max-width: 100%;
    }
  </style>
  ${metadata.customStyles ? `<style>${metadata.customStyles}</style>` : ''}
  <script>${getBridgeScript(artifactId)}</script>
</head>
<body>
  <div class="mermaid">
${content}
  </div>
  <script type="module">
    import mermaid from '${CDN_URLS.mermaid}';
    mermaid.initialize({
      startOnLoad: true,
      theme: '${mermaidTheme}',
      securityLevel: 'loose'
    });
  </script>
</body>
</html>`
}

/**
 * Build document for Markdown artifacts
 */
function buildMarkdownDocument(
  content: string,
  metadata: ArtifactMetadata,
  options: RenderOptions,
  artifactId: string
): string {
  // Keep 'auto' for HTML class - script will detect system preference
  const theme = options.theme
  const cssTheme = options.theme === 'auto' ? 'light' : options.theme // CSS vars default to light

  // Escape content for JavaScript string
  const escapedContent = content.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')

  return `<!DOCTYPE html>
<html lang="en" class="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${getThemeVariables(cssTheme)}
    ${getBaseStyles()}
    .markdown-body {
      max-width: 100%;
    }
    .markdown-body h1, .markdown-body h2, .markdown-body h3,
    .markdown-body h4, .markdown-body h5, .markdown-body h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
    }
    .markdown-body h1 { font-size: 2em; border-bottom: 1px solid var(--color-border); padding-bottom: 0.3em; }
    .markdown-body h2 { font-size: 1.5em; border-bottom: 1px solid var(--color-border); padding-bottom: 0.3em; }
    .markdown-body h3 { font-size: 1.25em; }
    .markdown-body ul, .markdown-body ol { padding-left: 2em; }
    .markdown-body blockquote {
      padding: 0 1em;
      border-left: 4px solid var(--color-border);
      color: var(--color-text-soft);
    }
    .markdown-body table {
      border-collapse: collapse;
      width: 100%;
    }
    .markdown-body th, .markdown-body td {
      border: 1px solid var(--color-border);
      padding: 8px 12px;
    }
    .markdown-body th {
      background: var(--color-background-soft);
    }
  </style>
  ${metadata.customStyles ? `<style>${metadata.customStyles}</style>` : ''}
  <link rel="stylesheet" href="${cssTheme === 'dark' ? CDN_URLS.highlightCssDark : CDN_URLS.highlightCss}">
  <script src="${CDN_URLS.marked}"></script>
  <script src="${CDN_URLS.highlightJs}"></script>
  <script>${getBridgeScript(artifactId)}</script>
</head>
<body>
  <div id="content" class="markdown-body"></div>
  <script>
    marked.setOptions({
      highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
      },
      breaks: true,
      gfm: true
    });
    document.getElementById('content').innerHTML = marked.parse(\`${escapedContent}\`);
  </script>
</body>
</html>`
}

/**
 * Build document for Code artifacts
 */
function buildCodeDocument(
  content: string,
  metadata: ArtifactMetadata,
  options: RenderOptions,
  artifactId: string
): string {
  // Keep 'auto' for HTML class - script will detect system preference
  const theme = options.theme
  const cssTheme = options.theme === 'auto' ? 'light' : options.theme // CSS vars default to light
  const language = metadata.language || 'plaintext'

  // Escape content for HTML
  const escapedContent = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  return `<!DOCTYPE html>
<html lang="en" class="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${getThemeVariables(cssTheme)}
    ${getBaseStyles()}
    pre {
      margin: 0;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
    }
    code {
      font-size: 14px;
    }
  </style>
  ${metadata.customStyles ? `<style>${metadata.customStyles}</style>` : ''}
  <link rel="stylesheet" href="${cssTheme === 'dark' ? CDN_URLS.highlightCssDark : CDN_URLS.highlightCss}">
  <script src="${CDN_URLS.highlightJs}"></script>
  <script>${getBridgeScript(artifactId)}</script>
</head>
<body>
  <pre><code class="language-${language}">${escapedContent}</code></pre>
  <script>
    hljs.highlightAll();
  </script>
</body>
</html>`
}

/**
 * Build a complete HTML document for an artifact
 */
export function buildDocument(artifact: Artifact, options: RenderOptions): string {
  const { type, content, metadata, id } = artifact

  switch (type) {
    case 'html':
    case 'xhtml':
      return buildHtmlDocument(content, metadata, options, id, false)
    case 'htmx':
      return buildHtmlDocument(content, metadata, options, id, true)
    case 'react':
      return buildReactDocument(content, metadata, options, id)
    case 'a2ui':
      return buildA2uiDocument(content, metadata, options, id)
    case 'svg':
      return buildSvgDocument(content, metadata, options, id)
    case 'mermaid':
      return buildMermaidDocument(content, metadata, options, id)
    case 'markdown':
      return buildMarkdownDocument(content, metadata, options, id)
    case 'code':
      return buildCodeDocument(content, metadata, options, id)
    default:
      // Default to HTML
      return buildHtmlDocument(content, metadata, options, id, false)
  }
}

/**
 * Build a preview document with minimal content
 */
export function buildPreviewDocument(content: string, type: ArtifactType, theme: 'light' | 'dark' = 'light'): string {
  const artifact: Artifact = {
    id: 'preview',
    identifier: 'preview',
    type,
    title: 'Preview',
    content,
    version: 1,
    conversationId: '',
    messageId: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    saved: false,
    tags: [],
    metadata: {
      tailwind: true,
      theme: theme
    },
    status: ArtifactStatus.COMPLETE
  }

  return buildDocument(artifact, {
    theme,
    interactive: false
  })
}

export default buildDocument
