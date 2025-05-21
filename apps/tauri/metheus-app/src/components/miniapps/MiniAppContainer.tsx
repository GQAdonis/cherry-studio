import React, { useEffect, useState, useRef } from 'react';
import { X, Minimize, Maximize } from 'lucide-react';
import { MiniApp } from '../../stores/useMiniAppsStore';
import { useMiniApp } from '../../hooks/use-mini-app';
import { miniAppManager } from '../../utils/miniAppManager';
import { MiniAppBounds, MiniAppState } from '../../types/miniapp';

interface MiniAppContainerProps {
  /**
   * The mini app to display
   */
  app: MiniApp;
  /**
   * Whether the mini app is minimized
   */
  isMinimized?: boolean;
  /**
   * Whether the mini app is maximized
   */
  isMaximized?: boolean;
  /**
   * Custom class name
   */
  className?: string;
}

/**
 * MiniAppContainer component
 * 
 * Container for displaying a mini app with controls for minimize, maximize, and close
 */
export const MiniAppContainer: React.FC<MiniAppContainerProps> = ({
  app,
  isMinimized = false,
  isMaximized = false,
  className = '',
}) => {
  const { closeApp, minimizeApp, maximizeApp, restoreApp } = useMiniApp();
  const [miniAppState, setMiniAppState] = useState<MiniAppState>(MiniAppState.NotLoaded);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  // Calculate bounds based on container position and size
  const calculateBounds = (): MiniAppBounds => {
    if (!containerRef.current) {
      return {
        x: 0,
        y: 0,
        width: 0,
        height: 0
      };
    }

    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    };
  };

  // Handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = async () => {
      try {
        if (!isMinimized) {
          // Check if the mini-app is already loaded
          const state = await miniAppManager.getMiniAppState(app.id);
          
          if (!state || state === MiniAppState.NotLoaded) {
            // Load and show the mini-app
            await miniAppManager.loadAndShowMiniApp(app.id, calculateBounds());
          } else if (state === MiniAppState.Loaded) {
            // Just show the mini-app
            await miniAppManager.showMiniApp(app.id, calculateBounds());
          }
        } else {
          // Hide the mini-app
          const state = await miniAppManager.getMiniAppState(app.id);
          if (state === MiniAppState.Visible) {
            await miniAppManager.hideMiniApp(app.id);
          }
        }
      } catch (err) {
        setError(`Failed to ${isMinimized ? 'hide' : 'show'} mini-app: ${err}`);
      }
    };

    if (!isInitialMount.current) {
      handleVisibilityChange();
    } else {
      isInitialMount.current = false;
    }
  }, [isMinimized, app.id]);

  // Handle bounds changes (e.g., when maximized/restored)
  useEffect(() => {
    const handleBoundsChange = async () => {
      try {
        const state = await miniAppManager.getMiniAppState(app.id);
        if (state === MiniAppState.Visible) {
          await miniAppManager.showMiniApp(app.id, calculateBounds());
        }
      } catch (err) {
        setError(`Failed to update mini-app bounds: ${err}`);
      }
    };

    if (!isInitialMount.current) {
      handleBoundsChange();
    }
  }, [isMaximized, app.id]);

  // Subscribe to mini-app state changes
  useEffect(() => {
    const unsubscribe = miniAppManager.onStateChange((id, state) => {
      if (id === app.id) {
        setMiniAppState(state);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [app.id]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      const cleanup = async () => {
        try {
          const state = await miniAppManager.getMiniAppState(app.id);
          if (state === MiniAppState.Visible) {
            await miniAppManager.hideMiniApp(app.id);
          }
        } catch (err) {
          console.error(`Failed to clean up mini-app: ${err}`);
        }
      };

      cleanup();
    };
  }, [app.id]);

  // Handle close button click
  const handleClose = () => {
    closeApp(app.id);
  };

  // Handle minimize button click
  const handleMinimize = () => {
    minimizeApp(app.id);
  };

  // Handle maximize/restore button click
  const handleMaximizeRestore = () => {
    if (isMaximized) {
      restoreApp(app.id);
    } else {
      maximizeApp(app.id);
    }
  };

  // Render loading state
  if (miniAppState === MiniAppState.Loading) {
    return (
      <div
        ref={containerRef}
        className={`mini-app-container loading ${className}`}
        style={{
          position: 'relative',
          width: '100%',
          height: isMinimized ? '40px' : '400px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '8px',
          overflow: 'hidden',
          transition: 'height 0.3s ease'
        }}
      >
        <div className="loading-spinner">Loading {app.title}...</div>
      </div>
    );
  }

  // Render error state
  if (error || miniAppState === MiniAppState.Error) {
    return (
      <div
        ref={containerRef}
        className={`mini-app-container error ${className}`}
        style={{
          position: 'relative',
          width: '100%',
          height: isMinimized ? '40px' : '400px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '16px',
          overflow: 'auto',
          transition: 'height 0.3s ease'
        }}
      >
        <h3 style={{ color: '#ef4444', marginBottom: '8px' }}>Error</h3>
        <p style={{ color: '#f8fafc', textAlign: 'center' }}>
          {error || `Failed to load mini-app: ${app.id}`}
        </p>
        <button
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          onClick={async () => {
            setError(null);
            try {
              await miniAppManager.loadAndShowMiniApp(app.id, calculateBounds());
            } catch (err) {
              setError(`Failed to reload mini-app: ${err}`);
            }
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`mini-app-container ${className}`}
      style={{
        position: isMaximized ? 'fixed' : 'relative',
        top: isMaximized ? 0 : 'auto',
        left: isMaximized ? 0 : 'auto',
        right: isMaximized ? 0 : 'auto',
        bottom: isMaximized ? 0 : 'auto',
        width: isMaximized ? '100%' : '100%',
        height: isMinimized ? '40px' : (isMaximized ? '100vh' : '400px'),
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        zIndex: isMaximized ? 50 : 'auto',
        transition: 'height 0.3s ease'
      }}
      data-app-id={app.id}
      data-app-state={miniAppState}
    >
      {/* Header with controls */}
      <div 
        className="mini-app-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          backgroundColor: '#0f172a',
          borderBottom: isMinimized ? 'none' : '1px solid #334155'
        }}
      >
        <div className="mini-app-title" style={{ fontWeight: 500 }}>{app.title}</div>
        <div className="mini-app-controls" style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleMinimize}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
            aria-label="Minimize"
          >
            <Minimize size={16} />
          </button>
          <button
            onClick={handleMaximizeRestore}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
            aria-label={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
          <button
            onClick={handleClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content area - this is a placeholder for the webview */}
      {!isMinimized && (
        <div 
          className="mini-app-content"
          style={{
            flex: 1,
            position: 'relative'
          }}
        />
      )}
    </div>
  );
};

export default MiniAppContainer;