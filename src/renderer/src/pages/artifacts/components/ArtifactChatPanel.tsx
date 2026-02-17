/**
 * Artifact Chat Panel Component
 *
 * Left panel for refining the artifact through chat.
 * Similar to Lovable.dev/v0.dev refinement interface.
 *
 * Features:
 * - Flat 2.0 design with no borders
 * - Proper contrast for light/dark modes
 * - Streamlined input area
 * - Image upload support
 */

import { PaperClipOutlined, SendOutlined, UserOutlined } from '@ant-design/icons'
import Scrollbar from '@renderer/components/Scrollbar'
import type { Artifact } from '@renderer/features/artifacts'
import { useArtifactRefinement } from '@renderer/features/artifacts/hooks/useArtifactRefinement'
import {
  ARTIFACT_STUDIO_AGENT_ID,
  ARTIFACT_STUDIO_RUNTIME_ERROR_CODES,
  isArtifactStudioRuntimeError
} from '@renderer/features/artifacts/services/ArtifactStudioRuntimeService'
import { AgentSettingsPopup } from '@renderer/pages/settings/AgentSettings'
import { message, Tooltip } from 'antd'
import { Bot, Sparkles, X } from 'lucide-react'
import type { FC, KeyboardEvent } from 'react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import RefinementToolbar from './RefinementToolbar'

interface AttachedImage {
  id: string
  file: File
  preview: string
}

interface ArtifactChatPanelProps {
  artifact: Artifact
  onSendRefinementReady?: (sendRefinement: (prompt: string) => Promise<void>) => void
}

