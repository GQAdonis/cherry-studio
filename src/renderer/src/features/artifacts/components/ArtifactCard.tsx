/**
 * Artifact Card Component
 *
 * Displays a compact card for artifacts in chat messages with:
 * - Type icon and title
 * - Version badge
 * - Thumbnail preview (optional)
 * - Quick actions (Open, Copy, Save)
 */

import {
  CodeOutlined,
  CopyOutlined,
  ExpandOutlined,
  FileImageOutlined,
  FileTextOutlined,
  Html5Outlined
} from '@ant-design/icons'
import { useAppDispatch } from '@renderer/store'
import { openArtifact } from '@renderer/store/artifacts'
import { message, Tooltip } from 'antd'
import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import type { ArtifactType, ParsedArtifact } from '../types'

interface ArtifactCardProps {
  /** Parsed artifact data */
  artifact: ParsedArtifact
  /** Conversation ID for context */
  conversationId: string
  /** Message ID for context */
  messageId: string
  /** Whether to show the thumbnail preview */
  showPreview?: boolean
  /** Custom class name */
  className?: string
}

/**
 * Get icon component for artifact type
 */
function getArtifactIcon(type: ArtifactType): React.ReactNode {
  switch (type) {
    case 'html':
    case 'htmx':
      return <Html5Outlined />
    case 'react':
      return <CodeOutlined />
    case 'svg':
      return <FileImageOutlined />
    case 'mermaid':
      return <FileImageOutlined />
    case 'markdown':
      return <FileTextOutlined />
    case 'code':
      return <CodeOutlined />
    default:
      return <FileTextOutlined />
  }
}

/**
 * Get color for artifact type
 */
function getArtifactColor(type: ArtifactType): string {
  switch (type) {
    case 'html':
    case 'htmx':
      return '#e34c26' // HTML orange
    case 'react':
      return '#61dafb' // React cyan
    case 'svg':
      return '#ffb13b' // SVG gold
    case 'mermaid':
      return '#ff3670' // Mermaid pink
    case 'markdown':
      return '#083fa1' // Markdown blue
    case 'code':
      return '#6e7681' // Code gray
    default:
      return 'var(--color-primary)'
  }
}

/**
 * Get label for artifact type
 */
function getArtifactTypeLabel(type: ArtifactType): string {
  switch (type) {
    case 'html':
      return 'HTML'
    case 'htmx':
      return 'HTMX'
    case 'react':
      return 'React'
    case 'svg':
      return 'SVG'
    case 'mermaid':
      return 'Mermaid'
    case 'markdown':
      return 'Markdown'
    case 'code':
      return 'Code'
    default:
      return 'Unknown'
  }
}

/**
 * Artifact Card Component
 */
const ArtifactCard: FC<ArtifactCardProps> = ({
  artifact,
  conversationId,
  messageId,
  showPreview = false,
  className
}) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const typeColor = useMemo(() => getArtifactColor(artifact.type), [artifact.type])
  const typeLabel = useMemo(() => getArtifactTypeLabel(artifact.type), [artifact.type])
  const typeIcon = useMemo(() => getArtifactIcon(artifact.type), [artifact.type])

  // Handle opening the artifact in modal
  const handleOpen = useCallback(() => {
    dispatch(
      openArtifact({
        parsedArtifact: artifact,
        conversationId,
        messageId
      })
    )
  }, [dispatch, artifact, conversationId, messageId])

  // Handle copying artifact content
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(artifact.content)
      message.success(t('common.copied'))
    } catch (err) {
      message.error(t('common.copy_failed'))
    }
  }, [artifact.content, t])

  // Truncate content for preview
  const previewContent = useMemo(() => {
    const maxLength = 200
    if (artifact.content.length <= maxLength) {
      return artifact.content
    }
    return artifact.content.slice(0, maxLength) + '...'
  }, [artifact.content])

  return (
    <Card className={className} $typeColor={typeColor} onClick={handleOpen}>
      <CardHeader>
        <TypeBadge $color={typeColor}>
          {typeIcon}
          <span>{typeLabel}</span>
        </TypeBadge>
        <CardTitle>{artifact.title}</CardTitle>
      </CardHeader>

      {showPreview && (
        <PreviewArea>
          <PreviewContent>{previewContent}</PreviewContent>
        </PreviewArea>
      )}

      <CardFooter>
        <IdentifierText>
          <code>{artifact.identifier}</code>
        </IdentifierText>

        <ActionButtons onClick={(e) => e.stopPropagation()}>
          <Tooltip title={t('common.copy')}>
            <ActionButton onClick={handleCopy}>
              <CopyOutlined />
            </ActionButton>
          </Tooltip>
          <Tooltip title={t('common.open')}>
            <ActionButton onClick={handleOpen}>
              <ExpandOutlined />
            </ActionButton>
          </Tooltip>
        </ActionButtons>
      </CardFooter>
    </Card>
  )
}

// Styled components
const Card = styled.div<{ $typeColor: string }>`
  display: flex;
  flex-direction: column;
  padding: 12px;
  margin: 8px 0;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-left: 3px solid ${(props) => props.$typeColor};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  max-width: 400px;

  &:hover {
    background: var(--color-background-mute);
    border-color: ${(props) => props.$typeColor};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`

const TypeBadge = styled.div<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
  color: ${(props) => props.$color};
  background: ${(props) => props.$color}15;
  border-radius: 4px;

  .anticon {
    font-size: 12px;
  }
`

const CardTitle = styled.div`
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const PreviewArea = styled.div`
  margin-bottom: 8px;
  padding: 8px;
  background: var(--color-background);
  border-radius: 4px;
  overflow: hidden;
`

const PreviewContent = styled.pre`
  margin: 0;
  font-size: 11px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  color: var(--color-text-soft);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 100px;
  overflow: hidden;
`

const CardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const IdentifierText = styled.div`
  font-size: 11px;
  color: var(--color-text-muted);

  code {
    padding: 2px 4px;
    background: var(--color-background);
    border-radius: 3px;
    font-family: 'SF Mono', 'Fira Code', monospace;
  }
`

const ActionButtons = styled.div`
  display: flex;
  gap: 4px;
`

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-soft);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--color-background);
    color: var(--color-primary);
  }

  .anticon {
    font-size: 14px;
  }
`

export default memo(ArtifactCard)
