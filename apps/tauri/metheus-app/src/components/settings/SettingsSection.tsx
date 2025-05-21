import React, { useState } from "react";
import { SettingItem } from "./SettingItem";
import { SettingSchema, SettingCategory } from "@/utils/settingsManager";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  /** The key of the category */
  categoryKey: string;
  /** The category information */
  category: SettingCategory;
  /** The settings in this category */
  settings: Record<string, any>;
  /** The schemas for the settings in this category */
  schemas: Record<string, SettingSchema>;
  /** Callback for when a setting value changes */
  onSettingChange: (key: string, value: any) => void;
  /** Callback for when a setting is reset to default */
  onSettingReset: (key: string) => void;
  /** Whether the section is expanded */
  expanded?: boolean;
  /** Whether the settings are disabled */
  disabled?: boolean;
}

/**
 * A component for rendering a section of related settings
 */
export function SettingsSection({
  categoryKey,
  category,
  settings,
  schemas,
  onSettingChange,
  onSettingReset,
  expanded = false,
  disabled = false,
}: SettingsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(expanded);
  
  // Toggle the expanded state
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };
  
  return (
    <div className="mb-6 border rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-4 bg-muted cursor-pointer w-full text-left"
        onClick={toggleExpanded}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            toggleExpanded();
            e.preventDefault();
          }
        }}
      >
        <div className="flex items-center">
          {category.icon && (
            <span className="mr-2 text-muted-foreground">
              {/* You can replace this with an actual icon component */}
              {category.icon}
            </span>
          )}
          <h3 className="text-lg font-medium">{category.name}</h3>
        </div>
        <div className="text-muted-foreground">
          {isExpanded ? (
            <span aria-hidden="true">▼</span>
          ) : (
            <span aria-hidden="true">▶</span>
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="bg-card">
          {category.description && (
            <div className="p-4 border-b text-sm text-muted-foreground">
              {category.description}
            </div>
          )}
          
          <div className={cn(disabled && "opacity-70 pointer-events-none")}>
            {Object.entries(schemas)
              .filter(([key]) => key.startsWith(`${categoryKey}.`))
              .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
              .map(([key, schema]) => (
                <SettingItem
                  key={key}
                  settingKey={key}
                  value={settings[key]}
                  schema={schema}
                  onChange={onSettingChange}
                  onReset={onSettingReset}
                  disabled={disabled}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}