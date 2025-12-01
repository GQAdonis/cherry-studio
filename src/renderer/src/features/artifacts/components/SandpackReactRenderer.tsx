/**
 * Sandpack React Renderer Component
 *
 * Renders React artifacts using CodeSandbox's Sandpack for:
 * - NPM dependency support
 * - Hot Module Reloading
 * - Professional error overlay
 * - Multi-file support
 * - TypeScript support
 * - Web API access (localStorage, IndexedDB, fetch)
 */

import {
  SandpackCodeEditor,
  SandpackConsole,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider
} from '@codesandbox/sandpack-react'
import { atomDark, githubLight } from '@codesandbox/sandpack-themes'
import { useTheme } from '@renderer/context/ThemeProvider'
import { useAppSelector } from '@renderer/store'
import { selectArtifactReactSettings } from '@renderer/store/settings'
import type { FC } from 'react'
import { memo, useMemo } from 'react'
import styled from 'styled-components'

import type { Artifact } from '../types'

interface SandpackReactRendererProps {
  /** The artifact to render */
  artifact: Artifact
  /** Whether to show the code editor (overrides settings) */
  showEditor?: boolean
  /** Whether to show the preview pane (defaults to true) */
  showPreview?: boolean
  /** Whether to show the console (overrides settings) */
  showConsole?: boolean
  /** Custom width */
  width?: number | string
  /** Custom height */
  height?: number | string
  /** Custom class name */
  className?: string
}

/**
 * Parse artifact content to extract dependencies and files
 */
