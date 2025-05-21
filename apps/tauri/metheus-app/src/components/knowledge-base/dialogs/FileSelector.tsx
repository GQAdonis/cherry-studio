import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, FolderPlus } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface FileSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addFile: (file: File) => void;
}

const FileSelector: React.FC<FileSelectorProps> = ({ open, onOpenChange, addFile }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-slate-900 border-gray-700">
        <DialogHeader>
          <DialogTitle>Select Files</DialogTitle>
          <DialogDescription>
            Choose files to add to your knowledge base
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="border border-gray-700 rounded-md h-64 overflow-y-auto">
            <div className="p-3 border-b border-gray-700">
              <div className="flex items-center gap-2 text-sm">
                <FolderPlus size={16} className="text-teal-400" />
                <span>Documents</span>
              </div>
            </div>
            <div className="p-3 border-b border-gray-700">
              <div className="flex items-center gap-2 text-sm">
                <FolderPlus size={16} className="text-teal-400" />
                <span>Downloads</span>
              </div>
            </div>
            <div className="p-3 border-b border-gray-700">
              <div className="flex items-center gap-2 text-sm">
                <FolderPlus size={16} className="text-teal-400" />
                <span>Desktop</span>
              </div>
            </div>
            <div className="p-3">
              <div className="flex items-center gap-2 text-sm">
                <FileText size={16} className="text-blue-400" />
                <span>LivePeer.md</span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-gray-700 bg-transparent text-white hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                onOpenChange(false);
                // Simulate selected files
                const mockFile = new File([""], "LivePeer.md", { type: "text/markdown" });
                addFile(mockFile);
                toast({
                  title: "File added",
                  description: "LivePeer.md has been added to your knowledge base.",
                });
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Open
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FileSelector;