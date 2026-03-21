import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import SettingsPage from '../SettingsPage'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | { defaultValue?: string }) =>
      typeof fallback === 'string' ? fallback : fallback?.defaultValue || key
  })
}))

vi.mock('@renderer/components/app/Navbar', () => ({
  Navbar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  NavbarCenter: ({ children }: { children: ReactNode }) => <div>{children}</div>
}))

vi.mock('@renderer/components/Scrollbar', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>
}))

vi.mock('@renderer/components/Icons', () => ({
  McpLogo: () => <div>MCP</div>
}))

vi.mock('../AboutSettings', () => ({ default: () => <div>About Settings</div> }))
vi.mock('../ArtifactSettings', () => ({ default: () => <div>Artifact Settings</div> }))
vi.mock('../ContextManagementSettings', () => ({ default: () => <div>Context Settings</div> }))
vi.mock('../DataSettings/DataSettings', () => ({ default: () => <div>Data Settings</div> }))
vi.mock('../DisplaySettings/DisplaySettings', () => ({ default: () => <div>Display Settings</div> }))
vi.mock('../DocProcessSettings', () => ({ default: () => <div>Doc Process Settings</div> }))
vi.mock('../E2BSettings', () => ({ default: () => <div>E2B Settings</div> }))
vi.mock('../GeneralSettings', () => ({ default: () => <div>General Settings</div> }))
vi.mock('../MCPSettings', () => ({ default: () => <div>MCP Settings</div> }))
vi.mock('../MemorySettings', () => ({ default: () => <div>Memory Settings</div> }))
vi.mock('../MinAppSettings', () => ({ default: () => <div>MinApp Settings</div> }))
vi.mock('../ModelSettings/ModelSettings', () => ({ default: () => <div>Model Settings</div> }))
vi.mock('../NotesSettings', () => ({ default: () => <div>Notes Settings</div> }))
vi.mock('../ProviderSettings', () => ({ ProviderList: () => <div>Provider Settings</div> }))
vi.mock('../QuickAssistantSettings', () => ({ default: () => <div>Quick Assistant Settings</div> }))
vi.mock('../QuickPhraseSettings', () => ({ default: () => <div>Quick Phrase Settings</div> }))
vi.mock('../SelectionAssistantSettings/SelectionAssistantSettings', () => ({
  default: () => <div>Selection Assistant Settings</div>
}))
vi.mock('../ShortcutSettings', () => ({ default: () => <div>Shortcut Settings</div> }))
vi.mock('../SkillCreator', () => ({ default: () => <div>Skill Creator</div> }))
vi.mock('../SkillSettings', () => ({ default: () => <div>Skill Settings</div> }))
vi.mock('../ToolSettings/ApiServerSettings', () => ({ ApiServerSettings: () => <div>API Server Settings</div> }))
vi.mock('../WebSearchSettings', () => ({ default: () => <div>Web Search Settings</div> }))

describe('SettingsPage routing', () => {
  it('renders the web search settings route for nested websearch paths', () => {
    render(
      <MemoryRouter initialEntries={['/settings/websearch/general']}>
        <Routes>
          <Route path="/settings/*" element={<SettingsPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Web Search Settings')).toBeInTheDocument()
  })
})
