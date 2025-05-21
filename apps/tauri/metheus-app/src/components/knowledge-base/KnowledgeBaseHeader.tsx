import React from "react";

const KnowledgeBaseHeader = () => {
  return (
    <div className="mb-6 p-4 bg-slate-800 rounded-lg">
      <h1 className="text-2xl font-bold mb-2">Knowledge Base</h1>
      <p className="text-gray-400">
        Manage your knowledge resources for AI assistants
      </p>
      <div className="flex justify-between items-center mt-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-400">Embedding Model</span>
          <span className="bg-green-900/30 text-green-400 text-xs py-1 px-2 rounded-md">text-embedding-3-small</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Dimensions 1536</span>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBaseHeader;