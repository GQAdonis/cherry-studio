import React, { useEffect, useState } from 'react';
import { MiniAppConfig } from '../../types/miniapp';
import { miniAppManager } from '../../utils/miniAppManager';
import { MiniAppLauncher } from './MiniAppLauncher';
import { DEFAULT_MINI_APPS } from '../../types/miniapp';

interface MiniAppListProps {
  /**
   * Callback when a mini-app is launched
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
 * Component for displaying a list of available mini-apps
 * This component renders a grid of mini-app launchers
 */
export const MiniAppList: React.FC<MiniAppListProps> = ({
  onLaunch,
  className = '',
  style = {}
}) => {
  const [miniApps, setMiniApps] = useState<MiniAppConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMiniApps = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // In a real app, we would fetch the mini-app configurations from the backend
        // For now, we'll use the default mini-apps from the types file
        const configs = await miniAppManager.getAllMiniAppConfigs();
        
        // If no configs are returned, use the default mini-apps
        if (configs.length === 0) {
          // Register the default mini-apps
          for (const app of DEFAULT_MINI_APPS) {
            await miniAppManager.registerMiniApp(app);
          }
          setMiniApps(DEFAULT_MINI_APPS);
        } else {
          setMiniApps(configs);
        }
      } catch (err) {
        setError(`Failed to load mini-apps: ${err}`);
        // Fallback to default mini-apps
        setMiniApps(DEFAULT_MINI_APPS);
      } finally {
        setIsLoading(false);
      }
    };

    loadMiniApps();
  }, []);

  if (isLoading) {
    return (
      <div
        className={`mini-app-list-loading ${className}`}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px',
          ...style
        }}
      >
        <div>Loading mini-apps...</div>
      </div>
    );
  }

  if (error && miniApps.length === 0) {
    return (
      <div
        className={`mini-app-list-error ${className}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px',
          ...style
        }}
      >
        <div style={{ color: '#cc0000', marginBottom: '8px' }}>Error</div>
        <div>{error}</div>
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
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      className={`mini-app-list ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: '16px',
        padding: '16px',
        ...style
      }}
    >
      {miniApps.map((app) => (
        <MiniAppLauncher
          key={app.id}
          app={app}
          onLaunch={onLaunch}
          className="mini-app-list-item"
        />
      ))}

      {miniApps.length === 0 && (
        <div
          className="mini-app-list-empty"
          style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '24px',
            color: '#666'
          }}
        >
          No mini-apps available
        </div>
      )}
    </div>
  );
};