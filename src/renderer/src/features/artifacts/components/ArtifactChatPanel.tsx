/**
 * Artifact Chat Panel Component
 *
 * Chat interface for artifact refinement with:
 * - Message list showing refinement history
 * - Input field for new refinement requests
 * - Connection to AI provider for streaming responses
 */

import { DeleteOutlined, SendOutlined } from '@ant-design/icons'
import { useAppDispatch, useAppSelector } from '@renderer/store'
import {
  addRefinementMessage,
  clearRefinementMessages,
  selectIsRefining,
  selectRefinementMessages,
  setIsRefining,
  updateRefinementMessage
} from '@renderer/store/artifacts'
import { Button, Input, Tooltip } from 'antd'
import type { FC } from 'react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import type { Artifact } from '../types'

interface ArtifactChatPanelProps {
  /** The artifact being refined */
  artifact: Artifact
}

/**
 * Format timestamp for display
 */
function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * Artifact Chat Panel Component
 */
const ArtifactChatPanel: FC<ArtifactChatPanelProps> = ({ artifact }) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const messages = useAppSelector(selectRefinementMessages)
  const isRefining = useAppSelector(selectIsRefining)

  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
  }, [])

  // Handle send message
  const handleSend = useCallback(async () => {
    const trimmedInput = inputValue.trim()
    if (!trimmedInput || isRefining) return

    // Clear input
    setInputValue('')

    // Add user message
    dispatch(
      addRefinementMessage({
        role: 'user',
        content: trimmedInput
      })
    )

    // Set refining state
    dispatch(setIsRefining(true))

    // Add placeholder assistant message
    const assistantMessageId = `assistant-${Date.now()}`
    dispatch(
      addRefinementMessage({
        role: 'assistant',
        content: '',
        isStreaming: true
      })
    )

    try {
      // TODO: Connect to AI provider for actual refinement using:
      //   buildRefinementSystemPrompt(artifact), buildRefinementUserPrompt(trimmedInput, artifact)
      // For now, simulate a response
      await simulateRefinementResponse(assistantMessageId, trimmedInput, artifact, dispatch)
    } catch (error) {
      // eslint-disable-next-line no-restricted-syntax
      console.error('Refinement error:', error)
      dispatch(
        updateRefinementMessage({
          id: assistantMessageId,
          content: `Error: ${(error as Error).message}`,
          isStreaming: false
        })
      )
    } finally {
      dispatch(setIsRefining(false))
    }
  }, [inputValue, isRefining, artifact, dispatch])

  // Handle key press
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  // Handle clear messages
  const handleClear = useCallback(() => {
    dispatch(clearRefinementMessages())
  }, [dispatch])

  return (
    <Container>
      {/* Header */}
      <PanelHeader>
        <HeaderTitle>{t('artifacts.refinement')}</HeaderTitle>
        <Tooltip title={t('common.clear')}>
          <ClearButton onClick={handleClear} disabled={messages.length === 0}>
            <DeleteOutlined />
          </ClearButton>
        </Tooltip>
      </PanelHeader>

      {/* Messages */}
      <MessagesContainer>
        {messages.length === 0 ? (
          <EmptyState>
            <EmptyIcon>💬</EmptyIcon>
            <EmptyText>{t('artifacts.refinement_empty')}</EmptyText>
            <EmptyHint>{t('artifacts.refinement_hint')}</EmptyHint>
          </EmptyState>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} $role={message.role}>
                <MessageContent>{message.content || (message.isStreaming && <TypingIndicator />)}</MessageContent>
                <MessageTime>{formatTime(message.timestamp)}</MessageTime>
              </MessageBubble>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </MessagesContainer>

      {/* Input Area */}
      <InputArea>
        <StyledTextArea
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          placeholder={t('artifacts.refinement_placeholder')}
          autoSize={{ minRows: 1, maxRows: 4 }}
          disabled={isRefining}
        />
        <SendButton
          type="primary"
          onClick={handleSend}
          disabled={!inputValue.trim() || isRefining}
          icon={<SendOutlined />}>
          {t('common.send')}
        </SendButton>
      </InputArea>
    </Container>
  )
}

