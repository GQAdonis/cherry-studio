import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";

interface NoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
  content: string;
  setContent: React.Dispatch<React.SetStateAction<string>>;
  onSubmit: () => void;
  isEdit?: boolean;
}

const NoteDialog: React.FC<NoteDialogProps> = ({
  open,
  onOpenChange,
  title,
  setTitle,
  content,
  setContent,
  onSubmit,
  isEdit = false
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-slate-900 border-gray-700">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Note" : "Add Note"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update your knowledge base note" : "Create a new note for your knowledge base"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Input
              placeholder="Note Title"
              className="bg-slate-800 border-gray-700 text-white"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <Textarea
              placeholder="Note Content"
              className="min-h-[200px] bg-slate-800 border-gray-700 text-white resize-none"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="border-gray-700 bg-transparent text-white hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button 
            onClick={onSubmit}
            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
          >
            <Save size={16} />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NoteDialog;