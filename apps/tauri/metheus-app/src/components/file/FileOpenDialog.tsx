import React, { useState } from "react";
import { FileMetadata, fileManager } from "@/utils/fileManager";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileExplorer } from "./FileExplorer";
import { FolderOpenIcon, XIcon } from "lucide-react";

interface FileOpenDialogProps {
  initialPath?: string;
  onFileOpen?: (file: FileMetadata, content: Uint8Array) => void;
  onCancel?: () => void;
  className?: string;
  title?: string;
  fileTypes?: string[];
}

export const FileOpenDialog: React.FC<FileOpenDialogProps> = ({
  initialPath = "",
  onFileOpen,
  onCancel,
  className,
  title = "Open File",
  fileTypes = [],
}) => {
  const [selectedFile, setSelectedFile] = useState<FileMetadata | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Handle file selection from FileExplorer
  const handleFileSelect = (file: FileMetadata) => {
    // Only allow selecting files, not directories
    if (!file.isDir) {
      // Check if file type is allowed
      if (fileTypes.length > 0) {
        const fileExtension = file.fileType.toLowerCase();
        if (!fileTypes.includes(fileExtension)) {
          setError(`File type not supported. Allowed types: ${fileTypes.join(", ")}`);
          return;
        }
      }
      
      setSelectedFile(file);
      setError(null);
    }
  };

  // Handle open button click
  const handleOpen = async () => {
    if (!selectedFile) {
      setError("Please select a file");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const content = await fileManager.readFile(selectedFile.path);
      
      if (onFileOpen) {
        onFileOpen(selectedFile, content);
      }
    } catch (err) {
      console.error("Error opening file:", err);
      setError(`Failed to open file: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel button click
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className={cn("flex flex-col border rounded-md shadow-lg bg-background", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          <XIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* File Explorer */}
      <div className="flex-1 min-h-[300px]">
        <FileExplorer
          initialPath={initialPath}
          onFileSelect={handleFileSelect}
          className="h-full"
        />
      </div>

      {/* Selected file info */}
      <div className="p-4 border-t">
        <div className="flex items-center">
          <div className="mr-2 text-sm font-medium">Selected file:</div>
          <div className="text-sm truncate flex-1">
            {selectedFile ? selectedFile.name : "No file selected"}
          </div>
        </div>

        {/* File type filter info */}
        {fileTypes.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            Allowed file types: {fileTypes.join(", ")}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-2 text-sm text-red-500">
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end mt-4 space-x-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleOpen} 
            disabled={!selectedFile || loading}
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Opening...
              </div>
            ) : (
              <div className="flex items-center">
                <FolderOpenIcon className="h-4 w-4 mr-2" />
                Open
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FileOpenDialog;