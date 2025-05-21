import React, { useState } from 'react';
import { MiniAppContainer } from './MiniAppContainer';
import { MiniAppList } from './MiniAppList';
import { MiniAppState } from '../../types/miniapp';

/**
 * Demo component for mini-apps
 * This component demonstrates how to use the mini-app components
 */
export const MiniAppDemo: React.FC = () => {
  const [activeMiniAppId, setActiveMiniAppId] = useState<string | null>(null);
  const [miniAppStates, setMiniAppStates] = useState<Record<string, MiniAppState>>({});

  // Calculate the content area bounds
  // In a real app, you would calculate this based on the actual layout
  const contentAreaBounds = {
    top: 41, // Top navigation height
    left: 26, // Left sidebar width
    width: window.innerWidth - 26, // Window width - sidebar width
    height: window.innerHeight - 41 // Window height - top navigation height
  };

  // Handle mini-app launch
  const handleMiniAppLaunch = (appId: string) => {
    setActiveMiniAppId(appId);
  };

  // Handle mini-app state change
  const handleMiniAppStateChange = (appId: string, state: MiniAppState) => {
    setMiniAppStates((prevStates) => ({
      ...prevStates,
      [appId]: state
    }));
  };

  return (
    <div className="mini-app-demo">
      {/* Mini-app list */}
      <div
        className="mini-app-demo-sidebar"
        style={{
          position: 'fixed',
          top: '41px',
          left: '0',
          width: '250px',
          height: 'calc(100vh - 41px)',
          backgroundColor: '#f5f5f5',
          borderRight: '1px solid #e0e0e0',
          overflowY: 'auto',
          zIndex: 10
        }}
      >
        <h2
          style={{
            padding: '16px',
            margin: '0',
            fontSize: '18px',
            fontWeight: 500,
            borderBottom: '1px solid #e0e0e0'
          }}
        >
          Mini Apps
        </h2>
        <MiniAppList onLaunch={handleMiniAppLaunch} />
      </div>

      {/* Mini-app container */}
      <div
        className="mini-app-demo-content"
        style={{
          position: 'fixed',
          top: '41px',
          left: '250px',
          width: 'calc(100vw - 250px)',
          height: 'calc(100vh - 41px)',
          backgroundColor: '#ffffff',
          overflow: 'hidden'
        }}
      >
        {activeMiniAppId ? (
          <MiniAppContainer
            appId={activeMiniAppId}
            bounds={{
              top: 0,
              left: 0,
              width: contentAreaBounds.width - 250 + contentAreaBounds.left,
              height: contentAreaBounds.height
            }}
            visible={true}
            onStateChange={handleMiniAppStateChange}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              padding: '24px',
              textAlign: 'center'
            }}
          >
            <h3 style={{ marginBottom: '16px' }}>Welcome to Mini Apps</h3>
            <p style={{ maxWidth: '500px', color: '#666' }}>
              Select a mini-app from the sidebar to get started. Mini-apps are lightweight
              applications that run within the main application.
            </p>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div
        className="mini-app-demo-status"
        style={{
          position: 'fixed',
          bottom: '0',
          left: '250px',
          width: 'calc(100vw - 250px)',
          height: '24px',
          backgroundColor: '#f5f5f5',
          borderTop: '1px solid #e0e0e0',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          fontSize: '12px',
          color: '#666'
        }}
      >
        {activeMiniAppId ? (
          <div>
            Active Mini-App: {activeMiniAppId} - Status:{' '}
            {miniAppStates[activeMiniAppId] || 'Unknown'}
          </div>
        ) : (
          <div>No active mini-app</div>
        )}
      </div>
    </div>
  );
};