/**
 * Build system prompt for refinement
 * @todo Connect to AI provider
 */
export function buildRefinementSystemPrompt(artifact: Artifact): string {
  return `You are an expert developer helping to refine and improve code artifacts.

Current artifact type: ${artifact.type}
Title: ${artifact.title}

When the user asks for changes:
1. Understand the current code structure
2. Make precise, targeted changes
3. Return the complete updated code wrapped in <cs-artifact> tags
4. Preserve the original structure and style where possible
5. Only change what's necessary to fulfill the request

Always respond with the complete updated artifact content.`
}

/**
 * Build user prompt for refinement
 * @todo Connect to AI provider
 */
export function buildRefinementUserPrompt(request: string, artifact: Artifact): string {
  return `Current artifact content:
\`\`\`${artifact.type}
${artifact.content}
\`\`\`

User request: ${request}

Please provide the updated artifact content.`
}

/**
 * Simulate refinement response (placeholder for actual AI integration)
 */
async function simulateRefinementResponse(
  messageId: string,
  request: string,
  artifact: Artifact,
  dispatch: any
): Promise<void> {
  // Simulate typing delay
  const response = `I understand you want to: "${request}"

To implement this change, I would modify the ${artifact.type} artifact. 

Note: This is a simulated response. To enable actual AI refinement, connect this panel to your AI provider.

The updated artifact would include your requested changes while maintaining the existing structure and functionality.`

  // Simulate streaming
  let currentContent = ''
  for (const char of response) {
    currentContent += char
    dispatch(
      updateRefinementMessage({
        id: messageId,
        content: currentContent,
        isStreaming: true
      })
    )
    await new Promise((resolve) => setTimeout(resolve, 10))
  }

  // Mark as complete
  dispatch(
    updateRefinementMessage({
      id: messageId,
      content: currentContent,
      isStreaming: false
    })
  )
}

// Styled components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-background-soft);
`

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
`

const HeaderTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
`

const ClearButton = styled.button<{ disabled?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  color: ${(props) => (props.disabled ? 'var(--color-text-muted)' : 'var(--color-text-soft)')};
  border-radius: 4px;
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: var(--color-background-mute);
    color: var(--color-error, #ef4444);
  }
`

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
`

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
`

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
`

const EmptyText = styled.div`
  font-size: 14px;
  color: var(--color-text-soft);
  margin-bottom: 8px;
`

const EmptyHint = styled.div`
  font-size: 12px;
  color: var(--color-text-muted);
  max-width: 200px;
`

const MessageBubble = styled.div<{ $role: 'user' | 'assistant' | 'system' }>`
  max-width: 85%;
  margin-bottom: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  ${(props) =>
    props.$role === 'user'
      ? `
    margin-left: auto;
    background: var(--color-primary);
    color: white;
    border-bottom-right-radius: 4px;
  `
      : `
    margin-right: auto;
    background: var(--color-background);
    color: var(--color-text);
    border-bottom-left-radius: 4px;
  `}
`

const MessageContent = styled.div`
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
`

const MessageTime = styled.div`
  font-size: 10px;
  opacity: 0.7;
  margin-top: 4px;
  text-align: right;
`

const TypingIndicator = styled.div`
  display: inline-flex;
  gap: 4px;

  &::after {
    content: '...';
    animation: typing 1s infinite;
  }

  @keyframes typing {
    0%,
    100% {
      content: '.';
    }
    33% {
      content: '..';
    }
    66% {
      content: '...';
    }
  }
`

const InputArea = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 12px 16px;
  background: var(--color-background);
  border-top: 1px solid var(--color-border);
`

const StyledTextArea = styled(Input.TextArea)`
  flex: 1;
  resize: none;

  &.ant-input {
    background: var(--color-background-soft);
    border-color: var(--color-border);
    color: var(--color-text);
  }
`

const SendButton = styled(Button)`
  flex-shrink: 0;
`

export default memo(ArtifactChatPanel)
