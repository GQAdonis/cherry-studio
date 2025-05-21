import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { ContentArea } from "./ContentArea";

interface LayoutProps {
  children?: ReactNode;
  activeWebviewId: string | null;
}

/**
 * Main Layout component for the application shell
 * Combines Sidebar, TopNav, and ContentArea components
 * Manages layout state like sidebar expansion
 */
export function Layout({ children, activeWebviewId }: LayoutProps) {
  // State for sidebar expansion
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  
  // Calculate sidebar width based on expansion state
  const sidebarWidth = sidebarExpanded ? 256 : 64; // 64px when collapsed, 256px when expanded
  
  // Fixed top navigation height
  const topNavHeight = 40;

  // Toggle sidebar expansion
  const toggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-900">
      {/* Sidebar */}
      <div 
        className="fixed left-0 top-0 h-full z-20"
        style={{ width: `${sidebarWidth}px` }}
      >
        <Sidebar expanded={sidebarExpanded} onToggle={toggleSidebar} />
      </div>

      {/* Main content area with top nav and content */}
      <div className="flex flex-col flex-1">
        {/* Top Navigation */}
        <div 
          className="fixed top-0 right-0 z-10"
          style={{ 
            left: `${sidebarWidth}px`,
            height: `${topNavHeight}px` 
          }}
        >
          <TopNav sidebarExpanded={sidebarExpanded} />
        </div>

        {/* Content Area */}
        <ContentArea 
          sidebarWidth={sidebarWidth} 
          topNavHeight={topNavHeight}
          activeWebviewId={activeWebviewId}
        >
          {children}
        </ContentArea>
      </div>
    </div>
  );
}