/**
 * Resizable Panes Component
 *
 * A horizontal split pane component with a draggable divider.
 * Used for the artifact viewer to allow resizing between chat and preview.
 */

import type { FC, ReactNode } from 'react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'

interface ResizablePanesProps {
  /** Left pane content */
  left: ReactNode
  /** Right pane content */
  right: ReactNode
  /** Initial left pane width in pixels */
  initialLeftWidth?: number
  /** Minimum left pane width */
  minLeftWidth?: number
  /** Maximum left pane width */
  maxLeftWidth?: number
  /** Storage key for persisting the width */
  storageKey?: string
  /** Callback when width changes */
  onWidthChange?: (width: number) => void
}

const ResizablePanes: FC<ResizablePanesProps> = ({
  left,
  right,
  initialLeftWidth = 320,
  minLeftWidth = 240,
  maxLeftWidth = 500,
  storageKey = 'artifact-chat-width',
  onWidthChange
}) => {
  // Load saved width from localStorage
  const getSavedWidth = useCallback(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const width = parseInt(saved, 10)
        if (!isNaN(width) && width >= minLeftWidth && width <= maxLeftWidth) {
          return width
        }
      }
    }
    return initialLeftWidth
  }, [storageKey, initialLeftWidth, minLeftWidth, maxLeftWidth])

  const [leftWidth, setLeftWidth] = useState(getSavedWidth)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)
      startXRef.current = e.clientX
      startWidthRef.current = leftWidth
    },
    [leftWidth]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return

      const delta = e.clientX - startXRef.current
      let newWidth = startWidthRef.current + delta

      // Clamp to min/max
      newWidth = Math.max(minLeftWidth, Math.min(maxLeftWidth, newWidth))

      setLeftWidth(newWidth)
      onWidthChange?.(newWidth)
    },
    [isDragging, minLeftWidth, maxLeftWidth, onWidthChange]
  )

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)

      // Save to localStorage
      if (storageKey) {
        localStorage.setItem(storageKey, leftWidth.toString())
      }
    }
  }, [isDragging, leftWidth, storageKey])

  // Add global mouse listeners when dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      // Prevent text selection during drag
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'col-resize'

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
      }
    }
    return undefined
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Double-click to reset to default width
  const handleDoubleClick = useCallback(() => {
    setLeftWidth(initialLeftWidth)
    if (storageKey) {
      localStorage.setItem(storageKey, initialLeftWidth.toString())
    }
    onWidthChange?.(initialLeftWidth)
  }, [initialLeftWidth, storageKey, onWidthChange])

  return (
    <Container ref={containerRef}>
      <LeftPane style={{ width: leftWidth }}>{left}</LeftPane>
      <Divider onMouseDown={handleMouseDown} onDoubleClick={handleDoubleClick} $isDragging={isDragging}>
        <DividerHandle $isDragging={isDragging} />
      </Divider>
      <RightPane>{right}</RightPane>
    </Container>
  )
}

// Styled components
const Container = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
  overflow: hidden;
`

const LeftPane = styled.div`
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--color-background-soft);
`

const RightPane = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  overflow: hidden;
`

const Divider = styled.div<{ $isDragging: boolean }>`
  position: relative;
  width: 6px;
  flex-shrink: 0;
  cursor: col-resize;
  background: transparent;
  transition: background 0.15s ease;

  &:hover,
  &:active {
    background: var(--color-primary-soft);
  }

  ${(props) =>
    props.$isDragging &&
    `
    background: var(--color-primary-soft);
  `}
`

const DividerHandle = styled.div<{ $isDragging: boolean }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 4px;
  height: 40px;
  border-radius: 2px;
  background: var(--color-border);
  transition: all 0.15s ease;

  ${Divider}:hover &,
  ${Divider}:active & {
    background: var(--color-primary);
    height: 60px;
  }

  ${(props) =>
    props.$isDragging &&
    `
    background: var(--color-primary);
    height: 60px;
  `}
`

export default memo(ResizablePanes)
