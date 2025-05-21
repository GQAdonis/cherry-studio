import React from "react";

export const PrometheusLogo: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`relative ${className}`}>
      <img 
        src="/tauri.svg" 
        alt="Metheus Logo" 
        className="w-10 h-10 object-contain" 
      />
    </div>
  );
};

export const PrometheusTextLogo: React.FC<{ className?: string; name?: string }> = ({ 
  className = "", 
  name = "Metheus" 
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img 
        src="/tauri.svg" 
        alt={`${name} Logo`} 
        className="w-8 h-8 object-contain" 
      />
      <span className="font-bold text-xl text-white">{name}</span>
    </div>
  );
};