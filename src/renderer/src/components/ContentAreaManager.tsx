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
  
  // Share the content area dimensions with child components
  // For mini-apps in a drawer, we want to use relative positioning (0,0) within the drawer
  // rather than absolute positioning from the window edge
  const [contentAreaBounds, setContentAreaBounds] = useState<ContentAreaBounds>({
    x: 0,
    y: 0,
    width: 0,
    height: 0
  })
  
  useEffect(() => {
    // Create a ResizeObserver to update content area bounds
    // This ensures the content area dimensions are always accurate
    const resizeObserver = new ResizeObserver(() => {
      if (contentAreaRef.current) {
        const rect = contentAreaRef.current.getBoundingClientRect()
        
        // For mini-apps in a drawer, we use relative positioning (0,0) within the drawer
        const newBounds = {
          x: 0, // Position relative to the container
          y: 0, // Position relative to the container
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }
        
        setContentAreaBounds(newBounds)
        
        // Log bounds for debugging
        console.log('ContentAreaManager: Updated content area bounds:', {
          ...newBounds,
          containerWidth: rect.width,
          containerHeight: rect.height,
          timestamp: new Date().toISOString()
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
      
      // For mini-apps in a drawer, we use relative positioning (0,0) within the drawer
      const initialBounds = {
        x: 0, // Position relative to the container
        y: 0, // Position relative to the container
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      }
      
      setContentAreaBounds(initialBounds)
      
      // Log initial bounds for debugging
      console.log('ContentAreaManager: Initial content area bounds:', {
        ...initialBounds,
        containerWidth: rect.width,
        containerHeight: rect.height,
        timestamp: new Date().toISOString()
      })
    }
    
    // Add window resize event listener for additional resize handling
    const handleWindowResize = () => {
      if (contentAreaRef.current) {
        const rect = contentAreaRef.current.getBoundingClientRect()
        
        // For mini-apps in a drawer, we use relative positioning (0,0) within the drawer
        const resizeBounds = {
          x: 0, // Position relative to the container
          y: 0, // Position relative to the container
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }
        
        setContentAreaBounds(resizeBounds)
        
        // Log resize bounds for debugging
        console.log('ContentAreaManager: Window resize content area bounds:', {
          ...resizeBounds,
          containerWidth: rect.width,
          containerHeight: rect.height,
          timestamp: new Date().toISOString()
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
        // CRITICAL: Set absolute positioning for drawer contents to ensure proper alignment
        // This ensures proper positioning within the drawer, respecting navbar and sidebar
        position: 'absolute',
        left: '0',
        top: '0',
        right: '0',
        bottom: '0',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        // Ensure content is scrollable when necessary
        overflowY: 'auto',
        // Ensure no margin or padding that might affect positioning
        margin: 0,
        padding: 0,
        // Ensure proper box sizing
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