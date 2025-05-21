import React from "react";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Edit } from "lucide-react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { NoteItem } from "@/stores/useKnowledgeBaseStore";

interface NotesSectionProps {
  notes: NoteItem[];
  handleAddNote: () => void;
  handleEditNote: (index: number) => void;
}

const NotesSection: React.FC<NotesSectionProps> = ({
  notes,
  handleAddNote,
  handleEditNote
}) => {
  return (
    <div>
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-gray-400" />
          <h3 className="font-medium">Notes</h3>
          <span className="bg-slate-900 text-gray-400 text-xs py-0.5 px-2 rounded-full">{notes.length}</span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-md text-sm flex items-center gap-1"
                onClick={handleAddNote}
              >
                <Plus size={16} />
                <span>Add Note</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add a note to knowledge base</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="p-4 text-gray-500">
        {notes.length > 0 ? (
          <ul className="divide-y divide-gray-700">
            {notes.map((note, index) => (
              <li key={index} className="py-3">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-gray-400" />
                    <span className="font-medium text-gray-300">{note.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleEditNote(index)}
                    >
                      <Edit size={16} className="text-gray-400" />
                    </Button>
                    <span className="text-xs text-gray-500">{note.timestamp}</span>
                  </div>
                </div>
                {note.content && (
                  <div className="pl-6 text-gray-400 text-sm whitespace-pre-wrap">
                    {note.content}
                  </div>
                )}
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

export default NotesSection;