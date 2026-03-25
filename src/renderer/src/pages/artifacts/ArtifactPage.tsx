/**
 * Artifact Studio Page
 *
 * Dedicated artifact-first workspace:
 * - Persistent project/session identity
 * - Left refinement chat + right preview/editor panes
 * - Reopen support independent from conversation lifecycle
 */

import { loggerService } from '@logger'
import { Navbar, NavbarCenter } from '@renderer/components/app/Navbar'
import {
  getArtifact as getArtifactFromDb,
  getArtifactProject,
  getArtifactStudioSession,
  getArtifactVersions,
  saveArtifactProject,
  upsertArtifactStudioSession
} from '@renderer/features/artifacts/db/artifactDb'
import { useArtifactHtmxServer } from '@renderer/features/artifacts/hooks/useArtifactHtmxServer'
import type {
  ArtifactDiagnosticSnapshot,
  ArtifactProject,
  ArtifactProjectContextEnvelope,
  ArtifactProjectSeedPayload,
  ArtifactRefinementIntent,
  ArtifactSelection
} from '@renderer/features/artifacts/types'
import { normalizeContextEnvelope, resolveArtifactProjectRuntimeContext } from '@renderer/features/artifacts/utils'
import { useAppNavigate, useAppParams } from '@renderer/hooks/useAppNavigate'
import { getKnowledgeBaseParams } from '@renderer/services/KnowledgeService'
import { useAppDispatch, useAppSelector } from '@renderer/store'
import {
  openArtifact,
  openExistingArtifact,
  selectActiveArtifact,
  selectActiveProjectContextEnvelope,
  selectActiveRefinementIntent,
  selectActiveSelection,
  selectActiveStudioSessionId,
  selectCurrentVersionIndex,
  selectHtmxServerPort,
  selectLatestDiagnostics,
  selectRefinementMessages,
  selectVersionHistory,
  selectViewMode,
  setActiveProjectContextEnvelope,
  setActiveProjectId,
  setActiveProjectResolvedContext,
  setActiveStudioSessionId,
  setRefinementContext,
  setRefinementMessages,
  setVersionHistoryState,
  setViewMode
} from '@renderer/store/artifacts'
import { addBase } from '@renderer/store/knowledge'
import { selectArtifactStudioSettings } from '@renderer/store/settings'
import { addNoteThunk } from '@renderer/store/thunk/knowledgeThunk'
import type { KnowledgeBase } from '@renderer/types'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import ArtifactChatPanel from './components/ArtifactChatPanel'
import ArtifactHeader from './components/ArtifactHeader'
import ArtifactPreviewPane from './components/ArtifactPreviewPane'
import ResizablePanes from './components/ResizablePanes'

const logger = loggerService.withContext('ArtifactPage')

const ArtifactPage: React.FC = () => {
  const { artifactId, projectId } = useAppParams()
  const { t } = useTranslation()
  const navigate = useAppNavigate()
  const dispatch = useAppDispatch()

  const activeArtifact = useAppSelector(selectActiveArtifact)
  const activeProjectContextEnvelope = useAppSelector(selectActiveProjectContextEnvelope)
  const activeRefinementIntent = useAppSelector(selectActiveRefinementIntent)
  const activeSelection = useAppSelector(selectActiveSelection)
  const viewMode = useAppSelector(selectViewMode)
  const activeStudioSessionId = useAppSelector(selectActiveStudioSessionId)
  const latestDiagnostics = useAppSelector(selectLatestDiagnostics)
  const refinementMessages = useAppSelector(selectRefinementMessages)
  const versionHistory = useAppSelector(selectVersionHistory)
  const currentVersionIndex = useAppSelector(selectCurrentVersionIndex)
  const htmxServerPort = useAppSelector(selectHtmxServerPort)
  const artifactStudioSettings = useAppSelector(selectArtifactStudioSettings)
  const assistants = useAppSelector((state) => state.assistants.assistants)
  const quickModel = useAppSelector((state) => state.llm.quickModel)
  const knowledgeBases = useAppSelector((state) => state.knowledge.bases)

  const [isLoading, setIsLoading] = useState(true)
  const sendRefinementRef = useRef<
    | ((
        prompt: string,
        options?: {
          intent?: ArtifactRefinementIntent
          selection?: ArtifactSelection | null
          diagnostics?: ArtifactDiagnosticSnapshot[]
        }
      ) => Promise<void>)
    | null
  >(null)
  useArtifactHtmxServer(activeArtifact?.type === 'htmx')

  const resolvedProjectId = useMemo(() => {
    if (projectId) {
      return projectId
    }
    if (artifactId) {
      return `legacy-${artifactId}`
    }
    return null
  }, [artifactId, projectId])

  useEffect(() => {
    const resolveConversationOverrides = (
      conversationId?: string
    ): Partial<ArtifactProjectContextEnvelope> | undefined => {
      if (!conversationId) {
        return undefined
      }
      for (const assistant of assistants) {
        const topic = assistant.topics?.find((candidate) => candidate.id === conversationId)
        if (!topic) {
          continue
        }
        const llm = {
          modelId: assistant.model?.id,
          providerId: assistant.model?.provider,
          temperature: assistant.settings?.temperature,
          topP: assistant.settings?.topP,
          maxTokens: assistant.settings?.maxTokens,
          streamOutput: assistant.settings?.streamOutput
        }
        const hasLlmOverrides = Object.values(llm).some((value) => value !== undefined)
        return {
          llm: hasLlmOverrides ? llm : undefined,
          skills: topic.skillScope || assistant.settings?.skillScope,
          contextManagement: topic.contextStrategy || assistant.settings?.contextStrategy,
          knowledge: {
            knowledgeBaseIds: assistant.knowledge_bases?.map((base) => base.id) || []
          }
        }
      }
      return undefined
    }

    const resolveAndDispatchProjectContext = (params: {
      sourceEnvelope?: ArtifactProjectContextEnvelope | null
      conversationId?: string
      overridePolicy?: ArtifactProject['overridePolicy']
    }) => {
      const { sourceEnvelope, conversationId, overridePolicy } = params
      const resolved = resolveArtifactProjectRuntimeContext({
        sourceEnvelope,
        conversationOverrides: resolveConversationOverrides(conversationId),
        globalDefaults: artifactStudioSettings?.defaults,
        overridePolicy: overridePolicy || artifactStudioSettings?.overridePolicy
      })
      dispatch(setActiveProjectContextEnvelope(sourceEnvelope ? normalizeContextEnvelope(sourceEnvelope) : null))
      dispatch(setActiveProjectResolvedContext(resolved))
      logger.info('Resolved artifact studio runtime context', {
        resolvedFrom: resolved.resolvedFrom,
        projectId: resolvedProjectId,
        conversationId
      })
    }

    const ensureKnowledgeBridgeFromContext = async (params: {
      projectId: string
      title?: string
      contextMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
      contextEnvelope: ArtifactProjectContextEnvelope
      enabled: boolean
    }): Promise<ArtifactProjectContextEnvelope> => {
      const { projectId, title, contextMessages, contextEnvelope, enabled } = params
      if (!enabled || contextMessages.length === 0) {
        return contextEnvelope
      }

      const knowledgeBaseId = contextEnvelope.knowledge?.knowledgeBridgeBaseId || `artifact-bridge-${projectId}`
      const existingBase = knowledgeBases.find((base) => base.id === knowledgeBaseId)
      if (!existingBase) {
        const bridgeBase: KnowledgeBase = {
          id: knowledgeBaseId,
          name: `Artifact Studio Context - ${title || projectId}`,
          model: quickModel,
          items: [],
          created_at: Date.now(),
          updated_at: Date.now(),
          version: 1
        }
        await window.api.knowledgeBase.create(getKnowledgeBaseParams(bridgeBase))
        dispatch(addBase(bridgeBase))
      }

      const transcript = contextMessages.map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n')
      if (transcript.trim()) {
        await dispatch(addNoteThunk(knowledgeBaseId, transcript) as any)
      }

      return normalizeContextEnvelope({
        ...contextEnvelope,
        knowledge: {
          knowledgeBaseIds: Array.from(
            new Set([...(contextEnvelope.knowledge?.knowledgeBaseIds || []), knowledgeBaseId])
          ),
          linkedKnowledgeBaseIds: Array.from(
            new Set([...(contextEnvelope.knowledge?.linkedKnowledgeBaseIds || []), knowledgeBaseId])
          ),
          knowledgeBridgeBaseId: knowledgeBaseId,
          knowledgeBridgeEnabled: true
        }
      })
    }

    const bootstrap = async () => {
      if (!resolvedProjectId) {
        navigate('/artifacts')
        return
      }

      try {
        dispatch(setActiveProjectId(resolvedProjectId))
        const existingProject = await getArtifactProject(resolvedProjectId)

        if (existingProject) {
          await loadExistingProject(existingProject)
          setIsLoading(false)
          return
        }

        const seeded = await loadFromSeed(resolvedProjectId)
        if (seeded) {
          setIsLoading(false)
          return
        }

        // Backward-compatible path: /artifacts/:artifactId from library.
        if (artifactId) {
          const artifact = await getArtifactFromDb(artifactId)
          if (artifact) {
            const projectContextEnvelope = normalizeContextEnvelope({
              llm: artifactStudioSettings?.defaults.llm,
              skills: artifactStudioSettings?.defaults.skills,
              contextManagement: artifactStudioSettings?.defaults.contextManagement,
              knowledge: {
                knowledgeBaseIds: artifactStudioSettings?.defaults.knowledge.knowledgeBaseIds || []
              },
              source: {
                sourceType: 'unknown',
                conversationId: artifact.conversationId,
                messageId: artifact.messageId,
                capturedAt: new Date().toISOString()
              }
            })
            dispatch(
              openExistingArtifact({
                ...artifact,
                artifactProjectId: resolvedProjectId,
                metadata: {
                  ...artifact.metadata,
                  artifactProjectId: resolvedProjectId
                }
              })
            )
            await saveArtifactProject({
              id: resolvedProjectId,
              title: artifact.title,
              artifactType: artifact.type,
              source: 'library',
              status: 'active',
              createdFrom: 'legacy',
              artifactId: artifact.id,
              runtimeProfile: 'standard',
              contextEnvelope: projectContextEnvelope,
              overridePolicy: artifactStudioSettings?.overridePolicy,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastViewMode: 'preview',
              lastArtifactVersion: artifact.version
            })
            resolveAndDispatchProjectContext({
              sourceEnvelope: projectContextEnvelope,
              conversationId: artifact.conversationId
            })
            setIsLoading(false)
            return
          }
        }

        navigate('/artifacts')
      } catch (error) {
        logger.error('Failed to bootstrap artifact studio page', error as Error)
        navigate('/artifacts')
      } finally {
        setIsLoading(false)
      }
    }

    const loadExistingProject = async (project: ArtifactProject) => {
      const artifact = project.artifactId ? await getArtifactFromDb(project.artifactId) : null
      const session = await getArtifactStudioSession(project.id)

      if (!artifact) {
        return
      }

      dispatch(
        openExistingArtifact({
          ...artifact,
          content: session?.content || artifact.content,
          artifactProjectId: project.id,
          metadata: {
            ...artifact.metadata,
            artifactProjectId: project.id
          }
        })
      )
      resolveAndDispatchProjectContext({
        sourceEnvelope: project.contextEnvelope,
        conversationId: project.conversationId,
        overridePolicy: project.overridePolicy
      })
      const resolvedViewMode =
        (session?.viewMode || project.lastViewMode) === 'split' ? 'preview' : session?.viewMode || project.lastViewMode
      dispatch(setViewMode(resolvedViewMode))
      if (session) {
        dispatch(setActiveStudioSessionId(session.id))
        dispatch(
          setRefinementContext({
            intent: session.activeIntent,
            selection: session.selection,
            diagnostics: session.diagnostics
          })
        )
      }
      dispatch(setRefinementMessages(session?.refinementMessages || []))
      if (session?.versionHistory && typeof session.currentVersionIndex === 'number') {
        dispatch(
          setVersionHistoryState({
            versionHistory: session.versionHistory,
            currentVersionIndex: session.currentVersionIndex
          })
        )
      } else {
        const persistedVersions = await getArtifactVersions(artifact.id)
        dispatch(
          setVersionHistoryState({
            versionHistory: persistedVersions,
            currentVersionIndex: persistedVersions.length
          })
        )
      }
    }

    const loadFromSeed = async (currentProjectId: string): Promise<boolean> => {
      const seedKey = `artifact-project-seed:${currentProjectId}`
      const seedRaw = sessionStorage.getItem(seedKey)
      if (!seedRaw) {
        return false
      }

      const seed = JSON.parse(seedRaw) as ArtifactProjectSeedPayload
      sessionStorage.removeItem(seedKey)

      if (seed.source === 'library' && seed.artifactId) {
        const artifact = await getArtifactFromDb(seed.artifactId)
        if (!artifact) {
          return false
        }
        const projectContextEnvelope = seed.contextEnvelope
          ? normalizeContextEnvelope(seed.contextEnvelope)
          : normalizeContextEnvelope({
              llm: artifactStudioSettings?.defaults.llm,
              skills: artifactStudioSettings?.defaults.skills,
              contextManagement: artifactStudioSettings?.defaults.contextManagement,
              knowledge: {
                knowledgeBaseIds:
                  seed.sourceKnowledgeBaseIds || artifactStudioSettings?.defaults.knowledge.knowledgeBaseIds || []
              },
              source: {
                sourceType: 'unknown',
                conversationId: artifact.conversationId,
                messageId: artifact.messageId,
                capturedAt: new Date().toISOString()
              }
            })

        dispatch(
          openExistingArtifact({
            ...artifact,
            artifactProjectId: currentProjectId,
            metadata: {
              ...artifact.metadata,
              artifactProjectId: currentProjectId
            }
          })
        )
        await saveArtifactProject({
          id: currentProjectId,
          title: artifact.title,
          artifactType: artifact.type,
          source: 'library',
          status: 'active',
          createdFrom: 'library-seeded',
          artifactId: artifact.id,
          runtimeProfile: 'standard',
          contextEnvelope: projectContextEnvelope,
          overridePolicy: artifactStudioSettings?.overridePolicy,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastViewMode: 'preview',
          lastArtifactVersion: artifact.version
        })
        resolveAndDispatchProjectContext({
          sourceEnvelope: projectContextEnvelope,
          conversationId: artifact.conversationId
        })
        return true
      }

      if (seed.artifact && seed.conversationId && seed.messageId) {
        const contextMessages = seed.contextMessages || []
        let projectContextEnvelope = normalizeContextEnvelope(
          seed.contextEnvelope || {
            llm: artifactStudioSettings?.defaults.llm,
            skills: artifactStudioSettings?.defaults.skills,
            contextManagement: artifactStudioSettings?.defaults.contextManagement,
            knowledge: {
              knowledgeBaseIds:
                seed.sourceKnowledgeBaseIds || artifactStudioSettings?.defaults.knowledge.knowledgeBaseIds || []
            },
            source: {
              sourceType: 'conversation',
              conversationId: seed.conversationId,
              messageId: seed.messageId,
              capturedAt: new Date().toISOString()
            }
          }
        )
        const shouldCreateKnowledgeBridge =
          projectContextEnvelope.knowledge?.knowledgeBridgeEnabled ||
          artifactStudioSettings?.defaults.knowledge.autoCreateFromChatHistory ||
          false
        try {
          projectContextEnvelope = await ensureKnowledgeBridgeFromContext({
            projectId: currentProjectId,
            title: seed.artifact.title,
            contextMessages,
            contextEnvelope: projectContextEnvelope,
            enabled: shouldCreateKnowledgeBridge
          })
        } catch (error) {
          logger.warn('Failed to create artifact knowledge bridge from source context', {
            projectId: currentProjectId,
            error
          })
        }

        dispatch(
          openArtifact({
            parsedArtifact: seed.artifact,
            conversationId: seed.conversationId,
            messageId: seed.messageId,
            artifactProjectId: currentProjectId,
            contextMessages,
            contextEnvelope: projectContextEnvelope
          })
        )
        await saveArtifactProject({
          id: currentProjectId,
          title: seed.artifact.title,
          artifactType: seed.artifact.type,
          source: seed.source === 'template' ? 'scratch' : seed.source || 'template',
          status: 'active',
          createdFrom: seed.source === 'template' ? 'scratch' : 'chat-seeded',
          runtimeProfile: 'standard',
          conversationId: seed.conversationId,
          messageId: seed.messageId,
          contextEnvelope: projectContextEnvelope,
          overridePolicy: artifactStudioSettings?.overridePolicy,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastViewMode: 'preview',
          lastArtifactVersion: 1
        })
        resolveAndDispatchProjectContext({
          sourceEnvelope: projectContextEnvelope,
          conversationId: seed.conversationId
        })
        dispatch(setViewMode('preview'))
        return true
      }

      return false
    }

    bootstrap()
  }, [
    artifactId,
    artifactStudioSettings,
    assistants,
    knowledgeBases,
    quickModel,
    resolvedProjectId,
    dispatch,
    navigate
  ])

  useEffect(() => {
    const persistStudioSession = async () => {
      if (!resolvedProjectId || !activeArtifact || isLoading) {
        return
      }

      const sessionId = activeStudioSessionId || `session-${resolvedProjectId}`
      if (!activeStudioSessionId) {
        dispatch(setActiveStudioSessionId(sessionId))
      }

      await upsertArtifactStudioSession({
        id: sessionId,
        projectId: resolvedProjectId,
        artifactId: activeArtifact.id,
        viewMode,
        content: activeArtifact.content,
        revisionPointer: activeArtifact.version,
        refinementMessages,
        versionHistory,
        currentVersionIndex,
        activeIntent: activeRefinementIntent || 'extend',
        selection: activeSelection || undefined,
        diagnostics: latestDiagnostics,
        updatedAt: new Date().toISOString()
      })

      const existingProject = await getArtifactProject(resolvedProjectId)
      await saveArtifactProject({
        id: resolvedProjectId,
        title: activeArtifact.title,
        artifactType: activeArtifact.type,
        source: existingProject?.source || 'standalone',
        status: existingProject?.status || 'active',
        createdFrom: existingProject?.createdFrom || 'legacy',
        conversationId: activeArtifact.conversationId,
        messageId: activeArtifact.messageId,
        artifactId: activeArtifact.id,
        runtimeProfile: 'standard',
        contextEnvelope: activeProjectContextEnvelope || existingProject?.contextEnvelope,
        overridePolicy: existingProject?.overridePolicy || artifactStudioSettings?.overridePolicy,
        lastRunSummary: existingProject?.lastRunSummary,
        createdAt: activeArtifact.createdAt,
        updatedAt: new Date().toISOString(),
        lastViewMode: viewMode,
        lastArtifactVersion: activeArtifact.version
      })
    }

    persistStudioSession().catch((error) => {
      logger.error('Failed to persist artifact studio session', error as Error)
    })
  }, [
    activeArtifact,
    activeProjectContextEnvelope,
    activeRefinementIntent,
    activeSelection,
    activeStudioSessionId,
    currentVersionIndex,
    artifactStudioSettings?.overridePolicy,
    dispatch,
    isLoading,
    latestDiagnostics,
    refinementMessages,
    resolvedProjectId,
    versionHistory,
    viewMode
  ])

  const handleClose = () => {
    navigate('/artifacts')
  }

  const handleViewModeChange = (mode: 'preview' | 'code') => {
    dispatch(setViewMode(mode))
  }

  const handleSendRefinementReady = (
    sendRefinement: (
      prompt: string,
      options?: {
        intent?: ArtifactRefinementIntent
        selection?: ArtifactSelection | null
        diagnostics?: ArtifactDiagnosticSnapshot[]
      }
    ) => Promise<void>
  ) => {
    sendRefinementRef.current = sendRefinement
  }

  const handleAutoFixSend = (
    message: string,
    options?: {
      intent: 'fix'
      diagnostics: ArtifactDiagnosticSnapshot[]
    }
  ) => {
    if (!sendRefinementRef.current) {
      logger.warn('Auto-fix requested before refinement sender was registered')
      return
    }
    void sendRefinementRef.current(message, options)
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

  const safeViewMode: 'preview' | 'code' = viewMode === 'code' ? 'code' : 'preview'

  return (
    <Container>
      <ArtifactHeader
        title={activeArtifact.title}
        viewMode={safeViewMode}
        onViewModeChange={handleViewModeChange}
        onClose={handleClose}
        artifact={activeArtifact}
      />
      <MainContent>
        <ResizablePanes
          left={<ArtifactChatPanel artifact={activeArtifact} onSendRefinementReady={handleSendRefinementReady} />}
          right={
            <ArtifactPreviewPane
              artifact={activeArtifact}
              viewMode={safeViewMode}
              onViewModeChange={handleViewModeChange}
              onSendAutoFix={handleAutoFixSend}
              htmxServerPort={htmxServerPort}
            />
          }
          storageKey={`artifact-studio-width:${resolvedProjectId || 'default'}`}
          initialLeftWidth={360}
        />
      </MainContent>
    </Container>
  )
}

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
