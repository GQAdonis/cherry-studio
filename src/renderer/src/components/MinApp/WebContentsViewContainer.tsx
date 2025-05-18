import React, { useEffect, useRef, useState } from 'react'
import './WebContentsViewContainer.css'
import LoadingIndicator from './LoadingIndicator'
import { useContentAreaBounds } from '../ContentAreaManager'

/**
 * WebContentsViewContainer is a component that manages a WebContentsView in the main process.
 * It provides better compatibility with web apps that need access to storage, IndexedDB,
 * and other browser features compared to the WebviewContainer component.
 *
 * This component uses ContentAreaManager to position the WebContentsView correctly within
 * the application's content area, ensuring it doesn't overlap with navigation elements.
 *
 * CRITICAL: This component must be used inside a ContentAreaManager to ensure proper positioning.
 * It will position the WebContentsView exactly at the bounds provided by ContentAreaManager,
 * which ensures it doesn't overlap with the sidebar (26px from left) or top navigation (41px from top).
 */
const WebContentsViewContainer: React.FC<{
  appid: string
  url: string
  onSetRefCallback: (appid: string, element: any | null) => void
  onLoadedCallback: (appid: string) => void
  onNavigateCallback: (appid: string, url: string) => void
}> = ({ appid, url, onSetRefCallback, onLoadedCallback, onNavigateCallback }) => {
  // State to track loading status
  const [isLoading, setIsLoading] = useState(true)
  // We don't need to use appConfig here as we're just passing the appId to the LoadingIndicator

  // Get content area bounds from ContentAreaManager
  const contentAreaBounds = useContentAreaBounds()

  // Reference to track if the WebContentsView has been created
  const hasCreatedView = useRef(false)
  // Reference to track the container element for positioning
  const containerRef = useRef<HTMLDivElement>(null)
  // Reference to track if the component is mounted
  const isMountedRef = useRef(true)
  // Reference to track the current URL
  const currentUrlRef = useRef(url)

  useEffect(() => {
    // Set the current URL reference
    currentUrlRef.current = url

    // Initialize
    // const isMounted = true  // Removed unused variable

    // Create a ResizeObserver to update the WebContentsView position when the container size changes
    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current && hasCreatedView.current) {
        updateWebContentsViewPosition()
      }
    })

    // Create a MutationObserver to update the WebContentsView position when the container attributes change
    const mutationObserver = new MutationObserver(() => {
      if (containerRef.current && hasCreatedView.current) {
        updateWebContentsViewPosition()
      }
    })

    // Function to update the WebContentsView position with precise spatial constraints
    const updateWebContentsViewPosition = () => {
      if (!hasCreatedView.current || !contentAreaBounds) return

      try {
        // CRITICAL: Ensure positioning ONLY takes up the content area flush with the left sidebar and below top nav
        // Get the actual sidebar width and navbar height from CSS variables
        const sidebarWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width') || '26', 10);
        const navbarHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--navbar-height') || '41', 10);
        
        // Calculate the bounds precisely to ensure content only appears in the correct area
        // CRITICAL: Position flush against the left edge without any gap
        const bounds = {
          x: 0, // CRITICAL: Force position to absolute left edge of the window
          y: navbarHeight, // Position exactly below the navbar
          width: window.innerWidth - sidebarWidth, // Use width excluding sidebar
          height: window.innerHeight - navbarHeight // Use height excluding navbar
        }
        
        // Log the calculated sidebar width and navbar height for debugging
        console.log(`WebContentsViewContainer: Using sidebar width: ${sidebarWidth}px and navbar height: ${navbarHeight}px`)

        // Log detailed positioning information for debugging
        console.log(`WebContentsViewContainer: Updating bounds for ${appid} with precise positioning:`, {
          ...bounds,
          containerWidth: contentAreaBounds.width,
          containerHeight: contentAreaBounds.height,
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          sidebarWidth,
          navbarHeight,
          timestamp: new Date().toISOString()
        })

        // Show the WebContentsView with the calculated bounds
        window.api.webContentsView
          .show(appid, bounds)
          .then((result) => {
            if (result.success) {
              console.log(`WebContentsViewContainer: Successfully updated bounds for ${appid}`)
            } else {
              console.error(`WebContentsViewContainer: Failed to update bounds for ${appid}:`, result.error)
            }
          })
          .catch((error) => {
            console.error(`WebContentsViewContainer: Error showing view for appid: ${appid}:`, error)
          })
      } catch (error) {
        console.error(`WebContentsViewContainer: Error updating position for appid: ${appid}:`, error)
      }
    }

    // Function to handle window resize events with debouncing for better performance
    let resizeTimeout: NodeJS.Timeout | null = null
    const handleWindowResize = () => {
      // Clear previous timeout to debounce resize events
      if (resizeTimeout) {
        clearTimeout(resizeTimeout)
      }

      // Set a new timeout to update position after resize completes
      resizeTimeout = setTimeout(() => {
        console.log(`WebContentsViewContainer: Window resize detected for ${appid}, updating position`)
        updateWebContentsViewPosition()
        resizeTimeout = null
      }, 100) // 100ms debounce
    }

    // Start observing the container element
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
      mutationObserver.observe(containerRef.current, {
        attributes: true,
        childList: true,
        subtree: true
      })
    }

    // Add window resize event listener
    window.addEventListener('resize', handleWindowResize)

    // Create the WebContentsView if it hasn't been created yet
    if (!hasCreatedView.current) {
      console.log(`WebContentsViewContainer: Creating view for appid: ${appid}, url: ${url}`)

      // Create the WebContentsView
      window.api.webContentsView
        .create(appid, url)
        .then((result) => {
          if (result.success) {
            console.log(`WebContentsViewContainer: Successfully created view for appid: ${appid}`)
            hasCreatedView.current = true

            // Create a simulated WebviewTag interface for compatibility
            const simulatedRef = {
              getWebContentsId: async () => {
                const result = await window.api.webContentsView.getWebContentsId(appid)
                return result.success ? result.id : null
              },
              openDevTools: async () => {
                await window.api.webContentsView.openDevTools(appid)
              },
              src: url
            }

            // Set the reference callback
            onSetRefCallback(appid, simulatedRef)

            // Update the WebContentsView position
            updateWebContentsViewPosition()

            // Set up a periodic check for URL changes
            const urlCheckInterval = setInterval(async () => {
              if (!isMountedRef.current) {
                clearInterval(urlCheckInterval)
                return
              }

              try {
                const result = await window.api.webContentsView.getURL(appid)
                if (result.success && result.url !== currentUrlRef.current) {
                  currentUrlRef.current = result.url
                  onNavigateCallback(appid, result.url)
                }
              } catch (error) {
                console.error(`WebContentsViewContainer: Error getting current URL for appid: ${appid}:`, error)
              }
            }, 500)

            // Notify that the view is loaded
            setTimeout(() => {
              if (isMountedRef.current) {
                setIsLoading(false)
                onLoadedCallback(appid)
              }
            }, 1000)
          } else {
            console.error(`WebContentsViewContainer: Error creating view for appid: ${appid}:`, result.error)
          }
        })
        .catch((error) => {
          console.error(`WebContentsViewContainer: Error creating view for appid: ${appid}:`, error)
        })
    } else if (contentAreaBounds) {
      // CRITICAL: Ensure positioning ONLY takes up the content area to the right of left sidebar and below top nav
      // Get the actual sidebar width and navbar height from CSS variables
      const sidebarWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width') || '26', 10);
      const navbarHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--navbar-height') || '41', 10);
      
      // Calculate the bounds precisely to ensure content only appears in the correct area
      const bounds = {
        x: sidebarWidth, // Position exactly at the right edge of the sidebar
        y: navbarHeight, // Position exactly below the navbar
        width: window.innerWidth - sidebarWidth, // Use width excluding sidebar
        height: window.innerHeight - navbarHeight // Use height excluding navbar
      }

      console.log(`WebContentsViewContainer: Showing existing view for ${appid} with precise positioning:`, {
        ...bounds,
        containerWidth: contentAreaBounds.width,
        containerHeight: contentAreaBounds.height,
        timestamp: new Date().toISOString()
      })

      // CRITICAL: Ensure precise positioning when showing existing view
      window.api.webContentsView
        .show(appid, bounds)
        .then((result) => {
          if (result.success) {
            console.log(`WebContentsViewContainer: Successfully showed existing view for ${appid}`)
          } else {
            console.error(`WebContentsViewContainer: Failed to show existing view for ${appid}:`, result.error)
          }
        })
        .catch((error) => {
          console.error(`WebContentsViewContainer: Error showing view for appid: ${appid}:`, error)
        })
    }

    // Clean up
    return () => {
      console.log(`WebContentsViewContainer: Component unmounting for appid: ${appid}`)
      isMountedRef.current = false
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      window.removeEventListener('resize', handleWindowResize)

      // Hide the WebContentsView when component unmounts, but don't destroy it
      // This preserves the state when switching between mini apps
      if (hasCreatedView.current) {
        console.log(`WebContentsViewContainer: Hiding view on unmount for appid: ${appid}`)
        window.api.webContentsView.hide(appid)
        // Note: We intentionally don't destroy the view here to preserve state
      }
    }
  }, [appid, url, onLoadedCallback, onNavigateCallback, onSetRefCallback, contentAreaBounds])

  // Using className instead of inline styles for better performance
  // The styles are defined in WebContentsViewContainer.css

  return (
    <div ref={containerRef} className="webcontents-view-container" data-appid={appid}>
      {isLoading && <LoadingIndicator appId={appid} displayName={appid} isLoading={isLoading} />}
    </div>
  )
}

export default WebContentsViewContainer
