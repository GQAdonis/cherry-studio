import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import SettingsPage from '../SettingsPage'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | { defaultValue?: string }) =>
      typeof fallback === 'string' ? fallback : fallback?.defaultValue || key
  })
}))

vi.mock('@tanstack/react-router', () => ({
  useLocation: () => ({ pathname: '/settings/websearch/general' }),
  useNavigate: () => vi.fn(),
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  Outlet: () => <div>Web Search Settings</div>
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

describe('SettingsPage routing', () => {
  it('renders the settings page for nested paths', () => {
    render(<SettingsPage />)
    expect(screen.getByText('Web Search Settings')).toBeInTheDocument()
  })
})
