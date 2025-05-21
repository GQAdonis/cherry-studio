import React, { useState, useEffect } from "react";
import { FileMetadata, fileManager } from "@/utils/fileManager";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileIcon, ChevronRightIcon, ChevronDownIcon, RefreshCwIcon, HomeIcon, ArrowUpIcon } from "lucide-react";

interface FileExplorerProps {
  initialPath?: string;
  onFileSelect?: (file: FileMetadata) => void;
  className?: string;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  initialPath = "",
  onFileSelect,
  className,
}) => {
  const [currentPath, setCurrentPath] = useState<string>(initialPath);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileMetadata | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  // Load files for the current path
  const loadFiles = async (path: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const fileList = await fileManager.listDirectory(path);
      setFiles(fileList);
      setCurrentPath(path);
    } catch (err) {
      console.error("Error loading files:", err);
      setError(`Failed to load files: ${err instanceof Error ? err.message : String(err)}`);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (initialPath) {
      loadFiles(initialPath);
    }
  }, [initialPath]);

  // Navigate to a directory
  const navigateToDirectory = (path: string) => {
    loadFiles(path);
  };

  // Navigate to parent directory
  const navigateToParent = () => {
    const parentPath = currentPath.split("/").slice(0, -1).join("/");
    if (parentPath) {
      navigateToDirectory(parentPath);
    }
  };

  // Handle file click
  const handleFileClick = (file: FileMetadata) => {
    setSelectedFile(file);
    
    if (file.isDir) {
      // Toggle expanded state for folders
      setExpandedFolders(prev => ({
        ...prev,
        [file.path]: !prev[file.path]
      }));
      
      // If expanding, load the directory contents
      if (!expandedFolders[file.path]) {
        navigateToDirectory(file.path);
      }
    } else {
      // Handle file selection
      if (onFileSelect) {
        onFileSelect(file);
      }
    }
  };

  // Refresh current directory
  const handleRefresh = () => {
    loadFiles(currentPath);
  };

  // Navigate to home directory
  const handleHomeClick = () => {
    // Use user's home directory or a default path
    const homePath = ""; // Empty string for root or set to a specific path
    navigateToDirectory(homePath);
  };

  // Sort files: directories first, then by name
  const sortedFiles = [...files].sort((a, b) => {
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;
    return a.name.localeCompare(b.name);
  });

  // Render file icon based on type
  const renderFileIcon = (file: FileMetadata) => {
    if (file.isDir) {
      return expandedFolders[file.path] ? 
        <ChevronDownIcon className="h-4 w-4 mr-2" /> : 
        <ChevronRightIcon className="h-4 w-4 mr-2" />;
    }
    
    // Determine file icon based on file type
    switch (file.fileType.toLowerCase()) {
      case "pdf":
        return <FileIcon className="h-4 w-4 mr-2 text-red-500" />;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <FileIcon className="h-4 w-4 mr-2 text-green-500" />;
      case "doc":
      case "docx":
        return <FileIcon className="h-4 w-4 mr-2 text-blue-500" />;
      case "xls":
      case "xlsx":
        return <FileIcon className="h-4 w-4 mr-2 text-green-700" />;
      case "ppt":
      case "pptx":
        return <FileIcon className="h-4 w-4 mr-2 text-orange-500" />;
      default:
        return <FileIcon className="h-4 w-4 mr-2" />;
    }
  };

  return (
    <div className={cn("flex flex-col h-full border rounded-md", className)}>
      {/* Toolbar */}
      <div className="flex items-center p-2 border-b bg-muted/50">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleHomeClick}
          title="Home Directory"
        >
          <HomeIcon className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={navigateToParent}
          disabled={!currentPath}
          title="Parent Directory"
        >
          <ArrowUpIcon className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh}
          title="Refresh"
        >
          <RefreshCwIcon className="h-4 w-4" />
        </Button>
        <div className="ml-2 text-sm truncate flex-1">
          {currentPath || "Root"}
        </div>
      </div>
      
      {/* File list */}
      <div className="flex-1 overflow-auto p-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 p-4 text-center">
            {error}
          </div>
        ) : sortedFiles.length === 0 ? (
          <div className="text-muted-foreground p-4 text-center">
            No files found
          </div>
        ) : (
          <div className="space-y-1">
            {sortedFiles.map((file) => (
              <div
                key={file.path}
                className={cn(
                  "flex items-center p-2 rounded-md text-sm cursor-pointer hover:bg-accent",
                  selectedFile?.path === file.path && "bg-accent"
                )}
                onClick={() => handleFileClick(file)}
              >
                <div className="flex items-center flex-1 min-w-0">
                  {renderFileIcon(file)}
                  <span className="truncate">{file.name}</span>
                </div>
                {!file.isDir && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {formatFileSize(file.size)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default FileExplorer;