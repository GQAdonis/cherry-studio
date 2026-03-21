import { CodeOutlined, CopyOutlined } from '@ant-design/icons'
import { useTheme } from '@renderer/context/ThemeProvider'
import type { ParsedArtifact } from '@renderer/features/artifacts/types'
import { openArtifactStudioFromChat } from '@renderer/features/artifacts/utils/studioNavigation'
import { useAppNavigate } from '@renderer/hooks/useAppNavigate'
import type { ThemeMode } from '@renderer/types'
import { Button } from 'antd'
import { Code, DownloadIcon, Sparkles } from 'lucide-react'
import type { FC } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ClipLoader } from 'react-spinners'
import styled, { keyframes } from 'styled-components'

import ReactArtifactsPopup from './ReactArtifactsPopup'

interface Props {
  code: string
  language: 'tsx' | 'jsx'
  onSave?: (code: string) => void
  isStreaming?: boolean
  conversationId: string
  messageId: string
}

const ReactArtifactsCard: FC<Props> = ({ code, language, onSave, isStreaming = false, conversationId, messageId }) => {
  const { t } = useTranslation()
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const { theme } = useTheme()
  const navigate = useAppNavigate()

  const codeContent = code || ''
  const hasContent = codeContent.trim().length > 0
  const artifactTitle = 'React Component'

  const openStudio = async () => {
    const parsedArtifact: ParsedArtifact = {
      identifier: `react-${Date.now()}`,
      type: 'react',
      title: artifactTitle,
      content: codeContent,
      attributes: {
        language
      },
      startIndex: 0,
      endIndex: codeContent.length
    }

    await openArtifactStudioFromChat({
      artifact: parsedArtifact,
      conversationId,
      messageId,
      navigate
    })
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeContent)
      window.toast.success(t('common.copied'))
    } catch (err) {
      window.toast.error(t('common.copy_failed'))
    }
  }

  const handleDownload = async () => {
    const fileName = `react-component.${language}`
    await window.api.file.save(fileName, codeContent)
    window.toast.success(t('message.download.success'))
  }

  return (
    <>
      <Container $isStreaming={isStreaming}>
        <Header>
          <IconWrapper $isStreaming={isStreaming}>
            {isStreaming ? <Sparkles size={20} color="white" /> : <Code size={20} color="white" />}
          </IconWrapper>
          <TitleSection>
            <Title>React Component</Title>
            <TypeBadge>
              <Code size={12} />
              <span>{language.toUpperCase()}</span>
            </TypeBadge>
          </TitleSection>
        </Header>
        <Content>
          {isStreaming && !hasContent ? (
            <GeneratingContainer>
              <ClipLoader size={20} color="var(--color-primary)" />
              <GeneratingText>{t('react_artifacts.generating', 'Generating React component...')}</GeneratingText>
            </GeneratingContainer>
          ) : isStreaming && hasContent ? (
            <>
              <TerminalPreview $theme={theme}>
                <TerminalContent $theme={theme}>
                  <TerminalLine>
                    <TerminalPrompt $theme={theme}>$</TerminalPrompt>
                    <TerminalCodeLine $theme={theme}>
                      {codeContent.trim().split('\n').slice(-3).join('\n')}
                      <TerminalCursor $theme={theme} />
                    </TerminalCodeLine>
                  </TerminalLine>
                </TerminalContent>
              </TerminalPreview>
              <ButtonContainer>
                <Button icon={<CodeOutlined />} type="primary" disabled loading>
                  {t('react_artifacts.receiving', 'Receiving...')}
                </Button>
              </ButtonContainer>
            </>
          ) : (
            <ButtonContainer>
              <Button icon={<CodeOutlined />} onClick={() => setIsPopupOpen(true)} type="text" disabled={!hasContent}>
                {t('chat.artifacts.button.preview')}
              </Button>
              <Button icon={<CopyOutlined />} onClick={handleCopy} type="text" disabled={!hasContent}>
                {t('common.copy')}
              </Button>
              <Button icon={<Sparkles size={14} />} onClick={openStudio} type="text" disabled={!hasContent}>
                {t('artifacts.open_studio', 'Artifact Studio')}
              </Button>
              <Button icon={<DownloadIcon size={14} />} onClick={handleDownload} type="text" disabled={!hasContent}>
                {t('code_block.download.label')}
              </Button>
            </ButtonContainer>
          )}
        </Content>
      </Container>

      <ReactArtifactsPopup
        open={isPopupOpen}
        title={artifactTitle}
        code={codeContent}
        onSave={onSave}
        onOpenStudio={openStudio}
        onClose={() => setIsPopupOpen(false)}
      />
    </>
  )
}

