import E2BSettings from '@renderer/pages/settings/E2BSettings'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/settings/e2b')({
  component: E2BSettings
})
