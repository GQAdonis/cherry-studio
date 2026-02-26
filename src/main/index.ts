// don't reorder this file, it's used to initialize the app data dir and
// other which should be run before the main process is ready
// eslint-disable-next-line
import './bootstrap'

import '@main/config'

import { loggerService } from '@logger'

import { replaceDevtoolsFont } from '@main/utils/windowUtil'
import { app, crashReporter, session } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

import { isDev, isLinux, isWin } from './constant'
import { registerIpc } from './ipc'
import { agentService } from './services/agents'
import { analyticsService } from './services/AnalyticsService'
import { apiServerService } from './services/ApiServerService'
import { appMenuService } from './services/AppMenuService'
import { configManager } from './services/ConfigManager'
import { lanTransferClientService } from './services/lanTransfer'
import { localTransferService } from './services/LocalTransferService'
import mcpService from './services/MCPService'
import { nodeTraceService } from './services/NodeTraceService'
import { openClawService } from './services/OpenClawService'
import { isOvmsSupported } from './services/OvmsManager'
import { uarSidecarService } from './services/UarSidecarService'
import powerMonitorService from './services/PowerMonitorService'
import {
  CHERRY_STUDIO_PROTOCOL,
  handleProtocolUrl,
  registerProtocolClient,
  setupAppImageDeepLink
} from './services/ProtocolClient'
import selectionService, { initSelectionService } from './services/SelectionService'
import { registerShortcuts } from './services/ShortcutService'
import { TrayService } from './services/TrayService'
import { versionService } from './services/VersionService'
import { initWebviewHotkeys } from './services/WebviewService'
import { windowService } from './services/WindowService'
import { runAsyncFunction } from './utils'

const logger = loggerService.withContext('MainEntry')

function redactApiKey(apiKey?: string) {
  if (!apiKey) return apiKey
  // Keep a tiny prefix so it's useful for debugging which key is in use
  return `${apiKey.slice(0, 10)}…(redacted)`
}

async function loadDevtoolsExtensions(): Promise<void> {
  // In newer Electron versions, `session.loadExtension` is deprecated.
  // Use `session.extensions.loadExtension` and load from the local cached directory.
  // We do not download extensions here; this only loads if already present.
  const extensionsDir = join(app.getPath('userData'), 'extensions')

  const extensions = [
    // Chrome Web Store extension IDs (used by Electron's extension loader)
    { id: 'lmhkpmbekcpmknklioeibfkpmmfibljd', name: 'Redux DevTools' },
    { id: 'fmkadmapgofadopljbjfkapdkoienihi', name: 'React Developer Tools' }
  ]

  for (const ext of extensions) {
    const extPath = join(extensionsDir, ext.id)
    if (!existsSync(extPath)) continue
    try {
      await session.defaultSession.extensions.loadExtension(extPath, { allowFileAccess: true })
      logger.info(`Added Extension:  ${ext.name}`)
    } catch (error) {
      logger.warn(`Failed to load extension: ${ext.name}`, error as Error)
    }
  }
}

// enable local crash reports
crashReporter.start({
  companyName: 'CherryHQ',
  productName: 'CherryStudio',
  submitURL: '',
  uploadToServer: false
})

/**
 * Disable hardware acceleration if setting is enabled
 */
const disableHardwareAcceleration = configManager.getDisableHardwareAcceleration()
if (disableHardwareAcceleration) {
  app.disableHardwareAcceleration()
}

/**
 * Disable chromium's window animations
 * main purpose for this is to avoid the transparent window flashing when it is shown
 * (especially on Windows for SelectionAssistant Toolbar)
 * Know Issue: https://github.com/electron/electron/issues/12130#issuecomment-627198990
 */
if (isWin) {
  app.commandLine.appendSwitch('wm-window-animations-disabled')
}

/**
 * Enable GlobalShortcutsPortal for Linux Wayland Protocol
 * see: https://www.electronjs.org/docs/latest/api/global-shortcut
 */
if (isLinux && process.env.XDG_SESSION_TYPE === 'wayland') {
  app.commandLine.appendSwitch('enable-features', 'GlobalShortcutsPortal')
}

/**
 * Set window class and name for Linux
 * This ensures the window manager identifies the app correctly on both X11 and Wayland
 */
if (isLinux) {
  app.commandLine.appendSwitch('class', 'CherryStudio')
  app.commandLine.appendSwitch('name', 'CherryStudio')
}

// DocumentPolicyIncludeJSCallStacksInCrashReports: Enable features for unresponsive renderer js call stacks
// EarlyEstablishGpuChannel,EstablishGpuChannelAsync: Enable features for early establish gpu channel
// speed up the startup time
// https://github.com/microsoft/vscode/pull/241640/files
app.commandLine.appendSwitch(
  'enable-features',
  'DocumentPolicyIncludeJSCallStacksInCrashReports,EarlyEstablishGpuChannel,EstablishGpuChannelAsync'
)
app.on('web-contents-created', (_, webContents) => {
  webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Document-Policy': ['include-js-call-stacks-in-crash-reports']
      }
    })
  })

  webContents.on('unresponsive', async () => {
    // Interrupt execution and collect call stack from unresponsive renderer
    logger.error('Renderer unresponsive start')
    const callStack = await webContents.mainFrame.collectJavaScriptCallStack()
    logger.error(`Renderer unresponsive js call stack\n ${callStack}`)
  })
})

