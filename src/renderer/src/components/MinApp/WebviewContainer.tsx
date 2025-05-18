import { WebviewTag } from 'electron'
import { memo, useEffect, useRef } from 'react'

/**
 * WebviewContainer is a component that renders a webview element.
 * It is used in the MinAppPopupContainer component.
 * The webcontent can be remain in memory
 */
const WebviewContainer = memo(
  ({
    appid,
    url,
    onSetRefCallback,
    onLoadedCallback,
    onNavigateCallback
  }: {
    appid: string
    url: string
    onSetRefCallback: (appid: string, element: WebviewTag | null) => void
    onLoadedCallback: (appid: string) => void
    onNavigateCallback: (appid: string, url: string) => void
  }) => {
    const webviewRef = useRef<WebviewTag | null>(null)

    const setRef = (appid: string) => {
      onSetRefCallback(appid, null)

      return (element: WebviewTag | null) => {
        onSetRefCallback(appid, element)
        if (element) {
          webviewRef.current = element
        } else {
          webviewRef.current = null
        }
      }
    }

    useEffect(() => {
      if (!webviewRef.current) return

      const handleLoaded = () => {
        console.log(`WebviewContainer: Mini-app ${appid} loaded successfully`)
        onLoadedCallback(appid)
      }

      const handleNavigate = (event: any) => {
        console.log(`WebviewContainer: Mini-app ${appid} navigated to ${event.url}`)
        onNavigateCallback(appid, event.url)
      }

      const handleFailLoad = (event: any) => {
        console.error(`WebviewContainer: Mini-app ${appid} failed to load: ${event.errorCode} - ${event.errorDescription}`)
        // If the page fails to load, we might want to try reloading or showing an error message
        if (event.errorCode === -6) { // ERR_FILE_NOT_FOUND
          console.log(`WebviewContainer: Attempting to reload mini-app ${appid}`)
          setTimeout(() => {
            if (webviewRef.current) {
              webviewRef.current.src = url
            }
          }, 1000)
        }
      }

      const handleConsoleMessage = (event: any) => {
        console.log(`WebviewContainer: Mini-app ${appid} console message: ${event.message}`)
      }

      // Add event listeners
      webviewRef.current.addEventListener('did-finish-load', handleLoaded)
      webviewRef.current.addEventListener('did-navigate-in-page', handleNavigate)
      webviewRef.current.addEventListener('did-fail-load', handleFailLoad)
      webviewRef.current.addEventListener('console-message', handleConsoleMessage)

      // we set the url when the webview is ready
      console.log(`WebviewContainer: Setting URL for mini-app ${appid}: ${url}`)
      webviewRef.current.src = url

      return () => {
        if (webviewRef.current) {
          webviewRef.current.removeEventListener('did-finish-load', handleLoaded)
          webviewRef.current.removeEventListener('did-navigate-in-page', handleNavigate)
          webviewRef.current.removeEventListener('did-fail-load', handleFailLoad)
          webviewRef.current.removeEventListener('console-message', handleConsoleMessage)
        }
      }
      // because the appid and url are enough, no need to add onLoadedCallback
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appid, url])

    return (
      <webview
        key={appid}
        ref={setRef(appid)}
        style={WebviewStyle}
        allowpopups={'true' as any}
        partition="persist:webview"
        webpreferences="allowRunningInsecureContent=yes, javascript=yes, plugins=yes, webSql=yes, experimentalFeatures=yes"
        disablewebsecurity={'true' as any}
        nodeintegration={'true' as any}
        // TypeScript doesn't recognize this attribute, but it's valid for webview
        // @ts-ignore - allowtransparency is a valid webview attribute in Electron but not recognized by TypeScript
        allowtransparency={'true' as any}
        useragent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.7049.96 Safari/537.36"
        httpreferrer="https://cherry-studio.app"
      />
    )
  }
)

const WebviewStyle: React.CSSProperties = {
  width: '100%',
  height: 'calc(100vh - var(--navbar-height))',
  backgroundColor: 'var(--color-background)',
  display: 'inline-flex',
  // CRITICAL: Ensure the webview is positioned flush against the left sidebar
  position: 'absolute',
  left: 0,
  top: 0,
  right: 0,
  bottom: 0,
  // CRITICAL: Remove any margin or padding that might cause gaps
  margin: 0,
  padding: 0,
  // CRITICAL: Ensure content is properly contained
  boxSizing: 'border-box',
  // CRITICAL: Allow content to scroll when necessary
  overflow: 'auto'
}

export default WebviewContainer