const Container = styled.div<{ $isStreaming: boolean }>`
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  margin: 10px 0;
  margin-top: 0;
`

const GeneratingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 20px;
  min-height: 78px;
`

const GeneratingText = styled.div`
  font-size: 14px;
  color: var(--color-text-secondary);
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px 16px;
  background: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
  border-radius: 8px 8px 0 0;
`

const IconWrapper = styled.div<{ $isStreaming: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  background: ${(props) =>
    props.$isStreaming
      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
      : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'};
  border-radius: 12px;
  color: white;
  box-shadow: ${(props) =>
    props.$isStreaming ? '0 4px 6px -1px rgba(16, 185, 129, 0.3)' : '0 4px 6px -1px rgba(59, 130, 246, 0.3)'};
  transition: background 0.3s ease;
`

const TitleSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const Title = styled.span`
  font-size: 14px;
  font-weight: bold;
  color: var(--color-text-1);
  line-height: 1.4;
  font-family: 'Ubuntu';
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const TypeBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 10px;
  font-weight: 500;
  color: var(--color-text-secondary);
  width: fit-content;
`

const Content = styled.div`
  padding: 0;
  background: var(--color-background);
`

const ButtonContainer = styled.div`
  margin: 10px 16px !important;
  display: flex;
  flex-direction: row;
  gap: 8px;

  .ant-btn {
    color: var(--color-text-1);

    &:hover {
      color: var(--color-primary);
    }

    &:disabled {
      color: var(--color-text-3);
    }
  }
`

const TerminalPreview = styled.div<{ $theme: ThemeMode }>`
  margin: 16px;
  background: ${(props) => (props.$theme === 'dark' ? '#1e1e1e' : '#f0f0f0')};
  border-radius: 8px;
  overflow: hidden;
  font-family: var(--code-font-family);
`

const TerminalContent = styled.div<{ $theme: ThemeMode }>`
  padding: 12px;
  background: ${(props) => (props.$theme === 'dark' ? '#1e1e1e' : '#f0f0f0')};
  color: ${(props) => (props.$theme === 'dark' ? '#cccccc' : '#333333')};
  font-size: 13px;
  line-height: 1.4;
  min-height: 80px;
`

const TerminalLine = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
`

const TerminalCodeLine = styled.span<{ $theme: ThemeMode }>`
  flex: 1;
  white-space: pre-wrap;
  word-break: break-word;
  color: ${(props) => (props.$theme === 'dark' ? '#cccccc' : '#333333')};
  background-color: transparent !important;
`

const TerminalPrompt = styled.span<{ $theme: ThemeMode }>`
  color: ${(props) => (props.$theme === 'dark' ? '#00ff00' : '#007700')};
  font-weight: bold;
  flex-shrink: 0;
`

const blinkAnimation = keyframes`
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
`

const TerminalCursor = styled.span<{ $theme: ThemeMode }>`
  display: inline-block;
  width: 2px;
  height: 16px;
  background: ${(props) => (props.$theme === 'dark' ? '#00ff00' : '#007700')};
  animation: ${blinkAnimation} 1s infinite;
  margin-left: 2px;
`

export default ReactArtifactsCard