function parseArtifactContent(
  content: string,
  metadata: Artifact['metadata'],
  configuredDependencies: Record<string, string>
) {
  const files: Record<string, string> = {}
  const dependencies: Record<string, string> = { ...configuredDependencies }

  // Check if content has imports to determine if it's a module
  const hasImports = /^import\s+/m.test(content)
  const hasExports = /^export\s+/m.test(content)
  const hasAppComponent = /function\s+App\s*\(/.test(content) || /const\s+App\s*=/.test(content)

  // Remove or transform path alias imports (like @/components/ui/button)
  // These are local project imports that won't work in Sandpack
  let processedContent = content.replace(
    /import\s+(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+['"]@\/[^'"]*['"]\s*;?\n?/g,
    '// Path alias import removed for Sandpack preview\n'
  )

  // Also handle relative imports that might not exist
  processedContent = processedContent.replace(
    /import\s+(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+['"]\.\.?\/[^'"]*['"]\s*;?\n?/g,
    '// Relative import removed for Sandpack preview\n'
  )

  // Extract npm imports and add to dependencies
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"./][^'"]*)['"]/g
  let match
  while ((match = importRegex.exec(processedContent)) !== null) {
    const packageName = match[1]
    // Skip react and react-dom as they're included by default
    if (
      packageName &&
      !packageName.startsWith('react') &&
      !packageName.startsWith('.') &&
      !packageName.startsWith('@/')
    ) {
      // Extract base package name (handle scoped packages)
      const baseName = packageName.startsWith('@')
        ? packageName.split('/').slice(0, 2).join('/')
        : packageName.split('/')[0]
      // Only add if not already in configured dependencies
      if (!dependencies[baseName]) {
        dependencies[baseName] = 'latest'
      }
    }
  }

  // Add dependencies from metadata (override configured ones)
  if (metadata.dependencies) {
    for (const dep of metadata.dependencies) {
      const [name, version] = dep.split('@').filter(Boolean)
      if (name) {
        dependencies[dep.startsWith('@') ? `@${name}` : name] = version || 'latest'
      }
    }
  }

  // Prepare the main App file content
  let appContent = processedContent

  // If content doesn't have App component, wrap it
  if (!hasAppComponent && !hasImports && !hasExports) {
    appContent = `export default function App() {
  return (
    ${processedContent}
  );
}`
  } else if (hasAppComponent && !hasExports) {
    // Add export if App exists but isn't exported
    appContent = processedContent.replace(/(function\s+App\s*\(|const\s+App\s*=)/, 'export default $1')
  }

  // Determine file extension based on content
  const hasTypeScript =
    /:\s*(string|number|boolean|any|void|never|unknown|object)\b/.test(processedContent) ||
    /<\w+>/.test(processedContent) // Generic types
  const extension = hasTypeScript ? 'tsx' : 'jsx'

  files[`/App.${extension}`] = appContent

  // Add custom styles if provided
  if (metadata.customStyles) {
    files['/styles.css'] = metadata.customStyles
    // Add import to App file if not already importing styles
    if (!appContent.includes("import './styles.css'") && !appContent.includes('import "./styles.css"')) {
      files[`/App.${extension}`] = `import './styles.css';\n\n${appContent}`
    }
  }

  return { files, dependencies, extension }
}

/**
 * Sandpack React Renderer Component
 */
const SandpackReactRenderer: FC<SandpackReactRendererProps> = ({
  artifact,
  showEditor: showEditorProp,
  showPreview: showPreviewProp = true,
  showConsole: showConsoleProp,
  width = '100%',
  height = '100%',
  className
}) => {
  const { theme } = useTheme()
  const reactSettings = useAppSelector(selectArtifactReactSettings)

  // Use props if provided, otherwise fall back to settings
  const showEditor = showEditorProp ?? reactSettings?.showEditor ?? false
  const showPreview = showPreviewProp
  const showConsole = showConsoleProp ?? reactSettings?.showConsole ?? false
  const customBundlerUrl = reactSettings?.customBundlerUrl || ''

  // Memoize configured dependencies to prevent unnecessary re-renders
  const configuredDependencies = useMemo(() => reactSettings?.dependencies || {}, [reactSettings?.dependencies])

  // Parse artifact content with configured dependencies
  const { files, dependencies } = useMemo(
    () => parseArtifactContent(artifact.content, artifact.metadata, configuredDependencies),
    [artifact.content, artifact.metadata, configuredDependencies]
  )

  // Determine Sandpack theme based on app theme
  const sandpackTheme = useMemo(() => {
    const effectiveTheme = artifact.metadata.theme === 'auto' ? theme : artifact.metadata.theme
    return effectiveTheme === 'dark' ? atomDark : githubLight
  }, [theme, artifact.metadata.theme])

  // Build custom setup with Tailwind if enabled
  const customSetup = useMemo(() => {
    const setup: {
      dependencies: Record<string, string>
      entry?: string
    } = {
      dependencies: {
        ...dependencies
      }
    }

    // Add Tailwind CSS if enabled
    if (artifact.metadata.tailwind) {
      setup.dependencies['tailwindcss'] = 'latest'
    }

    return setup
  }, [dependencies, artifact.metadata.tailwind])

  // Sandpack options with relaxed permissions for web access
  const options = useMemo(
    () => ({
      showNavigator: false,
      showTabs: Object.keys(files).length > 1,
      showLineNumbers: true,
      showInlineErrors: true,
      wrapContent: true,
      editorHeight: typeof height === 'number' ? height : undefined,
      recompileMode: 'delayed' as const,
      recompileDelay: 500,
      autorun: true,
      autoReload: true,
      // Custom bundler URL if configured
      bundlerURL: customBundlerUrl || undefined
    }),
    [files, height, customBundlerUrl]
  )

  return (
    <Container className={className} style={{ width, height }}>
      <SandpackProvider
        template="react"
        theme={sandpackTheme}
        files={files}
        customSetup={customSetup}
        options={{
          ...options,
          externalResources: artifact.metadata.tailwind ? ['https://cdn.tailwindcss.com'] : undefined
        }}>
        <StyledSandpackLayout>
          {showEditor && (
            <EditorPane $fullWidth={!showPreview}>
              <SandpackCodeEditor showTabs showLineNumbers showInlineErrors wrapContent closableTabs={false} />
            </EditorPane>
          )}
          {showPreview && (
            <PreviewPane $fullWidth={!showEditor}>
              <SandpackPreview showNavigator={false} showRefreshButton showOpenInCodeSandbox={false} />
            </PreviewPane>
          )}
          {showConsole && (
            <ConsolePane>
              <SandpackConsole />
            </ConsolePane>
          )}
        </StyledSandpackLayout>
      </SandpackProvider>
    </Container>
  )
}

// Styled components
const Container = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 8px;
  background: var(--color-background);
  border: 1px solid var(--color-border);

  /* Override Sandpack's default styles */
  .sp-wrapper {
    height: 100%;
  }

  .sp-layout {
    height: 100%;
    border: none;
    border-radius: 0;
  }

  .sp-stack {
    height: 100%;
  }

  .sp-editor {
    height: 100%;
  }

  .sp-code-editor {
    height: 100%;
    overflow: auto;
  }

  .sp-preview-container {
    height: 100%;
  }

  .sp-preview-iframe {
    height: 100%;
  }

  .sp-preview {
    height: 100%;
    overflow: auto;
  }
`

const StyledSandpackLayout = styled(SandpackLayout)`
  height: 100%;
  display: flex;
  flex-direction: row;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`

const EditorPane = styled.div<{ $fullWidth?: boolean }>`
  flex: 1;
  min-width: ${(props) => (props.$fullWidth ? '100%' : '0')};
  max-width: ${(props) => (props.$fullWidth ? '100%' : '50%')};
  height: 100%;
  overflow: auto;
  display: flex;
  flex-direction: column;

  .sp-code-editor {
    flex: 1;
    overflow: auto;
  }

  @media (max-width: 768px) {
    max-width: 100%;
    height: ${(props) => (props.$fullWidth ? '100%' : '50%')};
  }
`

const PreviewPane = styled.div<{ $fullWidth?: boolean }>`
  flex: 1;
  min-width: ${(props) => (props.$fullWidth ? '100%' : '0')};
  height: 100%;
  overflow: auto;
  display: flex;
  flex-direction: column;

  .sp-preview-container,
  .sp-preview {
    flex: 1;
    overflow: auto;
  }
`

const ConsolePane = styled.div`
  width: 100%;
  max-height: 200px;
  border-top: 1px solid var(--color-border);
  overflow: auto;
  flex-shrink: 0;
`

export default memo(SandpackReactRenderer)
