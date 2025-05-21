import React, { useState, useEffect } from "react";
import { SettingsSection } from "./SettingsSection";
import { Button } from "@/components/ui/button";
import { settingsManager, SettingCategory } from "@/utils/settingsManager";

interface SettingsPanelProps {
  /** Whether the settings panel is disabled */
  disabled?: boolean;
}

/**
 * The main settings panel component
 */
export function SettingsPanel({ disabled = false }: SettingsPanelProps) {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [schemas, setSchemas] = useState<Record<string, any>>({});
  const [categories, setCategories] = useState<Record<string, SettingCategory>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load settings, schemas, and categories
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        
        // Initialize the settings manager
        await settingsManager.initialize();
        
        // Load settings
        const allSettings = await settingsManager.getAllSettings();
        setSettings(allSettings);
        
        // Load schemas
        const allSchemas = await settingsManager.getAllSettingSchemas();
        setSchemas(allSchemas);
        
        // Load categories
        const allCategories = await settingsManager.getSettingCategories();
        setCategories(allCategories);
        
        setLoading(false);
      } catch (err) {
        console.error("Failed to load settings:", err);
        setError("Failed to load settings. Please try again.");
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);
  
  // Handle setting change
  const handleSettingChange = async (key: string, value: any) => {
    try {
      await settingsManager.setSetting(key, value);
      setSettings((prev) => ({ ...prev, [key]: value }));
    } catch (err) {
      console.error(`Failed to set setting ${key}:`, err);
      // Revert the setting change in the UI
      const currentValue = await settingsManager.getSetting(key);
      setSettings((prev) => ({ ...prev, [key]: currentValue }));
    }
  };
  
  // Handle setting reset
  const handleSettingReset = async (key: string) => {
    try {
      await settingsManager.resetSetting(key);
      const newValue = await settingsManager.getSetting(key);
      setSettings((prev) => ({ ...prev, [key]: newValue }));
    } catch (err) {
      console.error(`Failed to reset setting ${key}:`, err);
    }
  };
  
  // Handle reset all settings
  const handleResetAll = async () => {
    try {
      await settingsManager.resetAllSettings();
      const allSettings = await settingsManager.getAllSettings();
      setSettings(allSettings);
    } catch (err) {
      console.error("Failed to reset all settings:", err);
    }
  };
  
  // Sort categories by order
  const sortedCategories = Object.entries(categories)
    .sort(([, a], [, b]) => {
      const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading settings...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-lg text-red-500 mb-4">{error}</div>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Settings</h2>
        <Button
          variant="outline"
          onClick={handleResetAll}
          disabled={disabled}
        >
          Reset All Settings
        </Button>
      </div>
      
      {sortedCategories.map(([key, category]) => (
        <SettingsSection
          key={key}
          categoryKey={key}
          category={category}
          settings={settings}
          schemas={schemas}
          onSettingChange={handleSettingChange}
          onSettingReset={handleSettingReset}
          disabled={disabled}
        />
      ))}
    </div>
  );
}