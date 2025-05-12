/**
 * Shared configuration for mini apps
 * This file can be imported by both the renderer and main processes
 */

// Mini app metadata type definition
export interface MinAppMetadata {
  // Fallback URLs to try if the primary URL fails to load
  fallbackUrls?: string[]
  // Web preferences for the WebContentsView
  webPreferences?: {
    sandbox?: boolean
    contextIsolation?: boolean
    webSecurity?: boolean
    allowRunningInsecureContent?: boolean
    nodeIntegration?: boolean
    nodeIntegrationInSubFrames?: boolean
    plugins?: boolean
    experimentalFeatures?: boolean
    backgroundThrottling?: boolean
    offscreen?: boolean
    [key: string]: any
  }
  // Loading behavior configuration
  loadingBehavior?: {
    // Whether to prioritize file:// URLs when loading
    prioritizeFileUrls?: boolean
    // Special load options for URLs
    loadOptions?: {
      baseURLForDataURL?: string
      userAgent?: string
      [key: string]: any
    }
    // JavaScript to execute after loading to ensure content visibility
    visibilityScript?: string
    // Whether to load a blank page first before loading the actual URL
    loadBlankFirst?: boolean
    // Whether to inject custom CSS
    injectCSS?: string
    // Whether to attach the view immediately after creation
    attachImmediately?: boolean
    // Whether to periodically check visibility and ensure content is displayed
    periodicVisibilityCheck?: boolean
  }
  // Link handling configuration
  linkHandling?: {
    // Special handling for navigation events
    handleNavigation?: boolean
    // URL patterns that should always open externally
    externalUrlPatterns?: string[]
    // URL patterns that should always open internally
    internalUrlPatterns?: string[]
  }
  // UI configuration
  ui?: {
    // Center the content in the window
    centerContent?: boolean
    // Set max width for the content
    maxContentWidth?: number
    // Add padding around the content
    contentPadding?: {
      top?: number
      right?: number
      bottom?: number
      left?: number
    }
    // Background color
    backgroundColor?: string
  }
  // Browser capabilities configuration
  browserCapabilities?: {
    // Allow localStorage API
    allowLocalStorage?: boolean
    // Allow IndexedDB API
    allowIndexedDB?: boolean
    // Allow all browser APIs without restrictions
    allowAllApis?: boolean
  }
  // Additional app-specific settings
  settings?: {
    [key: string]: any
  }
}

// Mini app configuration
export interface MinAppConfig {
  id: string
  metadata: MinAppMetadata
}

