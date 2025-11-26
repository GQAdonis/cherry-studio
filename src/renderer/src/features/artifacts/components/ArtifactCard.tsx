/**
 * Artifact Card Component
 *
 * Displays a compact clickable panel for artifacts in chat messages.
 * Styled similar to tool call blocks with rounded corners.
 * Clicking navigates to the artifact mini-app page.
 */

import {
  CodeOutlined,
  CopyOutlined,
  FileImageOutlined,
  FileTextOutlined,
  Html5Outlined,
  RightOutlined
} from '@ant-design/icons'
import { TopicManager } from '@renderer/hooks/useTopic'
import type { Message } from '@renderer/types/newMessage'
import { message, Tooltip } from 'antd'
import { Sparkles } from 'lucide-react'
import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import type { ArtifactType, ParsedArtifact } from '../types'

interface ArtifactCardProps {
  /** Parsed artifact data */
  artifact: ParsedArtifact
  /** Conversation ID for context */
  conversationId: string
  /** Message ID for context */
  messageId: string
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
      return 'Artifact'
  }
}

/**
 * Artifact Card Component - Compact clickable panel
 */
const ArtifactCard: FC<ArtifactCardProps> = ({ artifact, conversationId, messageId, className }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const typeColor = useMemo(() => getArtifactColor(artifact.type), [artifact.type])
  const typeLabel = useMemo(() => getArtifactTypeLabel(artifact.type), [artifact.type])
  const typeIcon = useMemo(() => getArtifactIcon(artifact.type), [artifact.type])

  // Generate artifact ID from identifier or create one
  const artifactId = useMemo(() => {
    return encodeURIComponent(artifact.identifier)
  }, [artifact.identifier])

  // Handle opening the artifact in the mini-app page
  const handleOpen = useCallback(async () => {
    // Fetch context messages from the conversation for refinement context
    let contextMessages: Message[] = []
    try {
      if (conversationId && !conversationId.startsWith('inline-')) {
        // Fetch the last 5 messages from the conversation for context
        const messages = await TopicManager.getTopicMessages(conversationId)
        // Take the last 5 messages for context
        contextMessages = messages.slice(-5)
      }
    } catch (error) {
      console.warn('Failed to fetch context messages:', error)
    }

    // Store artifact data in sessionStorage for the artifact page to retrieve
    const artifactData = {
      artifact,
      conversationId,
      messageId,
      contextMessages
    }
    sessionStorage.setItem(`artifact:${artifactId}`, JSON.stringify(artifactData))

    // Navigate to artifact page
    navigate(`/artifacts/${artifactId}`)
  }, [navigate, artifactId, artifact, conversationId, messageId])

  // Handle copying artifact content
  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      try {
        await navigator.clipboard.writeText(artifact.content)
        message.success(t('common.copied'))
      } catch (_err) {
        message.error(t('common.copy_failed'))
      }
    },
    [artifact.content, t]
  )

  return (
    <CardContainer className={className} $typeColor={typeColor} onClick={handleOpen}>
      <CardContent>
        <IconWrapper $color={typeColor}>
          <Sparkles size={16} />
        </IconWrapper>

        <TextContent>
          <TitleRow>
            <TypeBadge $color={typeColor}>
              {typeIcon}
              <span>{typeLabel}</span>
            </TypeBadge>
            <Title>{artifact.title}</Title>
          </TitleRow>
          <Subtitle>{t('artifacts.click_to_open', 'Click to open artifact')}</Subtitle>
        </TextContent>

        <ActionArea onClick={(e) => e.stopPropagation()}>
          <Tooltip title={t('common.copy')}>
            <ActionButton onClick={handleCopy}>
              <CopyOutlined />
            </ActionButton>
          </Tooltip>
        </ActionArea>

        <ArrowIcon>
          <RightOutlined />
        </ArrowIcon>
      </CardContent>
    </CardContainer>
  )
}

// Styled components
const CardContainer = styled.div<{ $typeColor: string }>`
  display: flex;
  align-items: center;
  margin: 8px 0;
  padding: 12px 16px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  max-width: 500px;

  &:hover {
    background: var(--color-background-mute);
    border-color: ${(props) => props.$typeColor}50;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`

const CardContent = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
`

const IconWrapper = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: ${(props) => props.$color}15;
  border-radius: 10px;
  color: ${(props) => props.$color};
  flex-shrink: 0;
`

const TextContent = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const TypeBadge = styled.div<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${(props) => props.$color};
  background: ${(props) => props.$color}15;
  border-radius: 4px;
  flex-shrink: 0;

  .anticon {
    font-size: 10px;
  }
`

const Title = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Subtitle = styled.div`
  font-size: 12px;
  color: var(--color-text-3);
`

const ActionArea = styled.div`
  display: flex;
  gap: 4px;
  flex-shrink: 0;
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
  color: var(--color-text-3);
  border-radius: 6px;
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

const ArrowIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-3);
  flex-shrink: 0;

  .anticon {
    font-size: 12px;
  }
`

export default memo(ArtifactCard)
