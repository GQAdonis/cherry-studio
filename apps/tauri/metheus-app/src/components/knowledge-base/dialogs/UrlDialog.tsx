import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface UrlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  urlInput: string;
  setUrlInput: React.Dispatch<React.SetStateAction<string>>;
  handleUrlSubmit: () => void;
}

const UrlDialog: React.FC<UrlDialogProps> = ({
  open,
  onOpenChange,
  urlInput,
  setUrlInput,
  handleUrlSubmit
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-slate-900 border-gray-700">
        <DialogHeader>
          <DialogTitle>Add URL</DialogTitle>
          <DialogDescription>
            Enter URL to add to knowledge base, multiple URLs separated by Enter
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Textarea
            placeholder="Enter URL, multiple URLs separated by Enter"
            className="min-h-[120px] bg-slate-800 border-gray-700 text-white resize-none"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
          />
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
            onClick={handleUrlSubmit}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UrlDialog;