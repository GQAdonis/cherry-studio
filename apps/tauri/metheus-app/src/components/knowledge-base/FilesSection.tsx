import React, { useRef, DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Upload } from "lucide-react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/use-toast";

interface FilesSectionProps {
  files: File[];
  setFiles: (files: File[]) => void;
  isDragging: boolean;
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;
  openSystemFileSelector: () => void;
}

const FilesSection: React.FC<FilesSectionProps> = ({
  files,
  setFiles,
  isDragging,
  setIsDragging,
  openSystemFileSelector
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFiles = (filesList: FileList) => {
    const newFiles = Array.from(filesList);
    // Create a new array with existing files and new files
    setFiles([...files, ...newFiles]);
    
    toast({
      title: "Files added",
      description: `Added ${newFiles.length} file(s) to your knowledge base.`,
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-blue-400" />
          <h3 className="font-medium">Files</h3>
          <span className="bg-slate-900 text-gray-400 text-xs py-0.5 px-2 rounded-full">{files.length}</span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-md text-sm flex items-center gap-1"
                onClick={openSystemFileSelector}
              >
                <Plus size={16} />
                <span>Add File</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add file to knowledge base</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="p-8 border-b border-gray-700">
        <div 
          className={`border-2 border-dashed ${isDragging ? 'border-blue-500 bg-blue-900/10' : 'border-gray-700'} rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <p className="text-gray-300 mb-2">Drag file here</p>
          <p className="text-gray-500 text-sm mb-4">Support TXT, MD, HTML, PDF, DOCX, PPTX, XLSX, EPUB...</p>
          <Button 
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-md text-sm flex items-center gap-2"
            onClick={openFileSelector}
          >
            <Upload size={16} />
            <span>Upload Files</span>
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
            multiple
            aria-label="File upload"
            title="Upload files"
          />
        </div>
      </div>
      
      <div className="p-4 text-center text-gray-500">
        {files.length > 0 ? (
          <ul className="divide-y divide-gray-700">
            {files.map((file, index) => (
              <li key={index} className="py-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-blue-400" />
                  <span>{file.name}</span>
                </div>
                <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</span>
              </li>
            ))}
          </ul>
        ) : (
          "No data"
        )}
      </div>
    </div>
  );
};

export default FilesSection;