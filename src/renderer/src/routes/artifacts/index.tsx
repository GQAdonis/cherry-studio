import ArtifactLibraryPage from '@renderer/pages/artifacts/ArtifactLibraryPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/artifacts/')({
  component: ArtifactLibraryPage
})
