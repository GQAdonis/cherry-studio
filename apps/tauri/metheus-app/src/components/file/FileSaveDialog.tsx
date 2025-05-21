import React, { useState, useEffect } from "react";
import { FileMetadata, fileManager } from "@/utils/fileManager";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileExplorer } from "./FileExplorer";
import { SaveIcon, XIcon } from "lucide-react";

interface FileSaveDialogProps {
  initialPath?: string;
  defaultFileName?: string;
  fileContent: string | Uint8Array;
  onSave?: (path: string) => void;
  onCancel?: () => void;
  className?: string;
  title?: string;
}

export const FileSaveDialog: React.FC<FileSaveDialogProps> = ({
  initialPath = "",
  defaultFileName = "untitled.txt",
  fileContent,
  onSave,
  onCancel,
  className,
  title = "Save File",
}) => {
  // Track the current directory path for display purposes
  const [fileName, setFileName] = useState<string>(defaultFileName);
  const [selectedDirectory, setSelectedDirectory] = useState<FileMetadata | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Update the file name when defaultFileName changes
  useEffect(() => {
    setFileName(defaultFileName);
  }, [defaultFileName]);

  // Handle file selection from FileExplorer
  const handleFileSelect = (file: FileMetadata) => {
    if (file.isDir) {
      setSelectedDirectory(file);
    } else {
      // If a file is selected, use its directory and name
      const pathParts = file.path.split("/");
      pathParts.pop(); // Remove file name
      const dirPath = pathParts.join("/");
      
      setSelectedDirectory({
        ...file,
        path: dirPath,
        isDir: true,
      });
      setFileName(file.name);
    }
  };

  // Handle save button click
  const handleSave = async () => {
    if (!selectedDirectory) {
      setError("Please select a directory");
      return;
    }

    const fullPath = `${selectedDirectory.path}/${fileName}`.replace(/\/\//g, "/");
    
    // Check if file exists
    const exists = await fileManager.fileExists(fullPath);
    if (exists) {
      // Confirm overwrite (in a real app, you'd use a modal)
      if (!window.confirm(`File ${fileName} already exists. Overwrite?`)) {
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      await fileManager.writeFile(fullPath, fileContent);
      
      if (onSave) {
        onSave(fullPath);
      }
    } catch (err) {
      console.error("Error saving file:", err);
      setError(`Failed to save file: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
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

      {/* File name input */}
      <div className="p-4 border-t">
        <div className="flex items-center">
          <label htmlFor="file-name-input" className="mr-2 text-sm font-medium">File name:</label>
          <input
            id="file-name-input"
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Enter file name"
            aria-label="File name"
          />
        </div>

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
            onClick={handleSave} 
            disabled={!fileName.trim() || saving}
          >
            {saving ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </div>
            ) : (
              <div className="flex items-center">
                <SaveIcon className="h-4 w-4 mr-2" />
                Save
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FileSaveDialog;