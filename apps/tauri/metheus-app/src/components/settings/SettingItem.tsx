import React, { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { SettingSchema } from "@/utils/settingsManager";

interface SettingItemProps {
  /** The key of the setting */
  settingKey: string;
  /** The current value of the setting */
  value: any;
  /** The schema for the setting */
  schema: SettingSchema;
  /** Callback for when the setting value changes */
  onChange: (key: string, value: any) => void;
  /** Callback for when the setting is reset to default */
  onReset: (key: string) => void;
  /** Whether the setting is disabled */
  disabled?: boolean;
}

/**
 * A component for rendering and editing a single setting
 */
export function SettingItem({
  settingKey,
  value,
  schema,
  onChange,
  onReset,
  disabled = false,
}: SettingItemProps) {
  const [localValue, setLocalValue] = useState<any>(value);
  
  // Update local value when prop value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  
  // Handle value change
  const handleChange = (newValue: any) => {
    setLocalValue(newValue);
    onChange(settingKey, newValue);
  };
  
  // Handle reset
  const handleReset = () => {
    onReset(settingKey);
  };
  
  // Extract the setting name from the key (remove the category prefix)
  const settingName = settingKey.split(".").pop() || settingKey;
  
  // Format the setting name for display (convert camelCase to Title Case)
  const formattedName = settingName
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());
  
  // Render the appropriate input based on the setting type
  const renderInput = () => {
    switch (schema.setting_type) {
      case "boolean":
        return (
          <div className="flex items-center space-x-2">
            <Switch
              id={settingKey}
              checked={localValue === true}
              onCheckedChange={handleChange}
              disabled={disabled}
            />
            <Label htmlFor={settingKey}>{formattedName}</Label>
          </div>
        );
        
      case "string":
        if (schema.allowed_values) {
          // Render a select dropdown for enum settings
          return (
            <div className="flex flex-col space-y-2">
              <Label htmlFor={settingKey}>{formattedName}</Label>
              <select
                id={settingKey}
                value={localValue}
                onChange={(e) => handleChange(e.target.value)}
                className="p-2 border rounded bg-background"
                disabled={disabled}
                aria-label={formattedName}
                title={formattedName}
              >
                {schema.allowed_values.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          );
        } else {
          // Render a text input for string settings
          return (
            <div className="flex flex-col space-y-2">
              <Label htmlFor={settingKey}>{formattedName}</Label>
              <input
                id={settingKey}
                type="text"
                value={localValue || ""}
                onChange={(e) => handleChange(e.target.value)}
                className="p-2 border rounded bg-background"
                disabled={disabled}
                aria-label={formattedName}
                title={formattedName}
                placeholder={formattedName}
              />
            </div>
          );
        }
        
      case "number":
        return (
          <div className="flex flex-col space-y-2">
            <Label htmlFor={settingKey}>{formattedName}</Label>
            <input
              id={settingKey}
              type="number"
              value={localValue || 0}
              onChange={(e) => handleChange(Number(e.target.value))}
              min={schema.min}
              max={schema.max}
              className="p-2 border rounded bg-background"
              disabled={disabled}
              aria-label={formattedName}
              title={formattedName}
              placeholder={formattedName}
            />
          </div>
        );
        
      default:
        return (
          <div className="text-red-500">
            Unsupported setting type: {schema.setting_type}
          </div>
        );
    }
  };
  
  return (
    <div className={cn(
      "flex flex-col md:flex-row md:items-center justify-between p-4 border-b",
      disabled && "opacity-50"
    )}>
      <div className="flex-grow mb-2 md:mb-0">
        {renderInput()}
        {schema.description && (
          <p className="text-sm text-muted-foreground mt-1">{schema.description}</p>
        )}
      </div>
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={disabled || JSON.stringify(localValue) === JSON.stringify(schema.default_value)}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}