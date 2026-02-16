import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import { CodeInspectorPlugin } from 'code-inspector-plugin'
import { defineConfig } from 'electron-vite'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// assert not supported by biome
// import pkg from './package.json' assert { type: 'json' }
import pkg from './package.json'

const visualizerPlugin = (type: 'renderer' | 'main') => {
  return process.env[`VISUALIZER_${type.toUpperCase()}`] ? [visualizer({ open: true })] : []
}

const isDev = process.env.NODE_ENV === 'development'
const isProd = process.env.NODE_ENV === 'production'

/**
 * Vite plugin that fixes `require('electron')` resolving to the npm package
 * (which exports the executable path string) instead of Electron's internal API.
 *
 * When the bundled output is in a subdirectory of the project root,
 * Node.js module resolution finds `node_modules/electron/index.js` before
 * Electron's `Module._resolveFilename` patch can intercept the call.
 * This plugin injects a shim at the top of the bundle that:
 * 1. Removes any cached npm `electron` entry from require.cache
 * 2. Patches `Module._resolveFilename` to bypass npm resolution for 'electron'
 */
function electronResolvePlugin() {
  const banner = `
;(function() {
  // Fix: ELECTRON_RUN_AS_NODE in the environment prevents Electron from loading
  // its internal module system, causing require("electron") to resolve to the
  // npm package (which returns the executable path string instead of the API).
  // Remove it so Electron can provide app, crashReporter, session, etc.
  if (process.env.ELECTRON_RUN_AS_NODE) {
    delete process.env.ELECTRON_RUN_AS_NODE;
  }
})();
`

  return {
    name: 'vite:electron-resolve-fix',
    apply: 'build' as const,
    enforce: 'post' as const,
    renderChunk(code: string, chunk: { isEntry: boolean }, options: { format?: string }) {
      if (chunk.isEntry && options.format === 'cjs') {
        return { code: banner + code, map: null }
      }
      return null
    }
  }
}

export default defineConfig({
  main: {
    plugins: [electronResolvePlugin(), ...visualizerPlugin('main')],
    resolve: {
      alias: {
        '@main': resolve('src/main'),
        '@types': resolve('src/renderer/src/types'),
        '@shared': resolve('packages/shared'),
        '@logger': resolve('src/main/services/LoggerService'),
        '@mcp-trace/trace-core': resolve('packages/mcp-trace/trace-core'),
        '@mcp-trace/trace-node': resolve('packages/mcp-trace/trace-node')
      }
    },
    build: {
      rollupOptions: {
        external: [
          'bufferutil',
          'utf-8-validate',
          'electron',
          // Explicitly externalize modules with dynamic require() issues
          'chalk',
          'dockerfile-ast',
          '@e2b/code-interpreter',
          'e2b',
          'unstructured-client',
          '@libsql/client', // Externalize to preserve native dependencies (tr46, whatwg-url, node-fetch)
          // Bundle packages with problematic transitive dependencies
          ...Object.keys(pkg.dependencies).filter(
            (dep) =>
              !dep.startsWith('express') &&
              dep !== 'swagger-ui-express' &&
              dep !== 'decompress-tar' &&
              dep !== 'officeparser' &&
              dep !== 'tar' &&
              // Don't double-add e2b packages
              !dep.startsWith('@e2b') &&
              dep !== 'e2b' &&
              dep !== 'chalk' &&
              dep !== 'dockerfile-ast'
          )
        ],
        output: {
          manualChunks: undefined, // 彻底禁用代码分割 - 返回 null 强制单文件打包
          inlineDynamicImports: true // 内联所有动态导入，这是关键配置
        },
        onwarn(warning, warn) {
          if (warning.code === 'COMMONJS_VARIABLE_IN_ESM') return
          warn(warning)
        }
      },
      sourcemap: isDev
    },
    esbuild: isProd ? { legalComments: 'none' } : {},
    optimizeDeps: {
      noDiscovery: isDev
    }
  },
  preload: {
    plugins: [
      react({
        tsDecorators: true
      })
    ],
    resolve: {
      alias: {
        '@shared': resolve('packages/shared'),
        '@mcp-trace/trace-core': resolve('packages/mcp-trace/trace-core')
      }
    },
    build: {
      sourcemap: isDev
    }
  },
  renderer: {
    plugins: [
      tailwindcss(),
      react({
        tsDecorators: true
      }),
      ...(isDev ? [CodeInspectorPlugin({ bundler: 'vite' })] : []), // 只在开发环境下启用 CodeInspectorPlugin
      ...visualizerPlugin('renderer')
    ],
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('packages/shared'),
        '@types': resolve('src/renderer/src/types'),
        '@logger': resolve('src/renderer/src/services/LoggerService'),
        '@mcp-trace/trace-core': resolve('packages/mcp-trace/trace-core'),
        '@mcp-trace/trace-web': resolve('packages/mcp-trace/trace-web'),
        '@cherrystudio/ai-core/provider': resolve('packages/aiCore/src/core/providers'),
        '@cherrystudio/ai-core/built-in/plugins': resolve('packages/aiCore/src/core/plugins/built-in'),
        '@cherrystudio/ai-core': resolve('packages/aiCore/src'),
        '@cherrystudio/extension-table-plus': resolve('packages/extension-table-plus/src'),
        '@cherrystudio/ai-sdk-provider': resolve('packages/ai-sdk-provider/src')
      }
    },
    optimizeDeps: {
      exclude: [
        'pyodide',
        // Exclude main process dependencies from renderer
        'chalk',
        'dockerfile-ast',
        '@e2b/code-interpreter',
        'e2b',
        'unstructured-client',
        // Exclude optional sandpack packages
        '@codesandbox/sandpack-react',
        '@codesandbox/sandpack-themes'
      ],
      esbuildOptions: {
        target: 'esnext' // for dev
      }
    },
    worker: {
      format: 'es'
    },
    build: {
      target: 'esnext', // for build
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
          miniWindow: resolve(__dirname, 'src/renderer/miniWindow.html'),
          selectionToolbar: resolve(__dirname, 'src/renderer/selectionToolbar.html'),
          selectionAction: resolve(__dirname, 'src/renderer/selectionAction.html'),
          traceWindow: resolve(__dirname, 'src/renderer/traceWindow.html')
        },
        onwarn(warning, warn) {
          if (warning.code === 'COMMONJS_VARIABLE_IN_ESM') return
          warn(warning)
        }
      }
    },
    esbuild: isProd ? { legalComments: 'none' } : {}
  }
})
