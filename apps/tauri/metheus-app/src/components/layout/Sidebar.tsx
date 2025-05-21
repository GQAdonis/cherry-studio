import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  expanded: boolean;
  onToggle: () => void;
}

/**
 * Sidebar component for the application shell
 * Provides navigation and can be collapsed/expanded
 */
export function Sidebar({ expanded, onToggle }: SidebarProps) {
  // Navigation items
  const navItems = [
    { icon: "🏠", label: "Home", id: "home" },
    { icon: "📝", label: "Notes", id: "notes" },
    { icon: "🔍", label: "Search", id: "search" },
    { icon: "⚙️", label: "Settings", id: "settings" },
  ];

  const [activeItem, setActiveItem] = useState("home");

  return (
    <aside
      className={cn(
        "h-full bg-slate-800 text-white flex flex-col transition-all duration-300 ease-in-out",
        expanded ? "w-64" : "w-16"
      )}
      data-expanded={expanded}
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        {expanded && <h2 className="text-xl font-bold">Metheus</h2>}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="text-white hover:bg-slate-700"
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {expanded ? "◀" : "▶"}
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-2 px-2">
          {navItems.map((item) => (
            <li key={item.id}>
              <Button
                variant={activeItem === item.id ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start text-white hover:bg-slate-700",
                  activeItem === item.id && "bg-slate-700"
                )}
                onClick={() => setActiveItem(item.id)}
              >
                <span className="text-xl mr-2">{item.icon}</span>
                {expanded && <span>{item.label}</span>}
              </Button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-700">
        <Button
          variant="ghost"
          className="w-full justify-start text-white hover:bg-slate-700"
        >
          <span className="text-xl mr-2">👤</span>
          {expanded && <span>Profile</span>}
        </Button>
      </div>
    </aside>
  );
}