// in production mode, handle uncaught exception and unhandled rejection globally
if (!isDev) {
  // handle uncaught exception
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error)
  })

  // handle unhandled rejection
  process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled Rejection at: ${promise} reason: ${reason}`)
  })
}

// Check for single instance lock
if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
} else {
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.

  app.whenReady().then(async () => {
    // Initialize file logging - MUST be first to ensure logs are captured
    loggerService.initialize()

    // Initialize theme service - MUST be after app is ready to access nativeTheme
    const { themeService } = await import('./services/ThemeService')
    themeService.initialize()

    // Initialize trace-aware IPC handling - MUST be before other ipcMain.handle registrations
    const { initializeTraceIpcHandling } = await import('./services/NodeTraceService')
    initializeTraceIpcHandling()

    // Initialize Redux service - MUST be after app is ready to access ipcMain
    const { reduxService } = await import('./services/ReduxService')
    reduxService.initialize()

    // Initialize WebView registry service - MUST be after app is ready to access app.on()
    const { webViewRegistryService } = await import('./services/WebViewRegistryService')
    webViewRegistryService.initialize()

    // Initialize Python service - MUST be after app is ready to access ipcMain
    const { pythonService } = await import('./services/PythonService')
    pythonService.initialize()

    // Initialize Skill service - MUST be after app is ready to access app.getPath()
    const { skillService } = await import('./services/SkillService')
    await skillService.initialize()

    // Initialize Artifact Studio agent - MUST be after app is ready
    const { initializeArtifactStudioAgent } = await import('./services/agents/services/initializeArtifactStudioAgent')
    runAsyncFunction(async () => {
      try {
        await initializeArtifactStudioAgent()
      } catch (error) {
        logger.warn('Failed to initialize Artifact Studio agent:', error as Error)
      }
    })

    // Record current version for tracking
    // A preparation for v2 data refactoring
    versionService.recordCurrentVersion()

    initWebviewHotkeys()
    // Set app user model id for windows
    app.setAppUserModelId(import.meta.env.VITE_MAIN_BUNDLE_ID || 'com.kangfenmao.CherryStudio')

    // Mac: Hide dock icon before window creation when launch to tray is set
    const isLaunchToTray = configManager.getLaunchToTray()
    if (isLaunchToTray) {
      app.dock?.hide()
    }

    const mainWindow = windowService.createMainWindow()
    new TrayService()

    // Setup macOS application menu
    appMenuService?.setupApplicationMenu()

    nodeTraceService.init()
    powerMonitorService.init()
    analyticsService.init()

    app.on('activate', function () {
      const mainWindow = windowService.getMainWindow()
      if (!mainWindow || mainWindow.isDestroyed()) {
        windowService.createMainWindow()
      } else {
        windowService.showMainWindow()
      }
    })

    registerShortcuts(mainWindow)

    await registerIpc(mainWindow, app)
    localTransferService.startDiscovery({ resetList: true })

    replaceDevtoolsFont(mainWindow)

    // Setup deep link for AppImage on Linux
    await setupAppImageDeepLink()

    if (isDev) {
      // Avoid deprecated `session.loadExtension` warnings by loading via the modern API.
      // Extensions will be loaded only if they already exist in userData.
      await loadDevtoolsExtensions()
    }

    //start selection assistant service
    initSelectionService()

    // Start Universal Agent Runtime Sidecar
    uarSidecarService.start()

    runAsyncFunction(async () => {
      // Start API server if enabled or if agents exist
      try {
        const config = await apiServerService.getCurrentConfig()
        logger.info('API server config:', {
          ...config,
          apiKey: redactApiKey(config.apiKey)
        })

        // Check if there are any agents
        let shouldStart = config.enabled
        if (!shouldStart) {
          try {
            const { total } = await agentService.listAgents({ limit: 1 })
            if (total > 0) {
              shouldStart = true
              logger.info(`Detected ${total} agent(s), auto-starting API server`)
            }
          } catch (error: any) {
            logger.warn('Failed to check agent count:', error)
          }
        }

        if (shouldStart) {
          await apiServerService.start()
        }
      } catch (error: any) {
        logger.error('Failed to check/start API server:', error)
      }
    })
  })

  registerProtocolClient(app)

  // macOS specific: handle protocol when app is already running

  app.on('open-url', (event, url) => {
    event.preventDefault()
    handleProtocolUrl(url)
  })

  const handleOpenUrl = (args: string[]) => {
    const url = args.find((arg) => arg.startsWith(CHERRY_STUDIO_PROTOCOL + '://'))
    if (url) handleProtocolUrl(url)
  }

  // for windows to start with url
  handleOpenUrl(process.argv)

  // Listen for second instance
  app.on('second-instance', (_event, argv) => {
    windowService.showMainWindow()

    // Protocol handler for Windows/Linux
    // The commandLine is an array of strings where the last item might be the URL
    handleOpenUrl(argv)
  })

  app.on('browser-window-created', (_, _window) => {
    // Note: optimizer.watchWindowShortcuts() removed - dev shortcuts handled by Electron
  })

  app.on('before-quit', () => {
    app.isQuitting = true

    // quit selection service
    if (selectionService) {
      selectionService.quit()
    }

    lanTransferClientService.dispose()
    localTransferService.dispose()
  })

  app.on('will-quit', async () => {
    // 简单的资源清理，不阻塞退出流程
    if (isOvmsSupported) {
      const { ovmsManager } = await import('./services/OvmsManager')
      if (ovmsManager) {
        await ovmsManager.stopOvms()
      } else {
        logger.warn('Unexpected behavior: undefined ovmsManager, but OVMS should be supported.')
      }
    }

    try {
      await analyticsService.destroy()
      await openClawService.stopGateway()
      await mcpService.cleanup()
      await apiServerService.stop()
      uarSidecarService.stop()
    } catch (error) {
      logger.warn('Error cleaning up services:', error as Error)
    }
    // finish the logger
    logger.finish()
  })

  // In this file you can include the rest of your app"s specific main process
  // code. You can also put them in separate files and require them here.
}
