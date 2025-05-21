import { useMemo } from 'react';
import { useMiniAppsStore } from '../stores/useMiniAppsStore';
import { shallow } from 'zustand/shallow';

/**
 * Custom hook that provides an interface to the mini app store
 * 
 * Follows the Component-Hook-Store pattern where components interact
 * with hooks rather than directly with the store.
 * 
 * @returns Object with mini app state and actions
 */
export function useMiniApp() {
  // Select only the specific pieces of state and actions needed
  const {
    apps,
    minimizedApps,
    maximizedApp,
    openApp,
    closeApp,
    minimizeApp,
    maximizeApp,
    restoreApp,
  } = useMiniAppsStore(
    state => ({
      apps: state.apps,
      minimizedApps: state.minimizedApps,
      maximizedApp: state.maximizedApp,
      openApp: state.openApp,
      closeApp: state.closeApp,
      minimizeApp: state.minimizeApp,
      maximizeApp: state.maximizeApp,
      restoreApp: state.restoreApp,
    }),
    shallow
  );
  
  // Derive additional helper functions
  const derivedState = useMemo(() => ({
    // Get app by ID
    getAppById: (appId: string) => apps.find(app => app.id === appId),
    
    // Check if app is minimized
    isMinimized: (appId: string) => minimizedApps.includes(appId),
    
    // Check if app is maximized
    isMaximized: (appId: string) => maximizedApp === appId,
    
    // Count of open apps
    openAppCount: apps.length,
    
    // Count of minimized apps
    minimizedAppCount: minimizedApps.length,
    
    // Check if any app is maximized
    hasMaximizedApp: maximizedApp !== null,
  }), [apps, minimizedApps, maximizedApp]);
  
  return {
    // State
    apps,
    minimizedApps,
    maximizedApp,
    
    // Actions
    openApp,
    closeApp,
    minimizeApp,
    maximizeApp,
    restoreApp,
    
    // Derived state and helpers
    ...derivedState
  };
}