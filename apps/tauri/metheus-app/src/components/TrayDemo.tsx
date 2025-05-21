import { useState, useEffect } from "react";
import { invoke, listen } from "../utils/tauri";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function TrayDemo() {
  const [launchToTray, setLaunchToTray] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  // Initialize state from Rust backend
  useEffect(() => {
    const initTraySettings = async () => {
      try {
        const launchToTray = await invoke("get_launch_to_tray");
        setLaunchToTray(!!launchToTray);
      } catch (error) {
        console.error("Failed to get tray settings:", error);
      }
    };

    initTraySettings();

    // Listen for tray setting changes from the system tray menu
    const unlistenTraySettings = listen("tray-setting-changed", (event) => {
      const { launch_to_tray } = event.payload as { launch_to_tray: boolean };
      setLaunchToTray(launch_to_tray);
    });

    // Listen for theme changes
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
      updateTrayIcon(e.matches);
    };
    
    darkModeMediaQuery.addEventListener('change', handleThemeChange);
    
    // Update tray icon on initial load
    updateTrayIcon(isDarkMode);

    return () => {
      unlistenTraySettings.then(unlisten => unlisten());
      darkModeMediaQuery.removeEventListener('change', handleThemeChange);
    };
  }, []);

  // Update the tray icon when the theme changes
  const updateTrayIcon = async (isDark: boolean) => {
    try {
      await invoke("update_tray_icon", { isDarkMode: isDark });
    } catch (error) {
      console.error("Failed to update tray icon:", error);
    }
  };

  // Toggle the launch to tray setting
  const toggleLaunchToTray = async () => {
    try {
      const newValue = !launchToTray;
      await invoke("set_launch_to_tray", { value: newValue });
      setLaunchToTray(newValue);
    } catch (error) {
      console.error("Failed to set launch to tray:", error);
    }
  };

  // Show the main window
  const showWindow = async () => {
    try {
      await invoke("show_main_window");
    } catch (error) {
      console.error("Failed to show window:", error);
    }
  };

  // Hide the main window
  const hideWindow = async () => {
    try {
      await invoke("hide_main_window");
    } catch (error) {
      console.error("Failed to hide window:", error);
    }
  };

  return (
    <div className="bg-card p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-2xl font-semibold mb-4">System Tray Demo</h2>
      <div className="flex flex-col space-y-4">
        <div className="flex items-center space-x-4">
          <Switch
            id="launch-to-tray"
            checked={launchToTray}
            onCheckedChange={toggleLaunchToTray}
          />
          <Label htmlFor="launch-to-tray">Launch to Tray</Label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={showWindow} variant="default">
            Show Window
          </Button>
          <Button onClick={hideWindow} variant="secondary">
            Hide Window (Minimize to Tray)
          </Button>
        </div>

        <div className="mt-4 p-4 bg-muted rounded-md">
          <h3 className="text-lg font-medium mb-2">Current Theme</h3>
          <p>
            {isDarkMode ? "Dark Mode" : "Light Mode"} - Tray icon will adapt to theme
          </p>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          <p>
            The system tray icon is located in your system tray/menu bar. Click it to
            toggle the window visibility, or right-click for more options.
          </p>
        </div>
      </div>
    </div>
  );
}
