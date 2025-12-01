import type { ActionTool } from '@renderer/components/ActionTools'
import { TOOL_SPECS, useToolManager } from '@renderer/components/ActionTools'
import { useAppSelector } from '@renderer/store'
import { selectArtifactSettings } from '@renderer/store/settings'
import { Eye } from 'lucide-react'
import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface UsePreviewToolProps {
  enabled: boolean
  language: string
  onPreview: () => void
  setTools: React.Dispatch<React.SetStateAction<ActionTool[]>>
}

export const usePreviewTool = ({ enabled, language, onPreview, setTools }: UsePreviewToolProps) => {
  const { t } = useTranslation()
  const { registerTool, removeTool } = useToolManager(setTools)
  const artifactSettings = useAppSelector(selectArtifactSettings)

  const handlePreview = useCallback(() => {
    onPreview()
  }, [onPreview])

  // Only show preview tool for TSX/JSX when artifacts are enabled and React is enabled
  const shouldShow =
    enabled &&
    ['tsx', 'jsx'].includes(language) &&
    artifactSettings?.enabled &&
    artifactSettings?.enabledTypes?.includes('react')

  useEffect(() => {
    if (!shouldShow) return

    const previewTool = {
      ...TOOL_SPECS.preview,
      icon: <Eye className="tool-icon" />,
      tooltip: t('code_block.preview.react', 'Preview React Component'),
      onClick: handlePreview
    }

    registerTool(previewTool)

    return () => {
      removeTool(TOOL_SPECS.preview.id)
    }
  }, [shouldShow, handlePreview, registerTool, removeTool, t])
}
