import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import LaunchpadPage from '../LaunchpadPage'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn()
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>
}))

vi.mock('@renderer/hooks/useSettings', () => ({
  useSettings: () => ({
    defaultPaintingProvider: 'dall-e-3'
  })
}))

vi.mock('@renderer/hooks/useMinapps', () => ({
  useMinapps: () => ({
    pinned: [],
    openedKeepAliveMinapps: []
  })
}))

vi.mock('@renderer/hooks/useRuntime', () => ({
  useRuntime: () => ({
    openedKeepAliveMinapps: []
  })
}))

vi.mock('@renderer/components/MinApp/MinApp', () => ({
  default: () => null
}))

vi.mock('@renderer/components/Icons/SVGIcon', () => ({
  OpenClawIcon: () => null
}))

describe('LaunchpadPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows Artifact Studio tile and navigates to the artifact library', () => {
    render(<LaunchpadPage />)

    fireEvent.click(screen.getByText(/artifact studio|文物工作室/i))

    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/artifacts' })
  })
})
