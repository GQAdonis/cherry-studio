import React, { useState } from "react";
import { FileMetadata, fileManager } from "@/utils/fileManager";
import { Button } from "@/components/ui/button";
import { FileExplorer } from "./FileExplorer";
import { FileSaveDialog } from "./FileSaveDialog";
import { FileOpenDialog } from "./FileOpenDialog";
import { FolderOpenIcon, SaveIcon, FileIcon } from "lucide-react";

export const FileSystemDemo: React.FC = () => {
  const [showOpenDialog, setShowOpenDialog] = useState<boolean>(false);
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);
  const [currentFile, setCurrentFile] = useState<FileMetadata | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");

  // Handle file open
  const handleFileOpen = async (file: FileMetadata, content: Uint8Array) => {
    try {
      // Convert binary content to text
      const decoder = new TextDecoder("utf-8");
      const textContent = decoder.decode(content);
      
      setCurrentFile(file);
      setFileContent(textContent);
      setStatusMessage(`File opened: ${file.name}`);
      setShowOpenDialog(false);
    } catch (error) {
      setStatusMessage(`Error opening file: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Handle file save
  const handleFileSave = (path: string) => {
    setStatusMessage(`File saved to: ${path}`);
    setShowSaveDialog(false);
  };

  // Handle text change in the editor
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFileContent(e.target.value);
  };

  // Create a new file
  const handleNewFile = () => {
    setCurrentFile(null);
    setFileContent("");
    setStatusMessage("New file created");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center p-4 border-b">
        <Button variant="outline" className="mr-2" onClick={handleNewFile}>
          <FileIcon className="h-4 w-4 mr-2" />
          New
        </Button>
        <Button variant="outline" className="mr-2" onClick={() => setShowOpenDialog(true)}>
          <FolderOpenIcon className="h-4 w-4 mr-2" />
          Open
        </Button>
        <Button variant="outline" onClick={() => setShowSaveDialog(true)}>
          <SaveIcon className="h-4 w-4 mr-2" />
          Save
        </Button>
        <div className="ml-4 text-sm">
          {currentFile ? `Editing: ${currentFile.name}` : "No file open"}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* File explorer */}
        <div className="w-1/4 border-r p-2">
          <h3 className="text-sm font-medium mb-2">Files</h3>
          <FileExplorer 
            initialPath=""
            onFileSelect={async (file) => {
              if (!file.isDir) {
                try {
                  const content = await fileManager.readFile(file.path);
                  handleFileOpen(file, content);
                } catch (error) {
                  setStatusMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
                }
              }
            }}
            className="h-[calc(100%-2rem)]"
          />
        </div>

        {/* Text editor */}
        <div className="flex-1 p-4 flex flex-col">
          <textarea
            className="flex-1 p-4 border rounded-md font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            value={fileContent}
            onChange={handleTextChange}
            placeholder="Type or open a file to edit content..."
          />
        </div>
      </div>

      {/* Status bar */}
      <div className="border-t p-2 text-sm text-muted-foreground">
        {statusMessage}
      </div>

      {/* Dialogs */}
      {showOpenDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <FileOpenDialog
            initialPath=""
            onFileOpen={handleFileOpen}
            onCancel={() => setShowOpenDialog(false)}
            className="w-full max-w-2xl"
            fileTypes={["txt", "md", "json", "js", "ts", "html", "css"]}
          />
        </div>
      )}

      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <FileSaveDialog
            initialPath=""
            defaultFileName={currentFile?.name || "untitled.txt"}
            fileContent={fileContent}
            onSave={handleFileSave}
            onCancel={() => setShowSaveDialog(false)}
            className="w-full max-w-2xl"
          />
        </div>
      )}
    </div>
  );
};

export default FileSystemDemo;