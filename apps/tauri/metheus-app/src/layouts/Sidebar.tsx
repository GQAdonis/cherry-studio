import React from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Home, MessageSquare, Database,
  Grid, Settings, Folder, ChevronLeft, ChevronRight,
  Users, BookOpen, Layout, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  expanded: boolean;
  onToggle: () => void;
}

interface NavItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  expanded: boolean;
}

const NavItem = ({ 
  to, 
  icon: Icon,
  label,
  isActive,
  expanded
}: NavItemProps) => {
  return (
    <Link to={to}>
      <div 
        className={cn(
          "flex items-center p-3 rounded-md transition-colors",
          expanded ? "justify-start" : "justify-center",
          isActive 
            ? "bg-slate-700 text-blue-400" 
            : "text-gray-400 hover:bg-slate-700/50 hover:text-white"
        )}
      >
        <Icon size={24} />
        {expanded && <span className="ml-3">{label}</span>}
      </div>
    </Link>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ expanded, onToggle }) => {
  // Use location from react-router to determine active route
  const path = window.location.pathname;

  const navItems = [
    // Original navigation
    { to: "/", icon: Home, label: "Home", id: "home" },
    { to: "/chats", icon: MessageSquare, label: "Chats", id: "chats" },
    { to: "/knowledge-base", icon: Database, label: "Knowledge Base", id: "knowledge-base" },
    { to: "/files", icon: Folder, label: "Files", id: "files" },
    { to: "/mini-apps", icon: Grid, label: "Mini Apps", id: "mini-apps" },
  ];

  const flameNavItems = [
    // Flame Agent Studio navigation
    { to: "/flame/assistants", icon: Users, label: "Assistants", id: "flame-assistants" },
    { to: "/flame/knowledge-base", icon: BookOpen, label: "Knowledge Base", id: "flame-knowledge-base" },
    { to: "/flame/mini-apps", icon: Layout, label: "Mini Apps", id: "flame-mini-apps" },
    { to: "/flame/files", icon: FileText, label: "Files", id: "flame-files" },
  ];

  return (
    <div className={cn(
      "fixed left-0 top-0 h-full bg-slate-800 flex flex-col transition-all duration-300 ease-in-out",
      expanded ? "w-64" : "w-16"
    )}>
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        {expanded && <h2 className="text-xl font-bold text-white">Metheus</h2>}
        <button
          onClick={onToggle}
          className="text-white hover:bg-slate-700 p-2 rounded-md"
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {expanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      <div className="flex flex-col gap-4 mt-8 px-2">
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            to={item.to}
            icon={item.icon}
            label={item.label}
            isActive={path === item.to || path.startsWith(`${item.to}/`)}
            expanded={expanded}
          />
        ))}
        
        {/* Flame Agent Studio Section */}
        {expanded && (
          <div className="mt-6 mb-2 px-3">
            <h3 className="text-xs uppercase text-gray-500 font-semibold">Flame Agent Studio</h3>
          </div>
        )}
        
        {flameNavItems.map((item) => (
          <NavItem
            key={item.id}
            to={item.to}
            icon={item.icon}
            label={item.label}
            isActive={path === item.to || path.startsWith(`${item.to}/`)}
            expanded={expanded}
          />
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-4 px-2 mb-4">
        <NavItem 
          to="/settings" 
          icon={Settings} 
          label="Settings"
          isActive={path.includes("/settings")}
          expanded={expanded}
        />
      </div>
    </div>
  );
};