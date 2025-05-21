import React from "react";
import { Button } from "@/components/ui/button";
import { Globe, Map, Plus } from "lucide-react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { WebsiteMapItem } from "@/stores/useKnowledgeBaseStore";

interface WebsitesSectionProps {
  websiteMaps: WebsiteMapItem[];
  handleAddWebsiteMap: () => void;
}

const WebsitesSection: React.FC<WebsitesSectionProps> = ({
  websiteMaps,
  handleAddWebsiteMap
}) => {
  return (
    <div>
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Globe size={18} className="text-blue-400" />
          <h3 className="font-medium">Websites</h3>
          <span className="bg-slate-900 text-gray-400 text-xs py-0.5 px-2 rounded-full">{websiteMaps.length}</span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-md text-sm flex items-center gap-1"
                onClick={handleAddWebsiteMap}
              >
                <Plus size={16} />
                <span>Add Website Map</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add a website map to knowledge base</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="p-4 text-gray-500">
        {websiteMaps.length > 0 ? (
          <ul className="divide-y divide-gray-700">
            {websiteMaps.map((mapItem, index) => (
              <li key={index} className="py-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Map size={16} className="text-blue-400" />
                  <a href={mapItem.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                    {mapItem.url}
                  </a>
                </div>
                <span className="text-xs text-gray-500">{mapItem.timestamp}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center">No data</div>
        )}
      </div>
    </div>
  );
};

export default WebsitesSection;