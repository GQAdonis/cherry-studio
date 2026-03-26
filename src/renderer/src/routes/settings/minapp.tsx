import MinAppSettings from '@renderer/pages/settings/MinAppSettings'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/settings/minapp')({
  component: MinAppSettings
})
