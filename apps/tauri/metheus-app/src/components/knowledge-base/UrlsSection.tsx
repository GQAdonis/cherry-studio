import React from "react";
import { Button } from "@/components/ui/button";
import { Link, Globe, Plus } from "lucide-react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { UrlItem } from "@/stores/useKnowledgeBaseStore";

interface UrlsSectionProps {
  urls: UrlItem[];
  handleAddUrl: () => void;
}

const UrlsSection: React.FC<UrlsSectionProps> = ({ urls, handleAddUrl }) => {
  return (
    <div>
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Link size={18} className="text-yellow-400" />
          <h3 className="font-medium">URLs</h3>
          <span className="bg-slate-900 text-gray-400 text-xs py-0.5 px-2 rounded-full">{urls.length}</span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-md text-sm flex items-center gap-1"
                onClick={handleAddUrl}
              >
                <Plus size={16} />
                <span>Add URL</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add a URL to knowledge base</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="p-4 text-gray-500">
        {urls.length > 0 ? (
          <ul className="divide-y divide-gray-700">
            {urls.map((urlItem, index) => (
              <li key={index} className="py-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Globe size={16} className="text-yellow-400" />
                  <a href={urlItem.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                    {urlItem.url}
                  </a>
                </div>
                <span className="text-xs text-gray-500">{urlItem.timestamp}</span>
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

export default UrlsSection;