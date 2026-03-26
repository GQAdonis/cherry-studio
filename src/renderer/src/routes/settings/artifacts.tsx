import ArtifactSettings from '@renderer/pages/settings/ArtifactSettings'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/settings/artifacts')({
  component: ArtifactSettings
})
