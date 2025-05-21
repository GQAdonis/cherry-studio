import React, { useState, useEffect } from 'react';
import { useMiniApp } from '../../hooks/use-mini-app';
import MiniAppContainer from './MiniAppContainer';

interface MiniAppManagerProps {
  /**
   * Custom class name
   */
  className?: string;
}

/**
 * MiniAppManager component
 * 
 * Manages the display and lifecycle of multiple mini-apps.
 */
export const MiniAppManager: React.FC<MiniAppManagerProps> = ({
  className = ''
}) => {
  const {
    apps,
    minimizedApps,
    maximizedApp,
    restoreApp,
  } = useMiniApp();
  
  // Show all apps or only active ones based on screen width
  const [isCompactView, setIsCompactView] = useState(false);
  
  // Update compact view based on screen width
  useEffect(() => {
    const handleResize = () => {
      setIsCompactView(window.innerWidth < 1024);
    };
    
    // Initial check
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  if (apps.length === 0) {
    return null;
  }
  
  return (
    <div className={`mini-app-manager ${className}`}>
      <div className="mini-app-container grid gap-4 p-4">
        {apps.map(app => {
          const isAppMinimized = minimizedApps.includes(app.id);
          const isAppMaximized = maximizedApp === app.id;
          
          // In compact view, only show active apps
          if (isCompactView && isAppMinimized) {
            return null;
          }
          
          return (
            <MiniAppContainer
              key={app.id}
              app={app}
              isMinimized={isAppMinimized}
              isMaximized={isAppMaximized}
              className="mb-4"
            />
          );
        })}
      </div>
      
      {/* Minimized apps bar in compact view */}
      {isCompactView && minimizedApps.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 flex overflow-x-auto p-1 z-30">
          {apps
            .filter(app => minimizedApps.includes(app.id))
            .map(app => (
              <div
                key={app.id}
                className="px-3 py-1 rounded-md bg-slate-800 mx-1 text-sm cursor-pointer hover:bg-slate-700"
                onClick={() => restoreApp(app.id)}
              >
                {app.title}
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default MiniAppManager;