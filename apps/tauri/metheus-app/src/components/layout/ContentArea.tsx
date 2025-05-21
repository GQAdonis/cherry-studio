import { ReactNode, useEffect, useRef } from "react";
import { invoke } from "../../utils/tauri";

interface ContentAreaProps {
  children?: ReactNode;
  sidebarWidth: number;
  topNavHeight: number;
  activeWebviewId: string | null;
}

/**
 * ContentArea component for the application shell
 * Provides the main content area where webviews will be displayed
 * Ensures proper positioning of webviews according to mini-app requirements
 */
export function ContentArea({ 
  children, 
  sidebarWidth, 
  topNavHeight, 
  activeWebviewId 
}: ContentAreaProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Calculate bounds based on container size and sidebar/nav dimensions
  const calculateBounds = () => {
    if (contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect();
      return {
        x: sidebarWidth,
        y: topNavHeight,
        width: rect.width,
        height: rect.height,
      };
    }
    // Default bounds if container not found
    return {
      x: sidebarWidth,
      y: topNavHeight,
      width: 800,
      height: 600,
    };
  };

  // Handle resize events to update webview positions
  const handleResize = async () => {
    if (activeWebviewId) {
      try {
        const bounds = calculateBounds();
        await invoke("show_webview", {
          appId: activeWebviewId,
          bounds: bounds,
        });
      } catch (error) {
        console.error("Failed to resize webview:", error);
      }
    }
  };

  // Update webview position when sidebar width, top nav height, or active webview changes
  useEffect(() => {
    handleResize();
  }, [sidebarWidth, topNavHeight, activeWebviewId]);

  // Handle window resize events
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [activeWebviewId]);

  return (
    <div 
      ref={contentRef}
      id="content-area" 
      className="flex-1 overflow-hidden bg-slate-100 dark:bg-slate-900"
      style={{
        marginLeft: `${sidebarWidth}px`,
        marginTop: `${topNavHeight}px`,
        height: `calc(100vh - ${topNavHeight}px)`,
        width: `calc(100vw - ${sidebarWidth}px)`,
      }}
    >
      {children}
    </div>
  );
}
