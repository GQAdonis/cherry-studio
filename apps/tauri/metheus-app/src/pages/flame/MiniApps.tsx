import React, { useState, useEffect } from "react";
import { DEFAULT_MINI_APPS, MiniApp } from "../../stores/useMiniAppsStore";
import { useMiniApp } from "../../hooks/use-mini-app";
import MiniAppGrid from "../../components/miniapps/MiniAppGrid";
import MiniAppManager from "../../components/miniapps/MiniAppManager";

/**
 * MiniApps component
 * Displays a grid of available mini applications and manages active mini apps
 */
const MiniApps: React.FC = () => {
  const { openApp } = useMiniApp();
  const [availableApps, setAvailableApps] = useState<MiniApp[]>([]);

  // Initialize available apps
  useEffect(() => {
    setAvailableApps(DEFAULT_MINI_APPS);
  }, []);

  // Handle app click
  const handleAppClick = (app: MiniApp) => {
    openApp(app);
  };

  // Handle add app click
  const handleAddClick = () => {
    // In a real app, this would open a dialog to add a custom mini app
    console.log("Add mini app clicked");
    
    // For now, let's just add a custom app
    const customApp: MiniApp = {
      id: `custom-${Date.now()}`,
      title: "Custom App",
      url: "https://example.com",
      color: "bg-slate-900",
      icon: "",
      type: "keepAlive"
    };
    
    openApp(customApp);
  };

  return (
    <div className="flex flex-col">
      {/* Grid of available mini apps */}
      <MiniAppGrid
        apps={availableApps}
        onAppClick={handleAppClick}
        onAddClick={handleAddClick}
        className="mb-8"
      />
      
      {/* Active mini apps */}
      <MiniAppManager />
    </div>
  );
};

export default MiniApps;