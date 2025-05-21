/**
 * App.tsx
 * 
 * Main application component for the Tauri app.
 * Integrates all components of the Tauri migration:
 * - Layout components (sidebar, header, content area)
 * - Mini-app management system
 * - File system management
 * - Settings management
 * - CoPilotKit with AG-UI adapter
 */

import React, { useState, useEffect } from "react";
import { createBrowserRouter, RouterProvider, Outlet, useNavigate, useLocation } from "react-router-dom";
import { MainLayout } from "./layouts/MainLayout";
import { MiniAppDemo } from "./components/miniapp/MiniAppDemo";
import { FileSystemDemo } from "./components/file/FileSystemDemo";
import { SettingsDemo } from "./components/settings/SettingsDemo";
import { CopilotProvider } from "./components/copilot/CopilotProvider";
import { CopilotSidebar } from "./components/copilot/CopilotSidebar";
import AgentDemo from "./pages/AgentDemo";
import { Button } from "./components/ui/button";
import { settingsManager } from "./utils/settingsManager";
import { ThemeProvider } from "./hooks/use-theme";
import { Toaster } from "./components/ui/toaster";
import "@copilotkit/react-ui/styles.css";

// Import Flame Agent Studio pages
import Assistants from "./pages/flame/Assistants";
import KnowledgeBase from "./pages/flame/KnowledgeBase";
import MiniApps from "./pages/flame/MiniApps";
import Settings from "./pages/flame/Settings";
import Files from "./pages/flame/Files";

/**
 * AppLayout component
 * Provides the main layout structure for the application
 */
const AppLayout: React.FC = () => {
  const [activeWebviewId] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Load theme setting on mount
  useEffect(() => {
    const loadTheme = async () => {
      await settingsManager.initialize();
    };
    
    loadTheme();
  }, []);

  // Get the current page title based on the location
  const getPageTitle = () => {
    switch (location.pathname) {
      case "/":
        return "Home";
      case "/miniapps":
        return "Mini Apps";
      case "/files":
        return "File System";
      case "/settings":
        return "Settings";
      case "/agents":
        return "Agents";
      case "/flame/assistants":
        return "Assistants";
      case "/flame/knowledge-base":
        return "Knowledge Base";
      case "/flame/mini-apps":
        return "Mini Apps";
      case "/flame/settings":
        return "Settings";
      case "/flame/files":
        return "Files";
      default:
        return "Metheus App";
    }
  };

  return (
    <MainLayout title={getPageTitle()} fullHeight={activeWebviewId !== null}>
      <div className="flex flex-col h-full">
        {/* Navigation tabs */}
        <div className="flex items-center px-4 py-2 border-b border-slate-200 dark:border-slate-700">
          <nav className="flex space-x-2 flex-wrap">
            <Button
              variant={location.pathname === "/" ? "default" : "ghost"}
              onClick={() => navigate("/")}
            >
              Home
            </Button>
            <Button
              variant={location.pathname === "/miniapps" ? "default" : "ghost"}
              onClick={() => navigate("/miniapps")}
            >
              Mini Apps
            </Button>
            <Button
              variant={location.pathname === "/files" ? "default" : "ghost"}
              onClick={() => navigate("/files")}
            >
              Files
            </Button>
            <Button
              variant={location.pathname === "/settings" ? "default" : "ghost"}
              onClick={() => navigate("/settings")}
            >
              Settings
            </Button>
            <Button
              variant={location.pathname === "/agents" ? "default" : "ghost"}
              onClick={() => navigate("/agents")}
            >
              Agents
            </Button>
            
            {/* Flame Agent Studio Navigation */}
            <div className="w-full border-t border-slate-700 my-2 pt-2">
              <span className="text-sm text-slate-400 px-2">Flame Agent Studio</span>
            </div>
            <Button
              variant={location.pathname === "/flame/assistants" ? "default" : "ghost"}
              onClick={() => navigate("/flame/assistants")}
            >
              Assistants
            </Button>
            <Button
              variant={location.pathname === "/flame/knowledge-base" ? "default" : "ghost"}
              onClick={() => navigate("/flame/knowledge-base")}
            >
              Knowledge Base
            </Button>
            <Button
              variant={location.pathname === "/flame/mini-apps" ? "default" : "ghost"}
              onClick={() => navigate("/flame/mini-apps")}
            >
              Mini Apps
            </Button>
            <Button
              variant={location.pathname === "/flame/files" ? "default" : "ghost"}
              onClick={() => navigate("/flame/files")}
            >
              Files
            </Button>
            <Button
              variant={location.pathname === "/flame/settings" ? "default" : "ghost"}
              onClick={() => navigate("/flame/settings")}
            >
              Settings
            </Button>
          </nav>
        </div>
        
        {/* Page content */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>
    </MainLayout>
  );
};

/**
 * HomePage component
 * Landing page with overview and navigation options
 */
const HomePage: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-3xl font-bold mb-4">Welcome to Metheus App</h1>
        <p className="text-lg mb-6">
          This application demonstrates the successful migration from Electron to Tauri,
          integrating all the key components into a cohesive application.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-50 dark:bg-slate-700 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-3">Features</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Mini-app management with WebContentsView</li>
              <li>File system operations</li>
              <li>Settings management</li>
              <li>CoPilotKit integration with Mastra agents</li>
              <li>Responsive layout with sidebar and header</li>
            </ul>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-700 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-3">Getting Started</h2>
            <p className="mb-4">
              Explore the different sections of the application using the navigation tabs above.
            </p>
            <div className="flex flex-col space-y-2">
              <Button onClick={() => navigate("/miniapps")}>
                Explore Mini Apps
              </Button>
              <Button onClick={() => navigate("/files")}>
                Try File System Operations
              </Button>
              <Button onClick={() => navigate("/settings")}>
                Configure Settings
              </Button>
              <Button onClick={() => navigate("/agents")}>
                Interact with Agents
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Create router with routes
const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ThemeProvider>
        <CopilotProvider mastraAgentId="demo-agent" mastraApiUrl="http://localhost:4111">
          <AppLayout />
          <CopilotSidebar />
        </CopilotProvider>
      </ThemeProvider>
    ),
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "miniapps",
        element: <MiniAppDemo />,
      },
      {
        path: "files",
        element: <FileSystemDemo />,
      },
      {
        path: "settings",
        element: <SettingsDemo />,
      },
      {
        path: "agents",
        element: <AgentDemo />,
      },
      // Flame Agent Studio Routes
      {
        path: "flame/assistants",
        element: <Assistants />,
      },
      {
        path: "flame/knowledge-base",
        element: <KnowledgeBase />,
      },
      {
        path: "flame/mini-apps",
        element: <MiniApps />,
      },
      {
        path: "flame/files",
        element: <Files />,
      },
      {
        path: "flame/settings",
        element: <Settings />,
      },
    ],
  },
]);

/**
 * App component
 * Main entry point for the application
 */
function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}

export default App;
