import React, { useState } from "react";

/**
 * FilesContainer component
 * Main container for file management interface
 */
const FilesContainer: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>("/");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  
  // Mock file data
  const files = [
    { name: "Documents", type: "folder", size: "-", modified: "2023-05-15" },
    { name: "Images", type: "folder", size: "-", modified: "2023-05-10" },
    { name: "report.pdf", type: "file", size: "2.4 MB", modified: "2023-05-20" },
    { name: "presentation.pptx", type: "file", size: "5.1 MB", modified: "2023-05-18" },
    { name: "data.xlsx", type: "file", size: "1.8 MB", modified: "2023-05-16" },
  ];
  
  const handleFileSelect = (fileName: string) => {
    if (selectedFiles.includes(fileName)) {
      setSelectedFiles(selectedFiles.filter(name => name !== fileName));
    } else {
      setSelectedFiles([...selectedFiles, fileName]);
    }
  };
  
  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    setSelectedFiles([]);
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 bg-slate-800 rounded-lg mb-4">
        <h1 className="text-2xl font-bold">Files</h1>
        <div className="flex items-center mt-2">
          <input
            type="text"
            value={currentPath}
            readOnly
            aria-label="Current path"
            title="Current directory path"
            className="flex-1 bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm"
          />
        </div>
      </div>
      
      {/* Toolbar */}
      <div className="flex gap-2 mb-4 px-4">
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm">
          Upload
        </button>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm">
          New Folder
        </button>
        <button 
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm disabled:opacity-50"
          disabled={selectedFiles.length === 0}
        >
          Delete
        </button>
      </div>
      
      {/* File list */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-700 text-left">
              <th className="p-2 w-6">
                <input
                  type="checkbox"
                  className="rounded"
                  aria-label="Select all files"
                  title="Select all files"
                  checked={selectedFiles.length === files.length}
                  onChange={() => {
                    if (selectedFiles.length === files.length) {
                      setSelectedFiles([]);
                    } else {
                      setSelectedFiles(files.map(file => file.name));
                    }
                  }}
                />
              </th>
              <th className="p-2">Name</th>
              <th className="p-2">Type</th>
              <th className="p-2">Size</th>
              <th className="p-2">Modified</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr 
                key={file.name} 
                className={`border-b border-slate-700 hover:bg-slate-700 ${
                  selectedFiles.includes(file.name) ? "bg-slate-700" : ""
                }`}
              >
                <td className="p-2">
                  <input
                    type="checkbox"
                    className="rounded"
                    aria-label={`Select ${file.name}`}
                    title={`Select ${file.name}`}
                    checked={selectedFiles.includes(file.name)}
                    onChange={() => handleFileSelect(file.name)}
                  />
                </td>
                <td 
                  className="p-2 cursor-pointer"
                  onClick={() => {
                    if (file.type === "folder") {
                      handleNavigate(`${currentPath}${file.name}/`);
                    }
                  }}
                >
                  {file.name}
                </td>
                <td className="p-2">{file.type}</td>
                <td className="p-2">{file.size}</td>
                <td className="p-2">{file.modified}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Files component
 * Main entry point for the Files page
 */
const Files: React.FC = () => {
  return <FilesContainer />;
};

export default Files;