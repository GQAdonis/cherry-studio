import React, { useEffect, useState, useRef } from 'react';
import { MiniAppBounds, MiniAppConfig, MiniAppState } from '../../types/miniapp';
import { miniAppManager } from '../../utils/miniAppManager';

interface MiniAppContainerProps {
  /**
   * The ID of the mini-app to display
   */
  appId: string;
  /**
   * The bounds of the mini-app container
   */
  bounds: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  /**
   * Whether the mini-app is visible
   */
  visible?: boolean;
  /**
   * Callback when the mini-app state changes
   */
  onStateChange?: (appId: string, state: MiniAppState) => void;
}

/**
 * Container component for mini-apps
 * This component manages the lifecycle of a mini-app and renders it in a container
 */
export const MiniAppContainer: React.FC<MiniAppContainerProps> = ({
  appId,
  bounds,
  visible = true,
  onStateChange
}) => {
  const [miniAppConfig, setMiniAppConfig] = useState<MiniAppConfig | null>(null);
  const [miniAppState, setMiniAppState] = useState<MiniAppState>(MiniAppState.NotLoaded);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  // Convert bounds to MiniAppBounds
  const miniAppBounds: MiniAppBounds = {
    x: bounds.left,
    y: bounds.top,
    width: bounds.width,
    height: bounds.height
  };

  // Load mini-app config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await miniAppManager.getMiniAppConfig(appId);
        setMiniAppConfig(config);
      } catch (err) {
        setError(`Failed to load mini-app config: ${err}`);
      }
    };

    loadConfig();
  }, [appId]);

  // Handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!miniAppConfig) return;

      try {
        if (visible) {
          // Check if the mini-app is already loaded
          const state = await miniAppManager.getMiniAppState(appId);
          
          if (!state || state === MiniAppState.NotLoaded) {
            // Load and show the mini-app
            await miniAppManager.loadAndShowMiniApp(appId, miniAppBounds);
          } else if (state === MiniAppState.Loaded) {
            // Just show the mini-app
            await miniAppManager.showMiniApp(appId, miniAppBounds);
          }
        } else {
          // Hide the mini-app
          const state = await miniAppManager.getMiniAppState(appId);
          if (state === MiniAppState.Visible) {
            await miniAppManager.hideMiniApp(appId);
          }
        }
      } catch (err) {
        setError(`Failed to ${visible ? 'show' : 'hide'} mini-app: ${err}`);
      }
    };

    if (!isInitialMount.current) {
      handleVisibilityChange();
    } else {
      isInitialMount.current = false;
    }
  }, [visible, miniAppConfig, appId, miniAppBounds]);

  // Handle bounds changes
  useEffect(() => {
    const handleBoundsChange = async () => {
      if (!miniAppConfig) return;

      try {
        const state = await miniAppManager.getMiniAppState(appId);
        if (state === MiniAppState.Visible) {
          await miniAppManager.showMiniApp(appId, miniAppBounds);
        }
      } catch (err) {
        setError(`Failed to update mini-app bounds: ${err}`);
      }
    };

    if (!isInitialMount.current) {
      handleBoundsChange();
    }
  }, [bounds, miniAppConfig, appId, miniAppBounds]);

  // Subscribe to mini-app state changes
  useEffect(() => {
    const unsubscribe = miniAppManager.onStateChange((id, state) => {
      if (id === appId) {
        setMiniAppState(state);
        if (onStateChange) {
          onStateChange(id, state);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [appId, onStateChange]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      const cleanup = async () => {
        try {
          const state = await miniAppManager.getMiniAppState(appId);
          if (state === MiniAppState.Visible) {
            await miniAppManager.hideMiniApp(appId);
          }
        } catch (err) {
          console.error(`Failed to clean up mini-app: ${err}`);
        }
      };

      cleanup();
    };
  }, [appId]);

  // Render loading state
  if (miniAppState === MiniAppState.Loading) {
    return (
      <div
        ref={containerRef}
        className="mini-app-container loading"
        style={{
          position: 'absolute',
          top: bounds.top,
          left: bounds.left,
          width: bounds.width,
          height: bounds.height,
          display: visible ? 'flex' : 'none',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f5f5f5',
          border: '1px solid #e0e0e0',
          borderRadius: '4px',
          overflow: 'hidden'
        }}
      >
        <div className="loading-spinner">Loading {miniAppConfig?.name || appId}...</div>
      </div>
    );
  }

  // Render error state
  if (error || miniAppState === MiniAppState.Error) {
    return (
      <div
        ref={containerRef}
        className="mini-app-container error"
        style={{
          position: 'absolute',
          top: bounds.top,
          left: bounds.left,
          width: bounds.width,
          height: bounds.height,
          display: visible ? 'flex' : 'none',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#fff0f0',
          border: '1px solid #ffcccc',
          borderRadius: '4px',
          padding: '16px',
          overflow: 'auto'
        }}
      >
        <h3 style={{ color: '#cc0000', marginBottom: '8px' }}>Error</h3>
        <p style={{ color: '#333', textAlign: 'center' }}>
          {error || `Failed to load mini-app: ${appId}`}
        </p>
        <button
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            backgroundColor: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          onClick={async () => {
            setError(null);
            try {
              await miniAppManager.loadAndShowMiniApp(appId, miniAppBounds);
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

  // Render placeholder for the webview
  // The actual webview is managed by the Rust backend
  return (
    <div
      ref={containerRef}
      className="mini-app-container"
      style={{
        position: 'absolute',
        top: bounds.top,
        left: bounds.left,
        width: bounds.width,
        height: bounds.height,
        display: visible ? 'block' : 'none',
        backgroundColor: miniAppConfig?.metadata.ui?.backgroundColor || '#ffffff',
        border: '1px solid #e0e0e0',
        borderRadius: '4px',
        overflow: 'hidden'
      }}
      data-app-id={appId}
      data-app-state={miniAppState}
    />
  );
};