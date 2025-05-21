import React, { useState } from "react";

/**
 * SettingsSidebar component
 * Navigation sidebar for settings sections
 */
const SettingsSidebar: React.FC<{
  selectedSection: string;
  setSelectedSection: (section: string) => void;
}> = ({ selectedSection, setSelectedSection }) => {
  const sections = [
    { id: "modelProvider", label: "Model Providers" },
    { id: "defaultModel", label: "Default Models" },
    { id: "webSearch", label: "Web Search" },
    { id: "mcpServers", label: "MCP Servers" },
    { id: "generalSettings", label: "General" },
    { id: "displaySettings", label: "Display" },
    { id: "miniAppsSettings", label: "Mini Apps" },
    { id: "keyboardShortcuts", label: "Keyboard Shortcuts" },
    { id: "quickAssistant", label: "Quick Assistant" },
    { id: "quickPhrases", label: "Quick Phrases" },
    { id: "dataSettings", label: "Data" },
    { id: "aboutFeedback", label: "About & Feedback" },
  ];

  return (
    <div className="w-64 bg-slate-800 border-r border-slate-700 overflow-y-auto">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-xl font-semibold">Settings</h2>
      </div>
      <div className="p-2">
        {sections.map((section) => (
          <button
            key={section.id}
            className={`w-full text-left p-2 rounded-md mb-1 ${
              selectedSection === section.id
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-slate-700"
            }`}
            onClick={() => setSelectedSection(section.id)}
          >
            {section.label}
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * SettingsContent component
 * Content area for selected settings section
 */
const SettingsContent: React.FC<{
  selectedSection: string;
}> = ({ selectedSection }) => {
  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">
          {selectedSection === "modelProvider" && "Model Providers"}
          {selectedSection === "defaultModel" && "Default Models"}
          {selectedSection === "webSearch" && "Web Search"}
          {selectedSection === "mcpServers" && "MCP Servers"}
          {selectedSection === "generalSettings" && "General Settings"}
          {selectedSection === "displaySettings" && "Display Settings"}
          {selectedSection === "miniAppsSettings" && "Mini Apps Settings"}
          {selectedSection === "keyboardShortcuts" && "Keyboard Shortcuts"}
          {selectedSection === "quickAssistant" && "Quick Assistant"}
          {selectedSection === "quickPhrases" && "Quick Phrases"}
          {selectedSection === "dataSettings" && "Data Settings"}
          {selectedSection === "aboutFeedback" && "About & Feedback"}
        </h1>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <p className="text-gray-400 mb-4">
            Settings content for {selectedSection} will be implemented here.
          </p>
          
          {/* Placeholder content */}
          <div className="space-y-4">
            <div className="h-12 bg-slate-700 rounded-md animate-pulse"></div>
            <div className="h-12 bg-slate-700 rounded-md animate-pulse"></div>
            <div className="h-12 bg-slate-700 rounded-md animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Settings component
 * Main settings page with sidebar and content area
 */
const Settings: React.FC = () => {
  const [selectedSection, setSelectedSection] = useState("generalSettings");

  return (
    <div className="flex h-full">
      <SettingsSidebar
        selectedSection={selectedSection}
        setSelectedSection={setSelectedSection}
      />
      <SettingsContent selectedSection={selectedSection} />
    </div>
  );
};

export default Settings;