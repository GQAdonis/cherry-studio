import React from 'react';
import { MiniApp } from '../../stores/useMiniAppsStore';

interface MiniAppCardProps {
  /**
   * The mini app data
   */
  app: MiniApp;
  /**
   * Callback when the mini app is clicked
   */
  onClick?: (app: MiniApp) => void;
  /**
   * Custom class name
   */
  className?: string;
}

/**
 * MiniAppCard component
 * 
 * Displays a card for a mini app with icon and title
 */
export const MiniAppCard: React.FC<MiniAppCardProps> = ({
  app,
  onClick,
  className = '',
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick(app);
    }
  };

  return (
    <div 
      className={`flex flex-col items-center bg-slate-800 rounded-lg p-4 transition-all hover:transform hover:scale-105 cursor-pointer ${className}`}
      onClick={handleClick}
    >
      <div 
        className={`w-16 h-16 rounded-xl flex items-center justify-center mb-3 ${app.color || 'bg-slate-700'}`}
        style={{ backgroundImage: app.icon ? `url(${app.icon})` : undefined }}
      >
        {!app.icon && app.title.substring(0, 1)}
      </div>
      <span className="text-sm text-center">{app.title}</span>
    </div>
  );
};

export default MiniAppCard;