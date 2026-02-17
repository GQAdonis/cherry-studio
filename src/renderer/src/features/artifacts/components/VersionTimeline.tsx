/**
 * Version Timeline Component
 *
 * Toolbar widget for navigating artifact version history.
 * Displays back/forward arrows, version number (e.g., "v3 of 7"),
 * and visual indicator when viewing a historical vs. latest version.
 *
 * Inspired by OpenAI Canvas's version navigation.
 */

import { useAppDispatch, useAppSelector } from '@renderer/store'
import { redo, selectVersionNavigation, undo } from '@renderer/store/artifacts'
import { ChevronLeft, ChevronRight, History } from 'lucide-react'
import { memo, useCallback } from 'react'
import styled from 'styled-components'

/**
 * VersionTimeline — Compact version navigation for the workspace toolbar
 */
const VersionTimeline = () => {
  const dispatch = useAppDispatch()
  const versionNav = useAppSelector(selectVersionNavigation)

  const handleBack = useCallback(() => {
    if (versionNav.canGoBack) {
      dispatch(undo())
    }
  }, [dispatch, versionNav.canGoBack])

  const handleForward = useCallback(() => {
    if (versionNav.canGoForward) {
      dispatch(redo())
    }
  }, [dispatch, versionNav.canGoForward])

  // Don't render if there's no version history
  if (versionNav.totalVersions <= 0) {
    return null
  }

  const isViewingHistory = versionNav.currentVersion < versionNav.totalVersions
  const versionLabel =
    versionNav.totalVersions === 0 ? 'No versions' : `v${versionNav.currentVersion} of ${versionNav.totalVersions}`

  return (
    <Container $isHistorical={isViewingHistory}>
      <HistoryIcon>
        <History size={14} />
      </HistoryIcon>

      <NavButton
        onClick={handleBack}
        disabled={!versionNav.canGoBack}
        title="Previous version"
        aria-label="Go to previous version">
        <ChevronLeft size={14} />
      </NavButton>

      <VersionLabel $isHistorical={isViewingHistory}>{versionLabel}</VersionLabel>

      <NavButton
        onClick={handleForward}
        disabled={!versionNav.canGoForward}
        title="Next version"
        aria-label="Go to next version">
        <ChevronRight size={14} />
      </NavButton>

      {isViewingHistory && <HistoricalBadge>Viewing history</HistoricalBadge>}
    </Container>
  )
}

VersionTimeline.displayName = 'VersionTimeline'

// ── Styled Components ───────────────────────────────────────────────────────

const Container = styled.div<{ $isHistorical?: boolean }>`
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  border-radius: 6px;
  background: ${(props) =>
    props.$isHistorical
      ? 'var(--color-warning-soft, rgba(245, 158, 11, 0.1))'
      : 'var(--color-background-soft, rgba(0, 0, 0, 0.04))'};
  border: 1px solid
    ${(props) =>
      props.$isHistorical
        ? 'var(--color-warning-border, rgba(245, 158, 11, 0.2))'
        : 'var(--color-border, rgba(0, 0, 0, 0.08))'};
  transition: all 0.2s ease;
`

const HistoryIcon = styled.span`
  display: flex;
  align-items: center;
  color: var(--color-text-3, #999);
  margin-right: 2px;
`

const NavButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--color-text-2, #666);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    background: var(--color-background-mute, rgba(0, 0, 0, 0.08));
    color: var(--color-text-1, #333);
  }

  &:active:not(:disabled) {
    transform: scale(0.92);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`

const VersionLabel = styled.span<{ $isHistorical?: boolean }>`
  font-size: 11px;
  font-weight: 500;
  color: ${(props) => (props.$isHistorical ? 'var(--color-warning, #f59e0b)' : 'var(--color-text-2, #666)')};
  min-width: 52px;
  text-align: center;
  user-select: none;
  letter-spacing: 0.02em;
`

const HistoricalBadge = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: var(--color-warning, #f59e0b);
  padding: 1px 6px;
  border-radius: 3px;
  background: var(--color-warning-soft, rgba(245, 158, 11, 0.1));
  margin-left: 4px;
  white-space: nowrap;
`

export default memo(VersionTimeline)
