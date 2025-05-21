import React, { useState } from "react";
import AssistantChatWrapper from "../../components/assistants/AssistantChatWrapper";

/**
 * Assistants component
 * Provides interface for interacting with AI assistants
 */
const Assistants = () => {
  const [activeTab, setActiveTab] = useState<"chat" | "list">("chat");

  return (
    <>
      <div className="mb-4 border-b border-gray-800">
        <div className="flex">
          <button
            className={`px-4 py-2 ${
              activeTab === "chat"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-gray-400"
            }`}
            onClick={() => setActiveTab("chat")}
          >
            Chat
          </button>
          <button
            className={`px-4 py-2 ${
              activeTab === "list"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-gray-400"
            }`}
            onClick={() => setActiveTab("list")}
          >
            My Assistants
          </button>
        </div>
      </div>

      {activeTab === "chat" ? (
        <div className="h-[calc(100vh-12rem)] bg-slate-800 rounded-lg overflow-hidden">
          <AssistantChatWrapper />
        </div>
      ) : (
        <div className="p-4 bg-slate-800 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">My Assistants</h2>
          <p className="text-gray-400">
            List of assistants will be displayed here.
          </p>
        </div>
      )}
    </>
  );
};

export default Assistants;