// Configuration for specific mini apps with enhanced metadata
export const META_CONFIG: Record<string, MinAppConfig> = {
  'bolt.diy': {
    id: 'bolt.diy',
    metadata: {
      fallbackUrls: [
        // Use absolute path to ensure the file is found
        'file:///Users/gqadonis/Projects/prometheus/cherry-studio/resources/miniapps/bolt.diy.html',
        'http://localhost:3000/bolt.diy'
      ],
      webPreferences: {
        sandbox: false,
        contextIsolation: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        // Enable these for better compatibility with web apps
        plugins: true,
        experimentalFeatures: true,
        // Add these to improve rendering performance
        backgroundThrottling: false,
        offscreen: false
      },
      loadingBehavior: {
        prioritizeFileUrls: true,
        loadOptions: {
          baseURLForDataURL: 'file:///',
          userAgent: 'Chrome/88.0.4324.150 Safari/537.36'
        },
        visibilityScript: `
          console.log('Executing visibility script for bolt.diy');
          document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM fully loaded for bolt.diy');
            if (document.body) {
              document.body.style.visibility = 'visible';
              document.body.style.display = 'block';
              document.body.style.background = '#121212';
              document.body.style.margin = '0';
              document.body.style.padding = '0';
              document.body.style.boxSizing = 'border-box';
              document.body.style.width = '100%';
              document.body.style.height = '100%';
              document.body.style.overflow = 'auto';
            }
          });
          if (document.body) {
            document.body.style.visibility = 'visible';
            document.body.style.display = 'block';
            document.body.style.background = '#121212';
            document.body.style.margin = '0';
            document.body.style.padding = '0';
            document.body.style.boxSizing = 'border-box';
            document.body.style.width = '100%';
            document.body.style.height = '100%';
            document.body.style.overflow = 'auto';
          }
        `,
        injectCSS: `
          html, body {
            background-color: #121212 !important;
            visibility: visible !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            width: 100% !important;
            height: 100% !important;
            overflow: auto !important;
          }
          * {
            visibility: visible !important;
          }
        `,
        loadBlankFirst: true,
        attachImmediately: true,
        periodicVisibilityCheck: true
      },
      linkHandling: {
        handleNavigation: true,
        externalUrlPatterns: [],
        internalUrlPatterns: ['bolt.diy']
      },
      ui: {
        centerContent: false,
        maxContentWidth: undefined,
        backgroundColor: '#121212',
        contentPadding: {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0
        }
      },
      browserCapabilities: {
        allowLocalStorage: true,
        allowIndexedDB: true,
        allowAllApis: true
      }
    }
  },
  'dify': {
    id: 'dify',
    metadata: {
      fallbackUrls: [
        'https://dify.prometheusags.ai/apps',
        'https://dify.prometheusags.ai',
        'http://localhost:5001',
        'https://cloud.dify.ai/',
        'https://dify.ai/'
      ],
      webPreferences: {
        sandbox: false,
        contextIsolation: true,
        webSecurity: false,
        allowRunningInsecureContent: true,
        plugins: true,
        experimentalFeatures: true,
        backgroundThrottling: false,
        offscreen: false
      },
      loadingBehavior: {
        loadBlankFirst: true,
        attachImmediately: true,
        periodicVisibilityCheck: true,
        visibilityScript: `
          document.addEventListener('DOMContentLoaded', function() {
            if (document.body) {
              document.body.style.visibility = 'visible';
              document.body.style.display = 'block';
              document.body.style.margin = '0';
              document.body.style.padding = '0';
              document.body.style.boxSizing = 'border-box';
              document.body.style.width = '100%';
              document.body.style.height = '100%';
              document.body.style.overflow = 'auto';
            }
          });
          if (document.body) {
            document.body.style.visibility = 'visible';
            document.body.style.display = 'block';
            document.body.style.margin = '0';
            document.body.style.padding = '0';
            document.body.style.boxSizing = 'border-box';
            document.body.style.width = '100%';
            document.body.style.height = '100%';
            document.body.style.overflow = 'auto';
          }
        `,
        injectCSS: `
          html, body {
            visibility: visible !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            width: 100% !important;
            height: 100% !important;
            overflow: auto !important;
          }
          * {
            visibility: visible !important;
          }
        `
      },
      linkHandling: {
        handleNavigation: true,
        externalUrlPatterns: [],
        internalUrlPatterns: ['dify.prometheusags.ai', 'dify.ai']
      },
      ui: {
        centerContent: false,
        backgroundColor: '#ffffff',
        contentPadding: {
          top: 41,  // Ensure flush positioning with top navigation
          right: 0,
          bottom: 0,
          left: 26  // Ensure flush positioning with left sidebar
        }
      },
      // Add ContentAreaManager configuration for proper positioning
      settings: {
        useContentAreaManager: true,
        webContentsViewContainer: {
          positionFlush: true,
          sidebarWidth: 26,
          topNavHeight: 41
        }
      },
      browserCapabilities: {
        allowLocalStorage: true,
        allowIndexedDB: true,
        allowAllApis: true
      }
    }
  },
  'openai': {
    id: 'openai',
    metadata: {
      fallbackUrls: [
        'https://chat.openai.com/'
      ],
      webPreferences: {
        sandbox: false,
        contextIsolation: false,
        webSecurity: false,
        allowRunningInsecureContent: true,
        nodeIntegrationInSubFrames: true,
        plugins: true,
        experimentalFeatures: true,
        backgroundThrottling: false,
        offscreen: false
      },
      loadingBehavior: {
        loadBlankFirst: true,
        attachImmediately: true,
        periodicVisibilityCheck: true,
        visibilityScript: `
          document.addEventListener('DOMContentLoaded', function() {
            if (document.body) {
              document.body.style.visibility = 'visible';
              document.body.style.display = 'block';
              document.body.style.margin = '0';
              document.body.style.padding = '0';
              document.body.style.boxSizing = 'border-box';
              document.body.style.width = '100%';
              document.body.style.height = '100%';
              document.body.style.overflow = 'auto';
            }
          });
          if (document.body) {
            document.body.style.visibility = 'visible';
            document.body.style.display = 'block';
            document.body.style.margin = '0';
            document.body.style.padding = '0';
            document.body.style.boxSizing = 'border-box';
            document.body.style.width = '100%';
            document.body.style.height = '100%';
            document.body.style.overflow = 'auto';
          }
        `,
        injectCSS: `
          html, body {
            visibility: visible !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            width: 100% !important;
            height: 100% !important;
            overflow: auto !important;
          }
          * {
            visibility: visible !important;
          }
        `
      },
      linkHandling: {
        handleNavigation: true,
        externalUrlPatterns: [],
        internalUrlPatterns: ['openai.com']
      },
      ui: {
        centerContent: false,
        backgroundColor: '#ffffff',
        contentPadding: {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0
        }
      },
      browserCapabilities: {
        allowLocalStorage: true,
        allowIndexedDB: true,
        allowAllApis: true
      }
    }
  },
  'groq': {
    id: 'groq',
    metadata: {
      fallbackUrls: [
        'https://console.groq.com/'
      ],
      webPreferences: {
        sandbox: false,
        contextIsolation: false,
        webSecurity: false,
        allowRunningInsecureContent: true,
        nodeIntegrationInSubFrames: true,
        plugins: true,
        experimentalFeatures: true,
        backgroundThrottling: false,
        offscreen: false
      },
      loadingBehavior: {
        loadBlankFirst: true,
        attachImmediately: true,
        periodicVisibilityCheck: true,
        visibilityScript: `
          document.addEventListener('DOMContentLoaded', function() {
            if (document.body) {
              document.body.style.visibility = 'visible';
              document.body.style.display = 'block';
              document.body.style.margin = '0';
              document.body.style.padding = '0';
              document.body.style.boxSizing = 'border-box';
              document.body.style.width = '100%';
              document.body.style.height = '100%';
              document.body.style.overflow = 'auto';
            }
          });
          if (document.body) {
            document.body.style.visibility = 'visible';
            document.body.style.display = 'block';
            document.body.style.margin = '0';
            document.body.style.padding = '0';
            document.body.style.boxSizing = 'border-box';
            document.body.style.width = '100%';
            document.body.style.height = '100%';
            document.body.style.overflow = 'auto';
          }
        `,
        injectCSS: `
          html, body {
            visibility: visible !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            width: 100% !important;
            height: 100% !important;
            overflow: auto !important;
          }
          * {
            visibility: visible !important;
          }
        `
      },
      linkHandling: {
        handleNavigation: true,
        externalUrlPatterns: [],
        internalUrlPatterns: ['groq.com']
      },
      ui: {
        centerContent: false,
        backgroundColor: '#ffffff',
        contentPadding: {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0
        }
      },
      browserCapabilities: {
        allowLocalStorage: true,
        allowIndexedDB: true,
        allowAllApis: true
      }
    }
  },
  'test.miniapp': {
    id: 'test.miniapp',
    metadata: {
      fallbackUrls: [
        'file:///Users/gqadonis/Projects/prometheus/cherry-studio/public/test-miniapp.html',
        'http://localhost:3000/test-miniapp.html'
      ],
      webPreferences: {
        sandbox: false,
        contextIsolation: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        plugins: true,
        experimentalFeatures: true,
        backgroundThrottling: false,
        offscreen: false
      },
      loadingBehavior: {
        prioritizeFileUrls: true,
        loadOptions: {
          baseURLForDataURL: 'file:///',
          userAgent: 'Chrome/88.0.4324.150 Safari/537.36'
        },
        visibilityScript: `
          console.log('Executing visibility script for test.miniapp');
          document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM fully loaded for test.miniapp');
            if (document.body) {
              document.body.style.visibility = 'visible';
              document.body.style.display = 'block';
              document.body.style.margin = '0';
              document.body.style.padding = '0';
              document.body.style.boxSizing = 'border-box';
              document.body.style.width = '100%';
              document.body.style.height = '100%';
              document.body.style.overflow = 'auto';
            }
          });
          if (document.body) {
            document.body.style.visibility = 'visible';
            document.body.style.display = 'block';
            document.body.style.margin = '0';
            document.body.style.padding = '0';
            document.body.style.boxSizing = 'border-box';
            document.body.style.width = '100%';
            document.body.style.height = '100%';
            document.body.style.overflow = 'auto';
          }
        `,
        injectCSS: `
          html, body {
            visibility: visible !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            width: 100% !important;
            height: 100% !important;
            overflow: auto !important;
          }
          * {
            visibility: visible !important;
          }
        `,
        loadBlankFirst: true,
        attachImmediately: true,
        periodicVisibilityCheck: true
      },
      linkHandling: {
        handleNavigation: true,
        externalUrlPatterns: [],
        internalUrlPatterns: ['test.miniapp']
      },
      ui: {
        centerContent: false,
        backgroundColor: '#f0f0f0',
        contentPadding: {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0
        }
      },
      browserCapabilities: {
        allowLocalStorage: true,
        allowIndexedDB: true,
        allowAllApis: true
      }
    }
  }
  // Add more mini apps as needed
}

/**
 * Get the configuration for a specific mini app
 * @param appId The ID of the mini app
 * @returns The mini app configuration or undefined if not found
 */
export function getMinAppConfig(appId: string): MinAppConfig | undefined {
  return META_CONFIG[appId]
}
