/**
 * Artifact Page
 *
 * Full-page artifact viewer with:
 * - Left: Refinement chat panel
 * - Right: Preview/Code editor with toolbar
 *
 * Layout based on Lovable.dev/v0.dev style
 */

import { loggerService } from '@logger'
import { Navbar, NavbarCenter } from '@renderer/components/app/Navbar'
import { useAppDispatch, useAppSelector } from '@renderer/store'
import { openArtifact, selectActiveArtifact, selectViewMode, setViewMode } from '@renderer/store/artifacts'
import type { Message } from '@renderer/types/newMessage'
import { getMainTextContent } from '@renderer/utils/messageUtils/find'
import { useEffect, useState } from 'react'

const logger = loggerService.withContext('ArtifactPage')
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'

import ArtifactChatPanel from './components/ArtifactChatPanel'
import ArtifactHeader from './components/ArtifactHeader'
import ArtifactPreviewPane from './components/ArtifactPreviewPane'
import ResizablePanes from './components/ResizablePanes'

interface ArtifactData {
  artifact: {
    identifier: string
    type: 'html' | 'htmx' | 'react' | 'svg' | 'mermaid' | 'markdown' | 'code'
    title: string
    content: string
    attributes: Record<string, string>
    startIndex: number
    endIndex: number
  }
  conversationId: string
  messageId: string
  contextMessages?: Message[]
}

const ArtifactPage: React.FC = () => {
  const { artifactId } = useParams<{ artifactId: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const activeArtifact = useAppSelector(selectActiveArtifact)
  const viewMode = useAppSelector(selectViewMode)
  const [isLoading, setIsLoading] = useState(true)

  // Load artifact data from sessionStorage on mount
  useEffect(() => {
    if (!artifactId) {
      navigate('/')
      return
    }

    const storedData = sessionStorage.getItem(`artifact:${artifactId}`)
    if (storedData) {
      try {
        const data: ArtifactData = JSON.parse(storedData)

        // Extract content from message blocks for context
        const contextMessages = (data.contextMessages || []).map((msg) => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          // Use getMainTextContent to extract text from message blocks
          content: getMainTextContent(msg)
        }))

        dispatch(
          openArtifact({
            parsedArtifact: data.artifact,
            conversationId: data.conversationId,
            messageId: data.messageId,
            contextMessages
          })
        )
      } catch (error) {
        logger.error('Failed to parse artifact data:', error as Error)
        navigate('/')
        return
      }
    }
    setIsLoading(false)
  }, [artifactId, dispatch, navigate])

  const handleClose = () => {
    navigate(-1)
  }

  const handleViewModeChange = (mode: 'preview' | 'code' | 'split') => {
    dispatch(setViewMode(mode))
  }

  if (isLoading) {
    return (
      <Container>
        <Navbar>
          <NavbarCenter style={{ borderRight: 'none' }}>{t('artifacts.open_artifact')}</NavbarCenter>
        </Navbar>
        <LoadingContainer>
          <LoadingText>{t('common.loading', 'Loading...')}</LoadingText>
        </LoadingContainer>
      </Container>
    )
  }

  if (!activeArtifact) {
    return (
      <Container>
        <Navbar>
          <NavbarCenter style={{ borderRight: 'none' }}>{t('artifacts.open_artifact')}</NavbarCenter>
        </Navbar>
        <EmptyContainer>
          <EmptyText>{t('artifacts.no_artifacts')}</EmptyText>
        </EmptyContainer>
      </Container>
    )
  }

  return (
    <Container>
      <ArtifactHeader
        title={activeArtifact.title}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onClose={handleClose}
        artifact={activeArtifact}
      />
      <MainContent>
        <ResizablePanes
          left={<ArtifactChatPanel artifact={activeArtifact} />}
          right={<ArtifactPreviewPane artifact={activeArtifact} viewMode={viewMode} />}
          initialLeftWidth={320}
          minLeftWidth={240}
          maxLeftWidth={500}
          storageKey="artifact-chat-width"
        />
      </MainContent>
    </Container>
  )
}

// Styled components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: var(--color-background);
`

const MainContent = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
`

const LoadingText = styled.div`
  color: var(--color-text-2);
  font-size: 14px;
`

const EmptyContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
`

const EmptyText = styled.div`
  color: var(--color-text-2);
  font-size: 14px;
`

export default ArtifactPage