const ArtifactChatPanel: FC<ArtifactChatPanelProps> = ({ artifact, onSendRefinementReady }) => {
  const { t } = useTranslation()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [inputValue, setInputValue] = useState('')
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([])

  const handleRefinementError = useCallback(
    (error: Error) => {
      if (
        isArtifactStudioRuntimeError(error, ARTIFACT_STUDIO_RUNTIME_ERROR_CODES.AGENT_MODEL_REQUIRED) ||
        error.message.includes(ARTIFACT_STUDIO_RUNTIME_ERROR_CODES.AGENT_MODEL_REQUIRED)
      ) {
        message.warning(
          t(
            'artifacts.agent_model_required',
            'Artifact Studio agent needs a model. Configure one in Agent Settings before refining.'
          )
        )
        void AgentSettingsPopup.show({
          agentId: ARTIFACT_STUDIO_AGENT_ID,
          tab: 'essential'
        })
        return
      }

      if (
        isArtifactStudioRuntimeError(error, ARTIFACT_STUDIO_RUNTIME_ERROR_CODES.AGENT_NOT_FOUND) ||
        error.message.includes(ARTIFACT_STUDIO_RUNTIME_ERROR_CODES.AGENT_NOT_FOUND)
      ) {
        message.error(
          t('artifacts.agent_not_found', 'Artifact Studio agent is unavailable. Restart Cherry Studio and try again.')
        )
      }
    },
    [t]
  )

  // Use the artifact refinement hook for AI-powered chat
  const { messages, isRefining, sendRefinement, clearMessages } = useArtifactRefinement({
    artifact,
    onComplete: () => {
      scrollToBottom()
    },
    onError: handleRefinementError
  })

  useEffect(() => {
    if (onSendRefinementReady) {
      onSendRefinementReady(sendRefinement)
    }
  }, [onSendRefinementReady, sendRefinement])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isRefining) return

    let messageContent = inputValue.trim()

    // If there are attached images, include them in the message as descriptions
    if (attachedImages.length > 0) {
      const imageDescriptions = attachedImages.map((img) => `[Attached image: ${img.file.name}]`).join('\n')
      messageContent = `${messageContent}\n\n${imageDescriptions}`
    }

    setInputValue('')
    setAttachedImages([])

    // Send refinement request using the hook
    await sendRefinement(messageContent)
  }, [inputValue, isRefining, attachedImages, sendRefinement])

  const handleKeyPress = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSendMessage()
      }
    },
    [handleSendMessage]
  )

  const handleImageAttach = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newImages: AttachedImage[] = []
    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        const id = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const preview = URL.createObjectURL(file)
        newImages.push({ id, file, preview })
      }
    }

    setAttachedImages((prev) => [...prev, ...newImages])

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleRemoveImage = useCallback((id: string) => {
    setAttachedImages((prev) => {
      const image = prev.find((img) => img.id === id)
      if (image) {
        URL.revokeObjectURL(image.preview)
      }
      return prev.filter((img) => img.id !== id)
    })
  }, [])

  return (
    <Container>
      <Header>
        <HeaderIcon>
          <Sparkles size={16} />
        </HeaderIcon>
        <HeaderTitle>{t('artifacts.artifact_chat', 'Artifact Chat')}</HeaderTitle>
      </Header>

      <RefinementToolbar onClear={clearMessages} />

      <MessagesContainer>
        <Scrollbar>
          <MessagesInner>
            {messages.length === 0 ? (
              <EmptyState>
                <EmptyIcon>
                  <Bot size={32} />
                </EmptyIcon>
                <EmptyText>{t('artifacts.refinement_empty')}</EmptyText>
                <EmptyHint>{t('artifacts.refinement_hint')}</EmptyHint>
              </EmptyState>
            ) : (
              messages.map((msg) => (
                <MessageBubble key={msg.id} $isUser={msg.role === 'user'}>
                  <MessageAvatar $isUser={msg.role === 'user'}>
                    {msg.role === 'user' ? <UserOutlined /> : <Bot size={14} />}
                  </MessageAvatar>
                  <MessageStack>
                    <MessageContent $isUser={msg.role === 'user'} $isStreaming={msg.isStreaming}>
                      {msg.content}
                      {msg.isStreaming && <StreamingCursor />}
                    </MessageContent>
                    {msg.role === 'assistant' && (msg.skillActivations?.length || 0) > 0 && (
                      <SkillActivationList>
                        {msg.skillActivations?.map((activation, index) => (
                          <SkillActivationItem key={`${msg.id}-skill-${index}`}>
                            <SkillActivationTitle>{activation.skillName}</SkillActivationTitle>
                            <SkillActivationText>
                              {activation.action}
                              {activation.toolName ? ` · ${activation.toolName}` : ''}
                              {activation.error ? ` · ${activation.error}` : ''}
                            </SkillActivationText>
                          </SkillActivationItem>
                        ))}
                      </SkillActivationList>
                    )}
                  </MessageStack>
                </MessageBubble>
              ))
            )}
            <div ref={messagesEndRef} />
          </MessagesInner>
        </Scrollbar>
      </MessagesContainer>

      {/* Attached images preview */}
      {attachedImages.length > 0 && (
        <AttachedImagesContainer>
          {attachedImages.map((img) => (
            <AttachedImageItem key={img.id}>
              <AttachedImagePreview src={img.preview} alt={img.file.name} />
              <RemoveImageButton onClick={() => handleRemoveImage(img.id)}>
                <X size={12} />
              </RemoveImageButton>
            </AttachedImageItem>
          ))}
        </AttachedImagesContainer>
      )}

      <InputContainer>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
        <Tooltip title={t('artifacts.attach_image')}>
          <AttachButton onClick={handleImageAttach} disabled={isRefining}>
            <PaperClipOutlined />
          </AttachButton>
        </Tooltip>
        <StyledTextArea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={t('artifacts.refinement_placeholder')}
          rows={1}
          disabled={isRefining}
        />
        <SendIconButton
          onClick={handleSendMessage}
          disabled={(!inputValue.trim() && attachedImages.length === 0) || isRefining}
          $loading={isRefining}>
          <SendOutlined />
        </SendIconButton>
      </InputContainer>
    </Container>
  )
}

