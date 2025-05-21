import React from "react";
import { MessageSquare, FileText, RefreshCcw } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "../../../components/ui/tooltip";
import { Document } from "./types";

interface ChatHeaderProps {
  currentTopic: string;
  attachedDocuments: Document[];
  handleRegenerateResponse: () => void;
  messagesLength: number;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  currentTopic,
  attachedDocuments,
  handleRegenerateResponse,
  messagesLength,
}) => {
  return (
    <div className="p-4 border-b border-gray-800 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <MessageSquare size={18} className="text-blue-400" />
        <h2 className="font-medium text-white">{currentTopic}</h2>
      </div>
      
      <div className="flex items-center gap-2">
        {attachedDocuments.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <FileText size={16} />
                <span>{attachedDocuments.length} Document{attachedDocuments.length !== 1 ? 's' : ''}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0">
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-medium">Attached Documents</h3>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {attachedDocuments.map(doc => (
                  <div key={doc.id} className="p-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
                    <h4 className="font-medium text-sm">{doc.title}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{doc.preview}</p>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleRegenerateResponse}
                disabled={messagesLength <= 1}
              >
                <RefreshCcw size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Regenerate response</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default ChatHeader;