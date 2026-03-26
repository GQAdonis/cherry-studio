import ContextManagementSettings from '@renderer/pages/settings/ContextManagementSettings'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/settings/context')({
  component: ContextManagementSettings
})