// Styled components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
`

const HeaderIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
`

const HeaderTitle = styled.div`
  font-weight: 500;
  font-size: 14px;
  color: var(--color-text);
`

const MessagesContainer = styled.div`
  flex: 1;
  overflow: hidden;
`

const MessagesInner = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
`

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
`

const EmptyIcon = styled.div`
  color: var(--color-text-3);
  margin-bottom: 12px;
`

const EmptyText = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-2);
  margin-bottom: 4px;
`

const EmptyHint = styled.div`
  font-size: 12px;
  color: var(--color-text-3);
`

const MessageBubble = styled.div<{ $isUser: boolean }>`
  display: flex;
  gap: 8px;
  flex-direction: ${(props) => (props.$isUser ? 'row-reverse' : 'row')};
`

const MessageStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 80%;
`

const MessageAvatar = styled.div<{ $isUser: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${(props) => (props.$isUser ? 'var(--color-primary)' : 'var(--color-background-mute)')};
  color: ${(props) => (props.$isUser ? 'white' : 'var(--color-text-2)')};
  flex-shrink: 0;
  font-size: 12px;
`

const MessageContent = styled.div<{ $isUser: boolean; $isStreaming?: boolean }>`
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.5;
  background: ${(props) => (props.$isUser ? 'var(--color-primary)' : 'var(--color-background)')};
  color: ${(props) => (props.$isUser ? 'white' : 'var(--color-text)')};
  border: ${(props) => (props.$isUser ? 'none' : '1px solid var(--color-border)')};
  white-space: pre-wrap;
  opacity: ${(props) => (props.$isStreaming ? 0.9 : 1)};
`

const SkillActivationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const SkillActivationItem = styled.div`
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  border-radius: 8px;
  padding: 6px 8px;
`

const SkillActivationTitle = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: var(--color-primary);
`

const SkillActivationText = styled.div`
  font-size: 11px;
  color: var(--color-text-2);
  line-height: 1.4;
`

const StreamingCursor = styled.span`
  display: inline-block;
  width: 2px;
  height: 14px;
  background: var(--color-text);
  margin-left: 2px;
  animation: blink 1s step-end infinite;

  @keyframes blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
  }
`

const AttachedImagesContainer = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px 16px;
  overflow-x: auto;
  background: var(--color-background-soft);
`

const AttachedImageItem = styled.div`
  position: relative;
  flex-shrink: 0;
`

const AttachedImagePreview = styled.img`
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--color-border);
`

const RemoveImageButton = styled.button`
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: var(--color-error);
  color: white;
  cursor: pointer;
  transition: transform 0.15s ease;

  &:hover {
    transform: scale(1.1);
  }
`

const AttachButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-2);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: var(--color-background-mute);
    color: var(--color-text);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .anticon {
    font-size: 16px;
  }
`

const InputContainer = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 12px 16px 16px;
  background: var(--color-background-soft);

  /* Flat 2.0 design - no border-top */
`

const StyledTextArea = styled.textarea`
  flex: 1;
  min-height: 40px;
  max-height: 120px;
  padding: 10px 14px;
  border: none;
  border-radius: 12px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  outline: none;
  transition: all 0.2s ease;

  &::placeholder {
    color: var(--color-text-3);
  }

  &:focus {
    box-shadow: 0 0 0 2px var(--color-primary-soft);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Dark mode adjustments for better contrast */
  .dark & {
    background: rgba(255, 255, 255, 0.06);
  }
`

const SendIconButton = styled.button<{ $loading: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 10px;
  background: var(--color-primary);
  color: white;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: var(--color-primary-soft);
    transform: scale(1.02);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .anticon {
    font-size: 16px;
  }

  /* Loading animation */
  ${(props) =>
    props.$loading &&
    `
    animation: pulse 1s infinite;
    @keyframes pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }
  `}
`

export default memo(ArtifactChatPanel)
