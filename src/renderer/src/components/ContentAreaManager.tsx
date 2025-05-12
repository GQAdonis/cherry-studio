import React, { useRef, useState, useEffect, createContext, useContext } from 'react'

/**
 * ContentAreaManager component
 *
 * This component is responsible for:
 * 1. Defining the content area that starts exactly 26px from the left (sidebar width)
 *    and 41px from the top (top navigation height)
 * 2. Tracking content area dimensions and providing them to child components
 * 3. Handling window resize events to maintain proper positioning
 *
 * The component uses a ResizeObserver to track changes in the content area dimensions
 * and provides these dimensions to child components via React Context.
 */
export interface ContentAreaBounds {
  x: number
  y: number
  width: number
  height: number
}

// Create a context for content area bounds
export const ContentAreaContext = createContext<ContentAreaBounds | null>(null)

// Custom hook to consume the content area bounds
export const useContentAreaBounds = (): ContentAreaBounds => {
  const context = useContext(ContentAreaContext)
  if (!context) {
    throw new Error('useContentAreaBounds must be used within a ContentAreaManager')
  }
  return context
}

interface ContentAreaManagerProps {
  children: React.ReactNode
}

const ContentAreaManager: React.FC<ContentAreaManagerProps> = ({ children }) => {
  const contentAreaRef = useRef<HTMLDivElement>(null)
  
  // CRITICAL: Define exact constants for sidebar width and top navigation height
  // These values MUST be exactly 26px and 41px respectively for precise positioning
  const SIDEBAR_WIDTH = 26 // Width of the sidebar in pixels - MUST be exactly 26px
  const TOP_NAV_HEIGHT = 41 // Height of the top navigation in pixels - MUST be exactly 41px
  
  // Share the content area dimensions with child components
  const [contentAreaBounds, setContentAreaBounds] = useState<ContentAreaBounds>({
    x: SIDEBAR_WIDTH,
    y: TOP_NAV_HEIGHT,
    width: 0,
    height: 0
  })
  
  useEffect(() => {
    // Create a ResizeObserver to update content area bounds
    // This ensures the content area dimensions are always accurate
    const resizeObserver = new ResizeObserver(() => {
      if (contentAreaRef.current) {
        const rect = contentAreaRef.current.getBoundingClientRect()
        
        // CRITICAL: Ensure precise positioning with exact offsets
        const newBounds = {
          x: SIDEBAR_WIDTH, // CRITICAL: Exactly 26px from left edge
          y: TOP_NAV_HEIGHT, // CRITICAL: Exactly 41px from top edge
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }
        
        setContentAreaBounds(newBounds)
        
        // Log bounds for debugging
        console.log('ContentAreaManager: Updated content area bounds:', {
          ...newBounds,
          leftOffset: `${SIDEBAR_WIDTH}px from left edge`,
          topOffset: `${TOP_NAV_HEIGHT}px from top edge`
        })
      }
    })
    
    // Observe the content area
    if (contentAreaRef.current) {
      resizeObserver.observe(contentAreaRef.current)
    }
    
    // Initial measurement on component mount
    if (contentAreaRef.current) {
      const rect = contentAreaRef.current.getBoundingClientRect()
      
      // CRITICAL: Ensure precise positioning with exact offsets for initial measurement
      const initialBounds = {
        x: SIDEBAR_WIDTH, // CRITICAL: Exactly 26px from left edge
        y: TOP_NAV_HEIGHT, // CRITICAL: Exactly 41px from top edge
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      }
      
      setContentAreaBounds(initialBounds)
      
      // Log initial bounds for debugging
      console.log('ContentAreaManager: Initial content area bounds:', {
        ...initialBounds,
        leftOffset: `${SIDEBAR_WIDTH}px from left edge`,
        topOffset: `${TOP_NAV_HEIGHT}px from top edge`
      })
    }
    
    // Add window resize event listener for additional resize handling
    const handleWindowResize = () => {
      if (contentAreaRef.current) {
        const rect = contentAreaRef.current.getBoundingClientRect()
        
        // CRITICAL: Ensure precise positioning with exact offsets during window resize
        const resizeBounds = {
          x: SIDEBAR_WIDTH, // CRITICAL: Exactly 26px from left edge
          y: TOP_NAV_HEIGHT, // CRITICAL: Exactly 41px from top edge
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }
        
        setContentAreaBounds(resizeBounds)
        
        // Log resize bounds for debugging
        console.log('ContentAreaManager: Window resize content area bounds:', {
          ...resizeBounds,
          leftOffset: `${SIDEBAR_WIDTH}px from left edge`,
          topOffset: `${TOP_NAV_HEIGHT}px from top edge`
        })
      }
    }
    
    window.addEventListener('resize', handleWindowResize)
    
    // Clean up all event listeners and observers
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleWindowResize)
    }
  }, [])
  
  return (
    <div
      ref={contentAreaRef}
      className="content-area"
      style={{
        position: 'absolute',
        left: `${SIDEBAR_WIDTH}px`, // CRITICAL: Exactly 26px from left edge
        top: `${TOP_NAV_HEIGHT}px`, // CRITICAL: Exactly 41px from top edge
        right: '0',
        bottom: '0',
        overflow: 'hidden',
        // CRITICAL: Ensure content is scrollable when necessary
        overflowY: 'auto',
        // CRITICAL: Ensure no margin or padding that might affect positioning
        margin: 0,
        padding: 0,
        // CRITICAL: Ensure proper box sizing
        boxSizing: 'border-box'
      }}
    >
      {/* Provide the content area bounds to children via context */}
      <ContentAreaContext.Provider value={contentAreaBounds}>
        {children}
      </ContentAreaContext.Provider>
    </div>
  )
}

export default ContentAreaManager