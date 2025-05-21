import React, { useState } from "react";
import { SettingsPanel } from "./SettingsPanel";
import { Button } from "@/components/ui/button";
import { settingsManager } from "@/utils/settingsManager";

/**
 * A demo component for showcasing the settings functionality
 */
export function SettingsDemo() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<string | null>(null);
  
  // Toggle the settings panel
  const toggleSettings = () => {
    setIsOpen(!isOpen);
  };
  
  // Load current settings for display
  const loadCurrentSettings = async () => {
    setIsLoading(true);
    try {
      // Initialize the settings manager if needed
      await settingsManager.initialize();
      
      // Get the current theme and language settings
      const theme = await settingsManager.getSetting<string>("general.theme", "system");
      const language = await settingsManager.getSetting<string>("general.language", "en");
      
      setCurrentTheme(theme);
      setCurrentLanguage(language);
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load settings when the component mounts
  React.useEffect(() => {
    loadCurrentSettings();
  }, []);
  
  // Reload settings when the settings panel is closed
  React.useEffect(() => {
    if (!isOpen) {
      loadCurrentSettings();
    }
  }, [isOpen]);
  
  return (
    <div className="bg-card p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-2xl font-semibold mb-4">Settings Management Demo</h2>
      
      <div className="mb-6">
        <p className="mb-2">
          This demo showcases the settings management functionality. You can view and edit settings,
          save them to disk, and reset them to their default values.
        </p>
        
        <div className="flex flex-col md:flex-row md:items-center gap-4 mt-4">
          <Button onClick={toggleSettings}>
            {isOpen ? "Close Settings" : "Open Settings"}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={loadCurrentSettings}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Reload Settings"}
          </Button>
        </div>
      </div>
      
      <div className="bg-muted p-4 rounded-md mb-6">
        <h3 className="text-lg font-medium mb-2">Current Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="font-medium">Theme:</p>
            <p>{currentTheme || "Loading..."}</p>
          </div>
          <div>
            <p className="font-medium">Language:</p>
            <p>{currentLanguage || "Loading..."}</p>
          </div>
        </div>
      </div>
      
      {isOpen && (
        <div className="border rounded-lg overflow-hidden">
          <SettingsPanel />
        </div>
      )}
    </div>
  );
}