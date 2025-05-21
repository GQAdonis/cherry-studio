/**
 * TypeScript types for mini-app configuration
 * These types mirror the Rust types defined in miniapp_manager.rs
 */

/**
 * Represents a mini-app configuration
 */
export interface MiniAppConfig {
  /** Unique identifier for the mini-app */
  id: string;
  /** Display name of the mini-app */
  name: string;
  /** URL or HTML content of the mini-app */
  url: string;
  /** Optional icon for the mini-app */
  icon?: string;
  /** Additional metadata for the mini-app */
  metadata: MiniAppMetadata;
}

/**
 * Represents the metadata for a mini-app
 */
export interface MiniAppMetadata {
  /** Fallback URLs to try if the primary URL fails to load */
  fallbackUrls?: string[];
  /** Web preferences for the webview */
  webPreferences?: WebPreferences;
  /** Loading behavior configuration */
  loadingBehavior?: LoadingBehavior;
  /** Link handling configuration */
  linkHandling?: LinkHandling;
  /** UI configuration */
  ui?: UiConfig;
  /** Browser capabilities configuration */
  browserCapabilities?: BrowserCapabilities;
  /** Additional app-specific settings */
  settings?: Record<string, any>;
}

/**
 * Web preferences for the webview
 */
export interface WebPreferences {
  /** Whether to enable sandbox */
  sandbox?: boolean;
  /** Whether to enable context isolation */
  contextIsolation?: boolean;
  /** Whether to enable web security */
  webSecurity?: boolean;
  /** Whether to allow running insecure content */
  allowRunningInsecureContent?: boolean;
  /** Whether to enable node integration */
  nodeIntegration?: boolean;
  /** Whether to enable node integration in subframes */
  nodeIntegrationInSubframes?: boolean;
  /** Whether to enable plugins */
  plugins?: boolean;
  /** Whether to enable experimental features */
  experimentalFeatures?: boolean;
  /** Whether to enable background throttling */
  backgroundThrottling?: boolean;
  /** Whether to enable offscreen rendering */
  offscreen?: boolean;
}

/**
 * Loading behavior configuration
 */
export interface LoadingBehavior {
  /** Whether to prioritize file:// URLs when loading */
  prioritizeFileUrls?: boolean;
  /** Special load options for URLs */
  loadOptions?: Record<string, any>;
  /** JavaScript to execute after loading to ensure content visibility */
  visibilityScript?: string;
  /** Whether to load a blank page first before loading the actual URL */
  loadBlankFirst?: boolean;
  /** Whether to inject custom CSS */
  injectCss?: string;
  /** Whether to attach the view immediately after creation */
  attachImmediately?: boolean;
  /** Whether to periodically check visibility and ensure content is displayed */
  periodicVisibilityCheck?: boolean;
}

/**
 * Link handling configuration
 */
export interface LinkHandling {
  /** Special handling for navigation events */
  handleNavigation?: boolean;
  /** URL patterns that should always open externally */
  externalUrlPatterns?: string[];
  /** URL patterns that should always open internally */
  internalUrlPatterns?: string[];
}

/**
 * UI configuration
 */
export interface UiConfig {
  /** Center the content in the window */
  centerContent?: boolean;
  /** Set max width for the content */
  maxContentWidth?: number;
  /** Background color */
  backgroundColor?: string;
  /** Content padding */
  contentPadding?: ContentPadding;
}

/**
 * Content padding configuration
 */
export interface ContentPadding {
  /** Top padding */
  top?: number;
  /** Right padding */
  right?: number;
  /** Bottom padding */
  bottom?: number;
  /** Left padding */
  left?: number;
}

/**
 * Browser capabilities configuration
 */
export interface BrowserCapabilities {
  /** Allow localStorage API */
  allowLocalStorage?: boolean;
  /** Allow IndexedDB API */
  allowIndexedDB?: boolean;
  /** Allow all browser APIs without restrictions */
  allowAllApis?: boolean;
}

/**
 * Represents the bounds of a mini-app webview
 */
export interface MiniAppBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Represents the state of a mini-app
 */
export enum MiniAppState {
  /** Mini-app is not loaded */
  NotLoaded = "NotLoaded",
  /** Mini-app is loading */
  Loading = "Loading",
  /** Mini-app is loaded but hidden */
  Loaded = "Loaded",
  /** Mini-app is visible */
  Visible = "Visible",
  /** Mini-app has encountered an error */
  Error = "Error"
}

/**
 * Default mini-app configurations
 */
export const DEFAULT_MINI_APPS: MiniAppConfig[] = [
  {
    id: "test.miniapp",
    name: "Test Mini App",
    url: "http://localhost:3000/test-miniapp.html",
    icon: "🧪",
    metadata: {
      fallbackUrls: [
        "file:///public/test-miniapp.html"
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
          baseURLForDataURL: "file:///",
          userAgent: "Chrome/88.0.4324.150 Safari/537.36"
        },
        visibilityScript: `
          console.log('Executing visibility script for test.miniapp');
          document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM fully loaded for test.miniapp');
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
        injectCss: `
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
        internalUrlPatterns: ["test.miniapp"]
      },
      ui: {
        centerContent: false,
        backgroundColor: "#121212",
        contentPadding: {
          top: 41,  // Ensure flush positioning with top navigation
          right: 0,
          bottom: 0,
          left: 26  // Ensure flush positioning with left sidebar
        }
      },
      browserCapabilities: {
        allowLocalStorage: true,
        allowIndexedDB: true,
        allowAllApis: true
      }
    }
  },
  {
    id: "html.editor",
    name: "HTML Editor",
    url: "https://codepen.io/pen/",
    icon: "📝",
    metadata: {
      webPreferences: {
        sandbox: false,
        contextIsolation: false,
        webSecurity: false,
        allowRunningInsecureContent: true,
        plugins: true,
        experimentalFeatures: true,
        backgroundThrottling: false
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
        `
      },
      linkHandling: {
        handleNavigation: true,
        externalUrlPatterns: [],
        internalUrlPatterns: ["codepen.io"]
      },
      ui: {
        centerContent: false,
        backgroundColor: "#ffffff",
        contentPadding: {
          top: 41,
          right: 0,
          bottom: 0,
          left: 26
        }
      },
      browserCapabilities: {
        allowLocalStorage: true,
        allowIndexedDB: true,
        allowAllApis: true
      }
    }
  }
];