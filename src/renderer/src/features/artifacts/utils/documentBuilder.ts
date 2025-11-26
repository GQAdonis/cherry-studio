/**
 * Document Builder
 *
 * Builds complete HTML documents for rendering artifacts in sandboxed iframes.
 * Supports various artifact types: HTML, HTMX, React, SVG, Mermaid, Markdown, Code
 */

import type { Artifact, ArtifactMetadata, ArtifactStatus, ArtifactType, RenderOptions } from '../types'

/**
 * CDN URLs for external dependencies
 */
const CDN_URLS = {
  // Tailwind CSS
  tailwind: 'https://cdn.tailwindcss.com',

  // HTMX
  htmx: 'https://unpkg.com/htmx.org@2.0.4',

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
 */
function getThemeVariables(theme: 'light' | 'dark'): string {
  if (theme === 'dark') {
    return `
      :root {
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
        background-color: var(--color-background);
        color: var(--color-text);
      }
    `
  }

  return `
    :root {
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
      background-color: var(--color-background);
      color: var(--color-text);
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

/**
 * Communication bridge script for iframe-parent messaging
 */
function getBridgeScript(artifactId: string, htmxServerPort?: number): string {
  return `
    (function() {
      window.artifactBridge = {
        artifactId: '${artifactId}',
        htmxServerPort: ${htmxServerPort || 'null'},

        send: function(type, payload) {
          window.parent.postMessage({
            type: type,
            artifactId: this.artifactId,
            payload: payload || {},
            timestamp: Date.now()
          }, '*');
        },

        ready: function() {
          this.send('ready');
        },

        error: function(error) {
          this.send('error', {
            message: error.message || String(error),
            stack: error.stack
          });
        },

        resize: function() {
          this.send('resize', {
            width: document.body.scrollWidth,
            height: document.body.scrollHeight
          });
        },

        log: function(level, ...args) {
          this.send('console', {
            level: level,
            args: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a))
          });
        }
      };

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

      // Setup resize observer
      var resizeObserver = new ResizeObserver(function() {
        window.artifactBridge.resize();
      });
      document.addEventListener('DOMContentLoaded', function() {
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
  const theme = options.theme === 'auto' ? 'light' : options.theme
  const scripts: string[] = []
  const headContent: string[] = []

  // Add Tailwind if enabled
  if (metadata.tailwind) {
    scripts.push(`<script src="${CDN_URLS.tailwind}"></script>`)
  }

  // Add HTMX if needed
  if (isHtmx && options.htmxServerPort) {
    scripts.push(`<script src="${CDN_URLS.htmx}"></script>`)
    scripts.push(`<script>${getHtmxConfigScript(options.htmxServerPort, artifactId)}</script>`)
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
  <style>${getThemeVariables(theme)}${getBaseStyles()}</style>
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
 */
function buildReactDocument(
  content: string,
  metadata: ArtifactMetadata,
  options: RenderOptions,
  artifactId: string
): string {
  const theme = options.theme === 'auto' ? 'light' : options.theme

  // Check if content includes imports or is a component definition
  const isModule = content.includes('import ') || content.includes('export ')
  const componentCode = isModule ? content : `function App() {\n  return (\n${content}\n  );\n}`

  return `<!DOCTYPE html>
<html lang="en" class="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${getThemeVariables(theme)}${getBaseStyles()}</style>
  ${metadata.tailwind ? `<script src="${CDN_URLS.tailwind}"></script>` : ''}
  ${metadata.customStyles ? `<style>${metadata.customStyles}</style>` : ''}
  <script src="${CDN_URLS.react}"></script>
  <script src="${CDN_URLS.reactDom}"></script>
  <script src="${CDN_URLS.babel}"></script>
  <script>${getBridgeScript(artifactId)}</script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-presets="react">
    ${componentCode}

    // Render the app
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>`
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
  const theme = options.theme === 'auto' ? 'light' : options.theme

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
    ${getThemeVariables(theme)}
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
  const theme = options.theme === 'auto' ? 'light' : options.theme
  const mermaidTheme = theme === 'dark' ? 'dark' : 'default'

  return `<!DOCTYPE html>
<html lang="en" class="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${getThemeVariables(theme)}
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
  <pre class="mermaid">
${content}
  </pre>
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
  const theme = options.theme === 'auto' ? 'light' : options.theme

  // Escape content for JavaScript string
  const escapedContent = content.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')

  return `<!DOCTYPE html>
<html lang="en" class="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${getThemeVariables(theme)}
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
  <link rel="stylesheet" href="${theme === 'dark' ? CDN_URLS.highlightCssDark : CDN_URLS.highlightCss}">
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
  const theme = options.theme === 'auto' ? 'light' : options.theme
  const language = metadata.language || 'plaintext'

  // Escape content for HTML
  const escapedContent = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  return `<!DOCTYPE html>
<html lang="en" class="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${getThemeVariables(theme)}
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
  <link rel="stylesheet" href="${theme === 'dark' ? CDN_URLS.highlightCssDark : CDN_URLS.highlightCss}">
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
      return buildHtmlDocument(content, metadata, options, id, false)
    case 'htmx':
      return buildHtmlDocument(content, metadata, options, id, true)
    case 'react':
      return buildReactDocument(content, metadata, options, id)
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
    status: 'complete' as ArtifactStatus
  }

  return buildDocument(artifact, {
    theme,
    interactive: false
  })
}

export default buildDocument
