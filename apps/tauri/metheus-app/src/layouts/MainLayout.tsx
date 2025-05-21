import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useLocation } from "react-router-dom";

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  fullHeight?: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  title = "Metheus",
  fullHeight = false 
}) => {
  const location = useLocation();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  
  // Set dynamic title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/") return "Home";
    if (path === "/chats") return "Chats";
    if (path === "/knowledge-base") return "Knowledge Base";
    if (path === "/mini-apps") return "Mini Apps";
    if (path === "/settings") return "Settings";
    if (path === "/files") return "Files";
    if (path === "/flame/assistants") return "Assistants";
    if (path === "/flame/knowledge-base") return "Knowledge Base";
    if (path === "/flame/mini-apps") return "Mini Apps";
    if (path === "/flame/settings") return "Settings";
    if (path === "/flame/files") return "Files";
    return title;
  };

  // Toggle sidebar expansion
  const toggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded);
  };

  // Calculate sidebar width based on expansion state
  const sidebarWidth = sidebarExpanded ? 256 : 64; // 64px when collapsed, 256px when expanded
  
  // Fixed top navigation height
  const topNavHeight = 48;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white">
      <Sidebar expanded={sidebarExpanded} onToggle={toggleSidebar} />
      <div 
        className="transition-all duration-300 ease-in-out"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <Header title={getPageTitle()} />
        <main 
          className={fullHeight ? "h-[calc(100vh-48px)]" : "p-4"}
          style={{ 
            marginTop: `${topNavHeight}px`,
            minHeight: `calc(100vh - ${topNavHeight}px)`,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};