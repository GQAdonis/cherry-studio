import React from 'react';
import { Plus } from 'lucide-react';
import { MiniApp } from '../../stores/useMiniAppsStore';
import MiniAppCard from './MiniAppCard';

interface MiniAppGridProps {
  /**
   * List of mini apps to display
   */
  apps: MiniApp[];
  /**
   * Callback when a mini app is clicked
   */
  onAppClick?: (app: MiniApp) => void;
  /**
   * Callback when the add mini app button is clicked
   */
  onAddClick?: () => void;
  /**
   * Custom class name
   */
  className?: string;
}

/**
 * MiniAppGrid component
 * 
 * Displays a grid of mini app cards
 */
export const MiniAppGrid: React.FC<MiniAppGridProps> = ({
  apps,
  onAppClick,
  onAddClick,
  className = '',
}) => {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4 ${className}`}>
      {apps.map((app) => (
        <MiniAppCard
          key={app.id}
          app={app}
          onClick={onAppClick}
        />
      ))}
      
      <div 
        className="flex flex-col items-center bg-slate-800 rounded-lg p-4 border border-gray-700 border-dashed cursor-pointer hover:border-blue-400 transition-colors"
        onClick={onAddClick}
      >
        <div className="w-16 h-16 rounded-xl bg-slate-900 flex items-center justify-center mb-3">
          <Plus size={24} className="text-blue-400" />
        </div>
        <span className="text-sm text-center text-gray-400">Add Mini App</span>
      </div>
    </div>
  );
};

export default MiniAppGrid;