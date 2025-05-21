import { Button } from "@/components/ui/button";
import { Window } from "@/utils/tauri";

interface TopNavProps {
  sidebarExpanded: boolean;
}

/**
 * TopNav component for the application shell
 * Provides window controls and application-level actions
 */
export function TopNav({ sidebarExpanded }: TopNavProps) {
  // Handle window control actions
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

  return (
    <header 
      className="h-10 bg-slate-900 text-white flex items-center justify-between border-b border-slate-700"
      style={{ paddingLeft: sidebarExpanded ? "0" : "0" }}
      data-tauri-drag-region
    >
      {/* Left section - App title or breadcrumbs */}
      <div className="flex items-center px-4" data-tauri-drag-region>
        <h1 className="text-sm font-medium">Metheus App</h1>
      </div>

      {/* Center section - Search or context info */}
      <div className="flex-1 flex justify-center" data-tauri-drag-region>
        <div className="max-w-md w-full">
          <input
            type="text"
            placeholder="Search..."
            className="w-full bg-slate-800 text-white px-3 py-1 rounded border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-tauri-drag-region={false}
          />
        </div>
      </div>

      {/* Right section - Window controls and user actions */}
      <div className="flex items-center" data-tauri-drag-region>
        {/* User actions */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-white hover:bg-slate-800"
          data-tauri-drag-region={false}
        >
          <span className="text-lg">⚙️</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-white hover:bg-slate-800"
          data-tauri-drag-region={false}
        >
          <span className="text-lg">🔔</span>
        </Button>

        {/* Window controls */}
        <div className="flex items-center" data-tauri-drag-region={false}>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-slate-700" 
            onClick={handleMinimize}
          >
            <span className="text-lg">_</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-slate-700" 
            onClick={handleMaximize}
          >
            <span className="text-lg">□</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-red-700" 
            onClick={handleClose}
          >
            <span className="text-lg">×</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
