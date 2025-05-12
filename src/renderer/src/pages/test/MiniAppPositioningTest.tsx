import React, { useState, useEffect, useRef } from 'react'
import ContentAreaManager from '../../components/ContentAreaManager'
import WebContentsViewContainer from '../../components/MinApp/WebContentsViewContainer'
import './MiniAppPositioningTest.css'

/**
 * MiniAppPositioningTest component
 * 
 * This component is used to test mini-app positioning across different viewport sizes.
 * It demonstrates proper positioning of mini-apps within the content area,
 * ensuring they are positioned exactly 26px from the left edge and 41px from the top edge.
 * 
 * Features:
 * - Controls to resize the window to predefined dimensions
 * - Visual indicators for the 26px left and 41px top margins
 * - Logging of the current bounds of the mini-app
 * - Testing with multiple mini-apps to ensure consistent behavior
 */
const MiniAppPositioningTest: React.FC = () => {
  // State for showing/hiding visual indicators
  const [showBoundaries, setShowBoundaries] = useState(true)
  // State for showing/hiding bounds information
  const [showBoundsInfo, setShowBoundsInfo] = useState(true)
  // State for the current active mini-app
  const [activeMiniApp, setActiveMiniApp] = useState(0)
  
  // Reference to the bounds info element for scrolling
  const boundsInfoRef = useRef<HTMLDivElement>(null)
  
  // Define mini-apps for testing
  const miniApps = [
    {
      appid: 'test.miniapp',
      url: 'http://localhost:3000/test-miniapp.html',
      name: 'Test Mini App',
      ref: null as any
    },
    {
      appid: 'bolt.diy',
      url: 'file:///Users/gqadonis/Projects/prometheus/cherry-studio/resources/miniapps/bolt.diy.html',
      name: 'Bolt DIY',
      ref: null as any
    },
    {
      appid: 'dify',
      url: 'http://localhost:5001',
      name: 'Dify',
      ref: null as any
    }
  ]
  
  // State for mini-app bounds information
  const [boundsInfo, setBoundsInfo] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    timestamp: string;
  }>({
    x: 26,
    y: 41,
    width: 0,
    height: 0,
    timestamp: new Date().toISOString()
  })
  
  // State for bounds history to track changes
  const [boundsHistory, setBoundsHistory] = useState<Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    timestamp: string;
  }>>([])
  
  // Handle window resize for testing
  useEffect(() => {
    const handleResize = () => {
      const newBoundsInfo = {
        x: boundsInfo.x,
        y: boundsInfo.y,
        width: window.innerWidth - boundsInfo.x,
        height: window.innerHeight - boundsInfo.y,
        timestamp: new Date().toISOString()
      }
      
      setBoundsInfo(newBoundsInfo)
      setBoundsHistory(prev => [...prev, newBoundsInfo])
      
      console.log('Window resized:', {
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        contentAreaWidth: window.innerWidth - boundsInfo.x,
        contentAreaHeight: window.innerHeight - boundsInfo.y,
        leftOffset: boundsInfo.x,
        topOffset: boundsInfo.y
      })
    }
    
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [boundsInfo.x, boundsInfo.y])
  
  // Scroll to the bottom of the bounds info when new entries are added
  useEffect(() => {
    if (boundsInfoRef.current && boundsHistory.length > 0) {
      boundsInfoRef.current.scrollTop = boundsInfoRef.current.scrollHeight
    }
  }, [boundsHistory])
  
  // Handle reference callback from WebContentsViewContainer
  const handleSetRef = (appid: string, element: any | null) => {
    console.log('Ref set for', appid, element)
    const updatedMiniApps = [...miniApps]
    const index = updatedMiniApps.findIndex(app => app.appid === appid)
    if (index !== -1) {
      updatedMiniApps[index].ref = element
    }
  }
  
  // Handle loaded callback from WebContentsViewContainer
  const handleLoaded = (appid: string) => {
    console.log('Mini app loaded:', appid)
  }
  
  // Handle navigation callback from WebContentsViewContainer
  const handleNavigate = (appid: string, url: string) => {
    console.log('Mini app navigated:', appid, url)
    const updatedMiniApps = [...miniApps]
    const index = updatedMiniApps.findIndex(app => app.appid === appid)
    if (index !== -1) {
      updatedMiniApps[index].url = url
    }
  }
  
  // Resize window to specific dimensions for testing
  const resizeWindow = (width: number, height: number) => {
    try {
      // Use window.resizeTo if available (in Electron this should work)
      if (window.resizeTo) {
        window.resizeTo(width, height)
        
        // Add a new entry to the bounds history
        const newBoundsInfo = {
          x: boundsInfo.x,
          y: boundsInfo.y,
          width: width - boundsInfo.x,
          height: height - boundsInfo.y,
          timestamp: new Date().toISOString()
        }
        
        setBoundsInfo(newBoundsInfo)
        setBoundsHistory(prev => [...prev, {
          ...newBoundsInfo,
          timestamp: new Date().toISOString()
        }])
        
        console.log('Window resized to:', {
          width,
          height,
          contentAreaWidth: width - boundsInfo.x,
          contentAreaHeight: height - boundsInfo.y,
          leftOffset: boundsInfo.x,
          topOffset: boundsInfo.y
        })
      } else if (window.api && window.api.window) {
        // Fallback to any available API methods
        console.log('Attempting to resize window using available API methods')
      } else {
        console.warn('Window resize API not available')
      }
    } catch (error) {
      console.error('Error resizing window:', error)
    }
  }
  
  // Open DevTools for the mini-app
  const openDevTools = () => {
    const currentApp = miniApps[activeMiniApp]
    if (currentApp.ref && currentApp.ref.openDevTools) {
      currentApp.ref.openDevTools()
    } else {
      console.warn('Cannot open DevTools, reference not available')
    }
  }
  
  // Clear bounds history
  const clearBoundsHistory = () => {
    setBoundsHistory([])
  }
  
  // Switch to a different mini-app
  const switchMiniApp = (index: number) => {
    if (index >= 0 && index < miniApps.length) {
      setActiveMiniApp(index)
    }
  }
  
  return (
    <div className="mini-app-positioning-test">
      <h1 className="test-page-title">Mini App Positioning Test</h1>
      
      <ContentAreaManager>
        {/* Visual indicators for content area boundaries */}
        {showBoundaries && (
          <div className="content-area-boundaries">
            <div className="boundary-left" title="Left boundary (26px)">
              <div className="boundary-label">26px</div>
            </div>
            <div className="boundary-top" title="Top boundary (41px)">
              <div className="boundary-label">41px</div>
            </div>
            <div className="boundary-right" title="Right boundary"></div>
            <div className="boundary-bottom" title="Bottom boundary"></div>
            
            {/* Ruler guides */}
            <div className="ruler-horizontal"></div>
            <div className="ruler-vertical"></div>
          </div>
        )}
        
        {/* Test mini-app */}
        <WebContentsViewContainer
          appid={miniApps[activeMiniApp].appid}
          url={miniApps[activeMiniApp].url}
          onSetRefCallback={handleSetRef}
          onLoadedCallback={handleLoaded}
          onNavigateCallback={handleNavigate}
        />
        
        {/* Controls */}
        <div className="test-controls">
          <div className="control-group">
            <h3>Boundary Controls</h3>
            <button 
              onClick={() => setShowBoundaries(!showBoundaries)}
              className={showBoundaries ? 'active' : ''}
            >
              {showBoundaries ? 'Hide' : 'Show'} Boundaries
            </button>
            <button 
              onClick={() => setShowBoundsInfo(!showBoundsInfo)}
              className={showBoundsInfo ? 'active' : ''}
            >
              {showBoundsInfo ? 'Hide' : 'Show'} Bounds Info
            </button>
          </div>
          
          <div className="control-group">
            <h3>Mini App Selection</h3>
            {miniApps.map((app, index) => (
              <button 
                key={app.appid}
                onClick={() => switchMiniApp(index)}
                className={activeMiniApp === index ? 'active' : ''}
              >
                {app.name}
              </button>
            ))}
          </div>
          
          <div className="control-group">
            <h3>Window Size Controls</h3>
            <button onClick={() => resizeWindow(800, 600)}>
              Resize Window to 800x600
            </button>
            <button onClick={() => resizeWindow(1024, 768)}>
              Resize Window to 1024x768
            </button>
            <button onClick={() => resizeWindow(1280, 800)}>
              Resize Window to 1280x800
            </button>
            <button onClick={() => resizeWindow(1440, 900)}>
              Resize Window to 1440x900
            </button>
            <button onClick={() => resizeWindow(1920, 1080)}>
              Resize Window to 1920x1080
            </button>
          </div>
          
          <div className="control-group">
            <h3>Debug Controls</h3>
            <button onClick={openDevTools}>
              Open DevTools
            </button>
            <button onClick={clearBoundsHistory}>
              Clear Bounds History
            </button>
          </div>
          
          <div className="control-group">
            <h3>Current Mini App Info</h3>
            <div className="info-item">
              <strong>App ID:</strong> {miniApps[activeMiniApp].appid}
            </div>
            <div className="info-item">
              <strong>URL:</strong> {miniApps[activeMiniApp].url}
            </div>
            <div className="info-item">
              <strong>Status:</strong> {miniApps[activeMiniApp].ref ? 'Loaded' : 'Loading...'}
            </div>
          </div>
          
          <div className="control-group">
            <h3>Current Bounds</h3>
            <div className="info-item">
              <strong>Left:</strong> {boundsInfo.x}px
            </div>
            <div className="info-item">
              <strong>Top:</strong> {boundsInfo.y}px
            </div>
            <div className="info-item">
              <strong>Width:</strong> {boundsInfo.width}px
            </div>
            <div className="info-item">
              <strong>Height:</strong> {boundsInfo.height}px
            </div>
          </div>
        </div>
        
        {/* Bounds history panel */}
        {showBoundsInfo && (
          <div className="bounds-info-panel" ref={boundsInfoRef}>
            <h3>Bounds History</h3>
            {boundsHistory.length === 0 ? (
              <div className="no-history">No bounds history yet. Resize the window to see changes.</div>
            ) : (
              boundsHistory.map((bounds, index) => (
                <div key={index} className="bounds-history-item">
                  <div className="bounds-timestamp">{new Date(bounds.timestamp).toLocaleTimeString()}</div>
                  <div className="bounds-values">
                    <span>Left: {bounds.x}px</span>
                    <span>Top: {bounds.y}px</span>
                    <span>Width: {bounds.width}px</span>
                    <span>Height: {bounds.height}px</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </ContentAreaManager>
    </div>
  )
}

export default MiniAppPositioningTest