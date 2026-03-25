import ArtifactPage from '@renderer/pages/artifacts/ArtifactPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/artifacts/studio/$projectId')({
  component: ArtifactPage
})
