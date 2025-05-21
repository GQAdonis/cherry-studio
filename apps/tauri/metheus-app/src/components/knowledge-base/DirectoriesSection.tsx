import React from "react";
import { Button } from "@/components/ui/button";
import { Database, FolderPlus, Plus } from "lucide-react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface DirectoriesSectionProps {
  // Props can be added as needed
}

const DirectoriesSection: React.FC<DirectoriesSectionProps> = () => {
  return (
    <div>
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-teal-400" />
          <h3 className="font-medium">Directories</h3>
          <span className="bg-slate-900 text-gray-400 text-xs py-0.5 px-2 rounded-full">1</span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-md text-sm flex items-center gap-1"
              >
                <Plus size={16} />
                <span>Add Directory</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add a directory to knowledge base</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="p-4">
        <div className="bg-slate-900 rounded-md p-3 flex items-center justify-between border border-gray-700">
          <div className="flex items-center gap-2">
            <FolderPlus size={18} className="text-teal-400" />
            <span>My Files</span>
          </div>
          <div className="text-gray-500 text-sm">
            0 items
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirectoriesSection;