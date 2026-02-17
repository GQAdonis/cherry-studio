import { TopicManager } from '@renderer/hooks/useTopic'
import store from '@renderer/store'
import type { Assistant, Topic } from '@renderer/types'
import type { Message } from '@renderer/types/newMessage'
import { getMainTextContent } from '@renderer/utils/messageUtils/find'
import type { NavigateFunction } from 'react-router-dom'

import type { ArtifactProjectContextEnvelope, ArtifactProjectSeedPayload, ParsedArtifact } from '../types'
import { normalizeContextEnvelope } from './projectContext'

interface OpenArtifactStudioParams {
  artifact: ParsedArtifact
  conversationId: string
  messageId: string
  navigate: NavigateFunction
}

const DEFAULT_CONTEXT_WINDOW = 5

const createProjectId = () => `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

function findSourceContext(conversationId: string): { assistant?: Assistant; topic?: Topic } {
  const assistants = store.getState().assistants.assistants
  for (const assistant of assistants) {
    const topic = assistant.topics?.find((item) => item.id === conversationId)
    if (topic) {
      return { assistant, topic }
    }
  }
  return {}
}

function extractMessageContent(message: Message): string {
  const fromBlocks = getMainTextContent(message)
  if (fromBlocks?.trim()) {
    return fromBlocks
  }
  return ((message as unknown as { content?: string }).content || '').trim()
}

function buildContextEnvelope(params: {
  conversationId: string
  messageId: string
  assistant?: Assistant
  topic?: Topic
}): ArtifactProjectContextEnvelope {
  const { conversationId, messageId, assistant, topic } = params
  const assistantModel = assistant?.model
  const assistantSettings = assistant?.settings

  return normalizeContextEnvelope({
    llm: {
      modelId: assistantModel?.id,
      providerId: assistantModel?.provider,
      temperature: assistantSettings?.temperature,
      topP: assistantSettings?.topP,
      maxTokens: assistantSettings?.maxTokens,
      streamOutput: assistantSettings?.streamOutput
    },
    skills: topic?.skillScope || assistant?.settings?.skillScope,
    contextManagement: topic?.contextStrategy || assistant?.settings?.contextStrategy,
    knowledge: {
      knowledgeBaseIds: assistant?.knowledge_bases?.map((base) => base.id) || [],
      linkedKnowledgeBaseIds: [],
      knowledgeBridgeEnabled: false
    },
    source: {
      sourceType: topic ? 'conversation' : 'unknown',
      assistantId: assistant?.id,
      topicId: topic?.id,
      conversationId,
      messageId,
      capturedAt: new Date().toISOString()
    }
  })
}

export function detectHtmlArtifactType(content: string): ParsedArtifact['type'] {
  const normalized = content.toLowerCase()

  if (normalized.includes('<?xml') || normalized.includes('xmlns="http://www.w3.org/1999/xhtml"')) {
    return 'xhtml'
  }

  if (
    /\bhx-(get|post|put|patch|delete|trigger|target|swap|boost|include|vals|headers|confirm|push-url)\b/i.test(content)
  ) {
    return 'htmx'
  }

  return 'html'
}

export async function openArtifactStudioFromChat({
  artifact,
  conversationId,
  messageId,
  navigate
}: OpenArtifactStudioParams): Promise<void> {
  let contextMessages: Message[] = []
  const { assistant, topic } = findSourceContext(conversationId)

  try {
    if (conversationId && !conversationId.startsWith('inline-')) {
      const messages = await TopicManager.getTopicMessages(conversationId)
      contextMessages = messages.slice(-DEFAULT_CONTEXT_WINDOW)
    }
  } catch {
    // Context is best effort only; studio can still open without history.
  }

  const projectId = createProjectId()
  const contextEnvelope = buildContextEnvelope({
    conversationId,
    messageId,
    assistant,
    topic
  })
  const seedPayload: ArtifactProjectSeedPayload = {
    source: 'chat',
    artifact,
    conversationId,
    messageId,
    contextMessages: contextMessages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: extractMessageContent(msg)
    })),
    contextEnvelope,
    sourceKnowledgeBaseIds: contextEnvelope.knowledge?.knowledgeBaseIds || []
  }

  sessionStorage.setItem(`artifact-project-seed:${projectId}`, JSON.stringify(seedPayload))
  navigate(`/artifacts/studio/${projectId}`)
}
