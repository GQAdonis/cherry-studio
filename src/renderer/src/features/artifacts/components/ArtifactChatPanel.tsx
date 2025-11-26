/**
 * Artifact Chat Panel Component
 *
 * Chat interface for artifact refinement with:
 * - Message list showing refinement history
 * - Rich content display (thinking, web search, knowledge base, MCP tools)
 * - Input field for new refinement requests
 * - Connection to AI provider for streaming responses
 */

import { DeleteOutlined, SendOutlined } from '@ant-design/icons'
import Spinner from '@renderer/components/Spinner'
import ThinkingEffect from '@renderer/components/ThinkingEffect'
import { useAppDispatch, useAppSelector } from '@renderer/store'
import { clearRefinementMessages, selectIsRefining, selectRefinementMessages } from '@renderer/store/artifacts'
import { Button, Input, Tooltip } from 'antd'
import { Brain, Database, Globe, Wrench } from 'lucide-react'
import type { FC } from 'react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import { useArtifactRefinement } from '../hooks/useArtifactRefinement'
import type { Artifact, RefinementMessage } from '../types'

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
 * Format thinking time for display
 */
function formatThinkingTime(ms?: number): React.ReactNode {
  if (!ms) return 'Thinking...'
  const seconds = Math.floor(ms / 1000)
  return `Thinking... ${seconds}s`
}

/**
 * Render a single message with all its rich content blocks
 */
const MessageRenderer: FC<{ message: RefinementMessage; t: (key: string) => string }> = memo(({ message, t }) => {
  // Determine if this message has any in-progress indicators
  const hasInProgressIndicator = message.isThinking || message.isSearching || message.isKnowledgeSearching || message.isMcpToolRunning

  return (
    <MessageBubble $role={message.role}>
      {/* Thinking Block */}
      {(message.isThinking || message.thinking) && (
        <ThinkingBlock>
          <ThinkingEffect
            isThinking={message.isThinking || false}
            thinkingTimeText={formatThinkingTime(message.thinkingTime)}
            content={message.thinking || ''}
            expanded={false}
          />
        </ThinkingBlock>
      )}

      {/* Web Search Status/Results */}
      {message.isSearching && (
        <StatusIndicator>
          <Globe size={14} />
          <Spinner text={t('message.searching')} />
        </StatusIndicator>
      )}
      {message.webSearchResults && message.webSearchResults.results && (
        <SearchResultsBlock>
          <SearchResultsHeader>
            <Globe size={14} />
            <span>{t('message.web_search_results') || 'Web Search Results'}</span>
            <span className="count">({message.webSearchResults.results.length || 0})</span>
          </SearchResultsHeader>
          <SearchResultsList>
            {message.webSearchResults.results.slice(0, 5).map((result, idx) => (
              <SearchResultItem key={idx}>
                <a href={result.url} target="_blank" rel="noopener noreferrer">
                  {result.title || result.url}
                </a>
              </SearchResultItem>
            ))}
          </SearchResultsList>
        </SearchResultsBlock>
      )}

      {/* Knowledge Base Status/Results */}
      {message.isKnowledgeSearching && (
        <StatusIndicator>
          <Database size={14} />
          <Spinner text={t('message.searching_knowledge') || 'Searching knowledge base...'} />
        </StatusIndicator>
      )}
      {message.knowledgeResults && message.knowledgeResults.length > 0 && (
        <KnowledgeResultsBlock>
          <SearchResultsHeader>
            <Database size={14} />
            <span>{t('message.knowledge_results') || 'Knowledge Base'}</span>
            <span className="count">({message.knowledgeResults.length})</span>
          </SearchResultsHeader>
          <SearchResultsList>
            {message.knowledgeResults.slice(0, 5).map((ref, idx) => (
              <SearchResultItem key={idx}>
                <span>{ref.content?.slice(0, 100)}...</span>
              </SearchResultItem>
            ))}
          </SearchResultsList>
        </KnowledgeResultsBlock>
      )}

      {/* MCP Tool Status/Results */}
      {message.isMcpToolRunning && (
        <StatusIndicator>
          <Wrench size={14} />
          <Spinner text={t('message.running_tool') || 'Running tool...'} />
        </StatusIndicator>
      )}
      {message.mcpTools && message.mcpTools.length > 0 && (
        <McpToolsBlock>
          <SearchResultsHeader>
            <Wrench size={14} />
            <span>{t('message.tool_results') || 'Tool Results'}</span>
            <span className="count">({message.mcpTools.length})</span>
          </SearchResultsHeader>
          <ToolResultsList>
            {message.mcpTools.map((tool, idx) => (
              <ToolResultItem key={idx}>
                <span className="tool-name">{tool.tool?.name || 'Tool'}</span>
                <span className="tool-status">✓</span>
              </ToolResultItem>
            ))}
          </ToolResultsList>
        </McpToolsBlock>
      )}

      {/* Main Text Content */}
      <MessageContent>
        {message.content || (message.isStreaming && !hasInProgressIndicator && <TypingIndicator />)}
      </MessageContent>

      <MessageTime>{formatTime(message.timestamp)}</MessageTime>
    </MessageBubble>
  )
})

MessageRenderer.displayName = 'MessageRenderer'

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

  // Use the refinement hook for AI integration
  const { sendRefinement } = useArtifactRefinement({
    artifact,
    onError: (error) => {
      // eslint-disable-next-line no-restricted-syntax
      console.error('Refinement error:', error)
    }
  })

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

    // Send via the refinement hook (which handles AI integration)
    await sendRefinement(trimmedInput)
  }, [inputValue, isRefining, sendRefinement])

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
            <EmptyIcon>
              <Brain size={48} strokeWidth={1} />
            </EmptyIcon>
            <EmptyText>{t('artifacts.refinement_empty')}</EmptyText>
            <EmptyHint>{t('artifacts.refinement_hint')}</EmptyHint>
          </EmptyState>
        ) : (
          <>
            {messages.map((message) => (
              <MessageRenderer key={message.id} message={message} t={t} />
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

// Rich content block styles
const ThinkingBlock = styled.div`
  margin-bottom: 8px;
  
  /* Override ThinkingEffect styles for compact display */
  > div {
    background: var(--color-background-soft);
  }
`

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--color-background-soft);
  border-radius: 8px;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--color-text-2);
  
  svg {
    flex-shrink: 0;
  }
`

const SearchResultsBlock = styled.div`
  background: var(--color-background-soft);
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 8px;
`

const KnowledgeResultsBlock = styled(SearchResultsBlock)``

const McpToolsBlock = styled(SearchResultsBlock)``

const SearchResultsHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-2);
  margin-bottom: 6px;
  
  svg {
    flex-shrink: 0;
  }
  
  .count {
    color: var(--color-text-3);
    font-weight: normal;
  }
`

const SearchResultsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const SearchResultItem = styled.div`
  font-size: 11px;
  color: var(--color-text-2);
  padding: 4px 0;
  border-bottom: 1px solid var(--color-border);
  
  &:last-child {
    border-bottom: none;
  }
  
  a {
    color: var(--color-link);
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
`

const ToolResultsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const ToolResultItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  padding: 4px 0;
  
  .tool-name {
    color: var(--color-text);
    font-family: 'SF Mono', 'Fira Code', monospace;
  }
  
  .tool-status {
    color: var(--color-success, #22c55e);
  }
`

export default memo(ArtifactChatPanel)
