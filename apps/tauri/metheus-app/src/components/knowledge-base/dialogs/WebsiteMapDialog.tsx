import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface WebsiteMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  websiteMapInput: string;
  setWebsiteMapInput: React.Dispatch<React.SetStateAction<string>>;
  handleWebsiteMapSubmit: () => void;
}

const WebsiteMapDialog: React.FC<WebsiteMapDialogProps> = ({
  open,
  onOpenChange,
  websiteMapInput,
  setWebsiteMapInput,
  handleWebsiteMapSubmit
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-slate-900 border-gray-700">
        <DialogHeader>
          <DialogTitle>Website Map</DialogTitle>
          <DialogDescription>
            Enter Website Map URL
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Input
            placeholder="Enter Website Map URL"
            className="bg-slate-800 border-gray-700 text-white"
            value={websiteMapInput}
            onChange={(e) => setWebsiteMapInput(e.target.value)}
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
            onClick={handleWebsiteMapSubmit}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WebsiteMapDialog;