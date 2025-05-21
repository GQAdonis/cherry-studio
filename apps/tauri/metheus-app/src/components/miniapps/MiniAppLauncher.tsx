import React, { useState } from 'react';
import { MiniApp } from '../../stores/useMiniAppsStore';
import { useMiniApp } from '../../hooks/use-mini-app';
import { miniAppManager } from '../../utils/miniAppManager';

interface MiniAppLauncherProps {
  /**
   * The mini app to launch
   */
  app: MiniApp;
  /**
   * Callback when the mini app is launched
   */
  onLaunch?: (appId: string) => void;
  /**
   * Custom class name
   */
  className?: string;
  /**
   * Custom style
   */
  style?: React.CSSProperties;
}

/**
 * MiniAppLauncher component
 * 
 * Handles launching mini apps
 */
export const MiniAppLauncher: React.FC<MiniAppLauncherProps> = ({
  app,
  onLaunch,
  className = '',
  style = {}
}) => {
  const { openApp } = useMiniApp();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLaunch = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Open the app in the mini app store
      openApp(app);
      
      // Calculate the bounds for the mini-app
      const bounds = miniAppManager.calculateMiniAppBounds({
        top: 41, // Top navigation height
        left: 26, // Left sidebar width
        width: window.innerWidth - 26, // Window width - sidebar width
        height: window.innerHeight - 41 // Window height - top navigation height
      });
      
      // Load and show the mini-app
      await miniAppManager.loadAndShowMiniApp(app.id, bounds);
      
      if (onLaunch) {
        onLaunch(app.id);
      }
    } catch (err) {
      setError(`Failed to launch mini-app: ${err}`);
      console.error('Failed to launch mini-app:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`mini-app-launcher ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px',
        cursor: 'pointer',
        borderRadius: '8px',
        transition: 'background-color 0.2s',
        backgroundColor: 'transparent',
        ...style
      }}
      onClick={handleLaunch}
    >
      <div
        className="mini-app-icon"
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: app.color || '#f5f5f5',
          marginBottom: '8px',
          fontSize: '24px'
        }}
      >
        {app.icon || app.title.charAt(0)}
      </div>
      <div
        className="mini-app-name"
        style={{
          fontSize: '14px',
          fontWeight: 500,
          textAlign: 'center',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {app.title}
      </div>
      
      {isLoading && (
        <div
          className="mini-app-loading"
          style={{
            fontSize: '12px',
            color: '#666',
            marginTop: '4px'
          }}
        >
          Loading...
        </div>
      )}
      
      {error && (
        <div
          className="mini-app-error"
          style={{
            fontSize: '12px',
            color: '#cc0000',
            marginTop: '4px',
            textAlign: 'center'
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

export default MiniAppLauncher;