import React, { useEffect, useState } from "react";
import { PrometheusTextLogo } from "../components/PrometheusLogo";
import { Moon, Search, Sun, User, AppWindow, Minus, Square, X } from "lucide-react";
import { useTheme } from "../hooks/use-theme";
import { Window } from "../utils/tauri";

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const { theme, setTheme } = useTheme();
  const [isMaximized, setIsMaximized] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleMinimize = async () => {
    try {
      const appWindow = await Window.getCurrent();
      await appWindow.minimize();
    } catch (error) {
      console.error("Failed to minimize window:", error);
    }
  };

  const handleMaximize = async () => {
    try {
      const appWindow = await Window.getCurrent();
      const isMaximized = await appWindow.isMaximized();
      if (isMaximized) {
        await appWindow.unmaximize();
      } else {
        await appWindow.maximize();
      }
    } catch (error) {
      console.error("Failed to maximize/unmaximize window:", error);
    }
  };

  const handleClose = async () => {
    try {
      const appWindow = await Window.getCurrent();
      await appWindow.close();
    } catch (error) {
      console.error("Failed to close window:", error);
    }
  };

  useEffect(() => {
    const checkMaximized = async () => {
      try {
        const appWindow = await Window.getCurrent();
        const maximized = await appWindow.isMaximized();
        setIsMaximized(maximized);
      } catch (error) {
        console.error("Failed to check window state:", error);
      }
    };

    checkMaximized();

    // Set up an interval to check the maximized state
    const interval = setInterval(checkMaximized, 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="flex items-center justify-between py-2 px-4 bg-slate-900 dark:bg-slate-900 border-b border-slate-700 dark:border-slate-800"
      data-tauri-drag-region
    >
      <div className="flex items-center">
        <div className="flex items-center">
          <PrometheusTextLogo name="Metheus" />
          <AppWindow size={16} className="ml-2 text-blue-400" />
          <span className="ml-1 text-sm text-blue-400">App</span>
        </div>
        <span className="text-gray-400 mx-4">|</span>
        <h1 className="text-xl font-semibold text-white dark:text-white">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800/40 dark:bg-slate-800/40 hover:bg-slate-700 dark:hover:bg-slate-700 transition-colors"
          aria-label={`Toggle theme (currently ${isMaximized ? "maximized" : "normal"})`}
          data-tauri-drag-region={false}
        >
          {theme === "dark" ? 
            <Sun size={16} className="text-yellow-400" /> : 
            <Moon size={16} className="text-blue-400" />
          }
        </button>
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            className="bg-slate-800 dark:bg-slate-800 text-white dark:text-white pl-9 pr-4 py-2 rounded-md border border-slate-700 dark:border-slate-700 focus:outline-none focus:border-blue-500"
            data-tauri-drag-region={false}
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400" size={16} />
        </div>
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <User size={16} className="text-white" />
        </div>
        
        {/* Window Controls */}
        <div className="flex items-center ml-4" data-tauri-drag-region={false}>
          <button 
            onClick={handleMinimize}
            className="w-8 h-8 flex items-center justify-center hover:bg-slate-700/40 transition-colors"
            aria-label="Minimize"
          >
            <Minus size={16} className="text-gray-300" />
          </button>
          <button 
            onClick={handleMaximize}
            className="w-8 h-8 flex items-center justify-center hover:bg-slate-700/40 transition-colors"
            aria-label="Maximize"
          >
            <Square size={14} className="text-gray-300" />
          </button>
          <button 
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-red-500 transition-colors"
            aria-label="Close"
          >
            <X size={16} className="text-gray-300" />
          </button>
        </div>
      </div>
    </div>
  );
};