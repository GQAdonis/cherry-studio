import React, { useState, useEffect } from 'react'
import ContentAreaManager from '../../components/ContentAreaManager'
import WebContentsViewContainer from '../../components/MinApp/WebContentsViewContainer'
import './TestMiniAppPage.css'

/**
 * TestMiniAppPage component
 * 
 * This component is used to test and validate the mini-app implementation.
 * It demonstrates proper positioning of mini-apps within the content area
 * and tests browser capabilities like localStorage and IndexedDB.
 */
const TestMiniAppPage: React.FC = () => {
  const [showBoundaries, setShowBoundaries] = useState(true)
  const [miniAppInfo, setMiniAppInfo] = useState<{
    appid: string;
    url: string;
    ref: any | null;
  }>({
    appid: 'test.miniapp',
    url: 'http://localhost:3000/test-miniapp.html',
    ref: null
  })

  // Handle window resize for testing
  useEffect(() => {
    const handleResize = () => {
      console.log('Window resized:', window.innerWidth, window.innerHeight)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Handle reference callback from WebContentsViewContainer
  const handleSetRef = (appid: string, element: any | null) => {
    console.log('Ref set for', appid, element)
    setMiniAppInfo(prev => ({ ...prev, ref: element }))
  }

  // Handle loaded callback from WebContentsViewContainer
  const handleLoaded = (appid: string) => {
    console.log('Mini app loaded:', appid)
  }

  // Handle navigation callback from WebContentsViewContainer
  const handleNavigate = (appid: string, url: string) => {
    console.log('Mini app navigated:', appid, url)
    setMiniAppInfo(prev => ({ ...prev, url }))
  }

  // Resize window to specific dimensions for testing
  const resizeWindow = (width: number, height: number) => {
    try {
      // Use window.resizeTo if available (in Electron this should work)
      if (window.resizeTo) {
        window.resizeTo(width, height)
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
    if (miniAppInfo.ref && miniAppInfo.ref.openDevTools) {
      miniAppInfo.ref.openDevTools()
    } else {
      console.warn('Cannot open DevTools, reference not available')
    }
  }

  return (
    <div className="test-mini-app-page">
      <h1 className="test-page-title">Mini App Test Page</h1>
      
      <ContentAreaManager>
        {/* Visual indicators for content area boundaries */}
        {showBoundaries && (
          <div className="content-area-boundaries">
            <div className="boundary-left" title="Left boundary (sidebar)"></div>
            <div className="boundary-top" title="Top boundary (navigation)"></div>
            <div className="boundary-right" title="Right boundary"></div>
            <div className="boundary-bottom" title="Bottom boundary"></div>
          </div>
        )}
        
        {/* Test mini-app */}
        <WebContentsViewContainer
          appid={miniAppInfo.appid}
          url={miniAppInfo.url}
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
          </div>
          
          <div className="control-group">
            <h3>Debug Controls</h3>
            <button onClick={openDevTools}>
              Open DevTools
            </button>
          </div>
          
          <div className="control-group">
            <h3>Mini App Info</h3>
            <div className="info-item">
              <strong>App ID:</strong> {miniAppInfo.appid}
            </div>
            <div className="info-item">
              <strong>URL:</strong> {miniAppInfo.url}
            </div>
            <div className="info-item">
              <strong>Status:</strong> {miniAppInfo.ref ? 'Loaded' : 'Loading...'}
            </div>
          </div>
        </div>
      </ContentAreaManager>
    </div>
  )
}

export default TestMiniAppPage