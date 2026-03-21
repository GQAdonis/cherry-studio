/**
 * Artifact Library Page
 *
 * Lists saved artifacts and Artifact Studio projects.
 */

import { PlusOutlined, StarFilled, StarOutlined } from '@ant-design/icons'
import { Navbar, NavbarCenter } from '@renderer/components/app/Navbar'
import Scrollbar from '@renderer/components/Scrollbar'
import {
  cloneArtifactProject,
  getArtifactProjects,
  setArtifactProjectArchived,
  updateArtifactProject
} from '@renderer/features/artifacts/db/artifactDb'
import type {
  ArtifactProject,
  ArtifactProjectSeedPayload,
  ArtifactType,
  ParsedArtifact
} from '@renderer/features/artifacts/types'
import { normalizeContextEnvelope } from '@renderer/features/artifacts/utils'
import { useAppNavigate } from '@renderer/hooks/useAppNavigate'
import { useAppDispatch, useAppSelector } from '@renderer/store'
import { loadSavedArtifacts, selectSavedArtifacts } from '@renderer/store/artifacts'
import { selectArtifactStudioSettings } from '@renderer/store/settings'
import { Button, Empty, Input, InputNumber, message, Modal, Select, Spin, Switch, Tag } from 'antd'
import { Code, CopyPlus, FileText, Layers, RefreshCcw, Search, Sparkles } from 'lucide-react'
import type { FC } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

const createProjectId = (prefix: string = 'studio') =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const EMPTY_ARTIFACT_BY_TYPE: Record<ArtifactType, ParsedArtifact> = {
  html: {
    identifier: 'artifact-html',
    type: 'html',
    title: 'Untitled HTML Artifact',
    content: '<section><h1>Untitled HTML Artifact</h1><p>Start editing...</p></section>',
    attributes: {},
    startIndex: 0,
    endIndex: 0
  },
  xhtml: {
    identifier: 'artifact-xhtml',
    type: 'xhtml',
    title: 'Untitled XHTML Artifact',
    content:
      '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Untitled XHTML Artifact</title></head><body><section><h1>Untitled XHTML Artifact</h1><p>Start editing...</p></section></body></html>',
    attributes: {},
    startIndex: 0,
    endIndex: 0
  },
  htmx: {
    identifier: 'artifact-htmx',
    type: 'htmx',
    title: 'Untitled HTMX Artifact',
    content:
      '<section><h1>Untitled HTMX Artifact</h1><button hx-get="/api/demo" hx-target="#result">Load</button><div id="result"></div></section>',
    attributes: {},
    startIndex: 0,
    endIndex: 0
  },
  react: {
    identifier: 'artifact-react',
    type: 'react',
    title: 'Untitled React Artifact',
    content:
      'export default function Artifact() {\n  return <section><h1>Untitled React Artifact</h1><p>Start editing...</p></section>\n}',
    attributes: {},
    startIndex: 0,
    endIndex: 0
  },
  a2ui: {
    identifier: 'artifact-a2ui',
    type: 'a2ui',
    title: 'Untitled A2UI Artifact',
    content: JSON.stringify(
      {
        version: 1,
        type: 'page',
        title: 'Untitled A2UI Artifact',
        children: [
          {
            id: 'hero',
            type: 'stack',
            props: { gap: 4 },
            children: [
              { id: 'heading', type: 'heading', props: { level: 1, text: 'Untitled A2UI Artifact' } },
              { id: 'copy', type: 'text', props: { text: 'Start ideating in structured UI form...' } },
              { id: 'cta', type: 'button', props: { label: 'Primary action', variant: 'primary' } }
            ]
          }
        ]
      },
      null,
      2
    ),
    attributes: {},
    startIndex: 0,
    endIndex: 0
  },
  svg: {
    identifier: 'artifact-svg',
    type: 'svg',
    title: 'Untitled SVG Artifact',
    content:
      '<svg width="480" height="240" viewBox="0 0 480 240" xmlns="http://www.w3.org/2000/svg"><rect width="480" height="240" fill="#101828"/><text x="24" y="64" fill="#fff" font-size="28">Untitled SVG Artifact</text></svg>',
    attributes: {},
    startIndex: 0,
    endIndex: 0
  },
  mermaid: {
    identifier: 'artifact-mermaid',
    type: 'mermaid',
    title: 'Untitled Mermaid Artifact',
    content: 'graph TD\n  A[Start] --> B[Edit Artifact]\n  B --> C[Deliver]',
    attributes: {},
    startIndex: 0,
    endIndex: 0
  },
  markdown: {
    identifier: 'artifact-markdown',
    type: 'markdown',
    title: 'Untitled Markdown Artifact',
    content: '# Untitled Markdown Artifact\n\nStart editing...',
    attributes: {},
    startIndex: 0,
    endIndex: 0
  },
  code: {
    identifier: 'artifact-code',
    type: 'code',
    title: 'Untitled Code Artifact',
    content: 'function main() {\n  return "Start editing..."\n}',
    attributes: { language: 'javascript' },
    startIndex: 0,
    endIndex: 0
  }
}

interface NewProjectDraft {
  title: string
  artifactType: ArtifactType
  modelSelection?: string
  temperature?: number
  topP?: number
  maxTokens?: number
  streamOutput: boolean
  skillMode: 'inherit' | 'all' | 'selected' | 'none'
  selectedSkillIds: string[]
  skillStrategy?: 'none' | 'keyword' | 'embedding' | 'local-embedding' | 'llm' | 'hybrid'
  contextStrategyType: 'none' | 'sliding_window' | 'summarize' | 'hierarchical' | 'truncate_middle'
  knowledgeBaseIds: string[]
  autoCreateFromChatHistory: boolean
}

const ArtifactLibraryPage: FC = () => {
  const { t } = useTranslation()
  const navigate = useAppNavigate()
  const dispatch = useAppDispatch()

  const savedArtifacts = useAppSelector(selectSavedArtifacts)
  const artifactStudioSettings = useAppSelector(selectArtifactStudioSettings)
  const providers = useAppSelector((state) => state.llm.providers)
  const knowledgeBases = useAppSelector((state) => state.knowledge.bases)
  const assistants = useAppSelector((state) => state.assistants.assistants)

  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string | null>(null)
  const [projects, setProjects] = useState<ArtifactProject[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [showArchivedProjects, setShowArchivedProjects] = useState(false)
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [skills, setSkills] = useState<Array<{ id: string; name: string }>>([])

  const [newProjectDraft, setNewProjectDraft] = useState<NewProjectDraft>({
    title: '',
    artifactType: 'react',
    modelSelection: undefined,
    temperature: artifactStudioSettings?.defaults.llm.temperature,
    topP: artifactStudioSettings?.defaults.llm.topP,
    maxTokens: artifactStudioSettings?.defaults.llm.maxTokens,
    streamOutput: artifactStudioSettings?.defaults.llm.streamOutput ?? true,
    skillMode: artifactStudioSettings?.defaults.skills.mode || 'inherit',
    selectedSkillIds: artifactStudioSettings?.defaults.skills.selectedSkillIds || [],
    skillStrategy: artifactStudioSettings?.defaults.skills.strategy,
    contextStrategyType: artifactStudioSettings?.defaults.contextManagement.type || 'sliding_window',
    knowledgeBaseIds: artifactStudioSettings?.defaults.knowledge.knowledgeBaseIds || [],
    autoCreateFromChatHistory: artifactStudioSettings?.defaults.knowledge.autoCreateFromChatHistory || false
  })

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true)
    try {
      const records = await getArtifactProjects(200)
      setProjects(records)
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setProjectsLoading(false)
    }
  }, [])

  useEffect(() => {
    const loadArtifacts = async () => {
      setIsLoading(true)
      await dispatch(loadSavedArtifacts())
      setIsLoading(false)
    }
    loadArtifacts()
    loadProjects()
  }, [dispatch, loadProjects])

  useEffect(() => {
    const loadSkills = async () => {
      try {
        const available = (await window.api.skill.getList()) || []
        setSkills(available.map((skill) => ({ id: skill.id, name: skill.name || skill.id })))
      } catch {
        setSkills([])
      }
    }
    loadSkills()
  }, [])

  const modelOptions = useMemo(
    () =>
      providers
        .filter((provider) => provider.enabled)
        .flatMap((provider) =>
          provider.models.map((model) => ({
            label: `${model.name || model.id} | ${provider.name}`,
            value: `${provider.id}::${model.id}`
          }))
        ),
    [providers]
  )

  const knowledgeOptions = useMemo(
    () => knowledgeBases.map((base) => ({ label: base.name, value: base.id })),
    [knowledgeBases]
  )

  const filteredArtifacts = useMemo(() => {
    return savedArtifacts.filter((artifact) => {
      const matchesSearch =
        searchQuery === '' ||
        artifact.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artifact.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        artifact.description?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesType = filterType === null || artifact.type === filterType

      return matchesSearch && matchesType
    })
  }, [savedArtifacts, searchQuery, filterType])

  const visibleProjects = useMemo(() => {
    return projects.filter((project) => {
      const isArchived = project.status === 'archived'
      if (!showArchivedProjects && isArchived) {
        return false
      }
      if (searchQuery && !project.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      return true
    })
  }, [projects, searchQuery, showArchivedProjects])

  const handleOpenArtifact = useCallback(
    (artifactId: string) => {
      const projectId = `library-${artifactId}`
      sessionStorage.setItem(
        `artifact-project-seed:${projectId}`,
        JSON.stringify({
          source: 'library',
          artifactId
        } satisfies ArtifactProjectSeedPayload)
      )
      navigate(`/artifacts/studio/${projectId}`)
    },
    [navigate]
  )

  const handleOpenProject = useCallback(
    (projectId: string) => {
      navigate(`/artifacts/studio/${projectId}`)
    },
    [navigate]
  )

  const handleCloneProject = useCallback(
    async (projectId: string) => {
      const cloned = await cloneArtifactProject(projectId)
      if (!cloned) {
        message.error(t('artifacts.project_clone_failed', 'Failed to clone project'))
        return
      }
      await loadProjects()
      message.success(t('artifacts.project_cloned', 'Project cloned'))
      navigate(`/artifacts/studio/${cloned.id}`)
    },
    [loadProjects, navigate, t]
  )

  const handleArchiveToggle = useCallback(
    async (project: ArtifactProject) => {
      await setArtifactProjectArchived(project.id, project.status !== 'archived')
      await loadProjects()
      message.success(
        project.status === 'archived'
          ? t('artifacts.project_unarchived', 'Project restored')
          : t('artifacts.project_archived', 'Project archived')
      )
    },
    [loadProjects, t]
  )

  const handleRenameProject = useCallback(
    async (project: ArtifactProject) => {
      const nextTitle = window.prompt(t('artifacts.project_rename_prompt', 'Project name'), project.title)
      if (!nextTitle || !nextTitle.trim() || nextTitle.trim() === project.title) {
        return
      }
      await updateArtifactProject(project.id, { title: nextTitle.trim() })
      await loadProjects()
      message.success(t('artifacts.project_renamed', 'Project renamed'))
    },
    [loadProjects, t]
  )

  const handleRebindProjectSource = useCallback(
    async (project: ArtifactProject) => {
      if (!project.conversationId) {
        message.warning(t('artifacts.project_rebind_no_source', 'No source conversation found for this project'))
        return
      }

      for (const assistant of assistants) {
        const topic = assistant.topics?.find((candidate) => candidate.id === project.conversationId)
        if (!topic) {
          continue
        }

        const envelope = normalizeContextEnvelope({
          llm: {
            modelId: assistant.model?.id,
            providerId: assistant.model?.provider,
            temperature: assistant.settings?.temperature,
            topP: assistant.settings?.topP,
            maxTokens: assistant.settings?.maxTokens,
            streamOutput: assistant.settings?.streamOutput
          },
          skills: topic.skillScope || assistant.settings?.skillScope,
          contextManagement: topic.contextStrategy || assistant.settings?.contextStrategy,
          knowledge: {
            knowledgeBaseIds: assistant.knowledge_bases?.map((base) => base.id) || [],
            linkedKnowledgeBaseIds: project.contextEnvelope?.knowledge?.linkedKnowledgeBaseIds || [],
            knowledgeBridgeBaseId: project.contextEnvelope?.knowledge?.knowledgeBridgeBaseId,
            knowledgeBridgeEnabled: project.contextEnvelope?.knowledge?.knowledgeBridgeEnabled || false
          },
          source: {
            sourceType: 'conversation',
            assistantId: assistant.id,
            topicId: topic.id,
            conversationId: topic.id,
            messageId: project.messageId,
            capturedAt: new Date().toISOString()
          }
        })

        await updateArtifactProject(project.id, {
          contextEnvelope: envelope
        })
        await loadProjects()
        message.success(t('artifacts.project_rebound', 'Project source context refreshed'))
        return
      }

      message.warning(t('artifacts.project_rebind_missing', 'Source conversation context could not be resolved'))
    },
    [assistants, loadProjects, t]
  )

  const handleNewArtifact = useCallback(() => {
    setNewProjectDraft({
      title: '',
      artifactType: 'react',
      modelSelection: undefined,
      temperature: artifactStudioSettings?.defaults.llm.temperature,
      topP: artifactStudioSettings?.defaults.llm.topP,
      maxTokens: artifactStudioSettings?.defaults.llm.maxTokens,
      streamOutput: artifactStudioSettings?.defaults.llm.streamOutput ?? true,
      skillMode: artifactStudioSettings?.defaults.skills.mode || 'inherit',
      selectedSkillIds: artifactStudioSettings?.defaults.skills.selectedSkillIds || [],
      skillStrategy: artifactStudioSettings?.defaults.skills.strategy,
      contextStrategyType: artifactStudioSettings?.defaults.contextManagement.type || 'sliding_window',
      knowledgeBaseIds: artifactStudioSettings?.defaults.knowledge.knowledgeBaseIds || [],
      autoCreateFromChatHistory: artifactStudioSettings?.defaults.knowledge.autoCreateFromChatHistory || false
    })
    setShowNewProjectModal(true)
  }, [artifactStudioSettings])

  const handleCreateProject = useCallback(() => {
    const projectId = createProjectId('scratch')
    const [providerId, modelId] = (newProjectDraft.modelSelection || '').split('::')
    const template = {
      ...EMPTY_ARTIFACT_BY_TYPE[newProjectDraft.artifactType],
      identifier: `${EMPTY_ARTIFACT_BY_TYPE[newProjectDraft.artifactType].identifier}-${projectId}`,
      title: newProjectDraft.title.trim() || EMPTY_ARTIFACT_BY_TYPE[newProjectDraft.artifactType].title
    }

    const contextEnvelope = normalizeContextEnvelope({
      llm: {
        modelId: modelId || artifactStudioSettings?.defaults.llm.modelId,
        providerId: providerId || undefined,
        temperature: newProjectDraft.temperature,
        topP: newProjectDraft.topP,
        maxTokens: newProjectDraft.maxTokens,
        streamOutput: newProjectDraft.streamOutput
      },
      skills: {
        mode: newProjectDraft.skillMode,
        selectedSkillIds: newProjectDraft.skillMode === 'selected' ? newProjectDraft.selectedSkillIds : undefined,
        strategy: newProjectDraft.skillStrategy
      },
      contextManagement: {
        ...(artifactStudioSettings?.defaults.contextManagement || { type: 'sliding_window' }),
        type: newProjectDraft.contextStrategyType
      },
      knowledge: {
        knowledgeBaseIds: newProjectDraft.knowledgeBaseIds,
        knowledgeBridgeEnabled: newProjectDraft.autoCreateFromChatHistory
      },
      source: {
        sourceType: 'unknown',
        conversationId: `studio-${projectId}`,
        messageId: `studio-${projectId}`,
        capturedAt: new Date().toISOString()
      }
    })

    const seed: ArtifactProjectSeedPayload = {
      source: 'template',
      artifact: template,
      conversationId: `studio-${projectId}`,
      messageId: `studio-${projectId}`,
      contextMessages: [],
      contextEnvelope,
      sourceKnowledgeBaseIds: newProjectDraft.knowledgeBaseIds
    }

    sessionStorage.setItem(`artifact-project-seed:${projectId}`, JSON.stringify(seed))
    setShowNewProjectModal(false)
    navigate(`/artifacts/studio/${projectId}`)
  }, [artifactStudioSettings, navigate, newProjectDraft])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'html':
      case 'xhtml':
      case 'htmx':
        return <FileText size={16} />
      case 'react':
        return <Layers size={16} />
      case 'code':
        return <Code size={16} />
      default:
        return <Sparkles size={16} />
    }
  }

  const typeOptions = ['html', 'xhtml', 'htmx', 'react', 'a2ui', 'svg', 'mermaid', 'markdown', 'code']

  return (
    <Container>
      <Navbar>
        <NavbarCenter style={{ borderRight: 'none' }}>{t('artifacts.library')}</NavbarCenter>
      </Navbar>

      <ToolbarContainer>
        <SearchContainer>
          <Input
            prefix={<Search size={16} />}
            placeholder={t('common.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />
        </SearchContainer>

        <FilterContainer>
          <Tag
            color={filterType === null ? 'blue' : undefined}
            onClick={() => setFilterType(null)}
            style={{ cursor: 'pointer' }}>
            {t('common.all')}
          </Tag>
          {typeOptions.map((type) => (
            <Tag
              key={type}
              color={filterType === type ? 'blue' : undefined}
              onClick={() => setFilterType(type)}
              style={{ cursor: 'pointer' }}>
              {type.toUpperCase()}
            </Tag>
          ))}
        </FilterContainer>

        <NewButton type="primary" icon={<PlusOutlined />} onClick={handleNewArtifact}>
          {t('artifacts.new_artifact')}
        </NewButton>
      </ToolbarContainer>

      <ContentContainer>
        <Scrollbar>
          <SectionWrap>
            <SectionHeader>
              <h3>{t('artifacts.projects_title', 'Artifact Studio Projects')}</h3>
              <Switch
                checked={showArchivedProjects}
                onChange={setShowArchivedProjects}
                checkedChildren={t('artifacts.show_archived', 'Archived')}
                unCheckedChildren={t('artifacts.hide_archived', 'Active')}
              />
            </SectionHeader>
            {projectsLoading ? (
              <LoadingContainer>
                <Spin />
              </LoadingContainer>
            ) : visibleProjects.length === 0 ? (
              <EmptyContainer>
                <Empty description={t('artifacts.no_projects', 'No Artifact Studio projects yet')} />
              </EmptyContainer>
            ) : (
              <ProjectGrid>
                {visibleProjects.map((project) => (
                  <ProjectCard key={project.id}>
                    <ProjectHeader>
                      <ProjectTitle>{project.title}</ProjectTitle>
                      <SpaceTags>
                        <Tag color={project.status === 'archived' ? 'default' : 'green'}>
                          {(project.status || 'active').toUpperCase()}
                        </Tag>
                        <Tag>{project.artifactType.toUpperCase()}</Tag>
                      </SpaceTags>
                    </ProjectHeader>
                    <ProjectMeta>
                      {t('artifacts.source', 'Source')}: {project.createdFrom || project.source}
                    </ProjectMeta>
                    <ProjectMeta>
                      {t('artifacts.updated_at', 'Updated')}: {new Date(project.updatedAt).toLocaleString()}
                    </ProjectMeta>
                    <ProjectActions>
                      <Button size="small" onClick={() => handleOpenProject(project.id)}>
                        {t('common.open', 'Open')}
                      </Button>
                      <Button size="small" icon={<CopyPlus size={14} />} onClick={() => handleCloneProject(project.id)}>
                        {t('common.clone', 'Clone')}
                      </Button>
                      <Button
                        size="small"
                        icon={<RefreshCcw size={14} />}
                        onClick={() => handleRebindProjectSource(project)}>
                        {t('artifacts.rebind_source', 'Rebind Source')}
                      </Button>
                      <Button size="small" onClick={() => handleRenameProject(project)}>
                        {t('common.rename', 'Rename')}
                      </Button>
                      <Button size="small" onClick={() => handleArchiveToggle(project)}>
                        {project.status === 'archived'
                          ? t('artifacts.unarchive', 'Unarchive')
                          : t('artifacts.archive', 'Archive')}
                      </Button>
                    </ProjectActions>
                  </ProjectCard>
                ))}
              </ProjectGrid>
            )}
          </SectionWrap>

          <SectionWrap>
            <SectionHeader>
              <h3>{t('artifacts.library', 'Library')}</h3>
            </SectionHeader>
            {isLoading ? (
              <LoadingContainer>
                <Spin size="large" />
              </LoadingContainer>
            ) : filteredArtifacts.length === 0 ? (
              <EmptyContainer>
                <Empty description={t('artifacts.no_artifacts')} />
              </EmptyContainer>
            ) : (
              <ArtifactGrid>
                {filteredArtifacts.map((artifact) => (
                  <ArtifactCard key={artifact.id} onClick={() => handleOpenArtifact(artifact.id)}>
                    <CardHeader>
                      <TypeIcon>{getTypeIcon(artifact.type)}</TypeIcon>
                      <CardTitle>{artifact.title}</CardTitle>
                      <StarButton onClick={(e) => e.stopPropagation()}>
                        {artifact.starred ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                      </StarButton>
                    </CardHeader>

                    {artifact.thumbnail ? (
                      <ThumbnailContainer>
                        <Thumbnail src={artifact.thumbnail} alt={artifact.title} />
                      </ThumbnailContainer>
                    ) : (
                      <PlaceholderThumbnail>
                        <Sparkles size={32} />
                      </PlaceholderThumbnail>
                    )}

                    <CardFooter>
                      <TypeBadge>{artifact.type.toUpperCase()}</TypeBadge>
                      <VersionBadge>v{artifact.versionCount}</VersionBadge>
                    </CardFooter>

                    {artifact.tags.length > 0 && (
                      <TagsContainer>
                        {artifact.tags.slice(0, 3).map((tag) => (
                          <Tag key={tag}>{tag}</Tag>
                        ))}
                        {artifact.tags.length > 3 && <Tag>+{artifact.tags.length - 3}</Tag>}
                      </TagsContainer>
                    )}
                  </ArtifactCard>
                ))}
              </ArtifactGrid>
            )}
          </SectionWrap>
        </Scrollbar>
      </ContentContainer>

      <Modal
        open={showNewProjectModal}
        onCancel={() => setShowNewProjectModal(false)}
        onOk={handleCreateProject}
        okText={t('common.create', 'Create')}
        title={t('artifacts.new_project_setup', 'New Artifact Studio Project')}
        width={760}>
        <ModalGrid>
          <FieldBlock>
            <FieldLabel>{t('common.name', 'Name')}</FieldLabel>
            <Input
              value={newProjectDraft.title}
              onChange={(e) => setNewProjectDraft((prev) => ({ ...prev, title: e.target.value }))}
              placeholder={t('artifacts.project_name_placeholder', 'Marketing landing page')}
            />
          </FieldBlock>
          <FieldBlock>
            <FieldLabel>{t('artifacts.type', 'Type')}</FieldLabel>
            <Select
              value={newProjectDraft.artifactType}
              onChange={(value) => setNewProjectDraft((prev) => ({ ...prev, artifactType: value }))}
              options={typeOptions.map((type) => ({ label: type.toUpperCase(), value: type }))}
            />
          </FieldBlock>
          <FieldBlock>
            <FieldLabel>{t('settings.models.default_model', 'Model')}</FieldLabel>
            <Select
              value={newProjectDraft.modelSelection}
              allowClear
              options={modelOptions}
              onChange={(value) => setNewProjectDraft((prev) => ({ ...prev, modelSelection: value }))}
            />
          </FieldBlock>
          <FieldBlock>
            <FieldLabel>{t('settings.skill.matching.title', 'Skill availability')}</FieldLabel>
            <Select
              value={newProjectDraft.skillMode}
              options={[
                { label: 'Inherit', value: 'inherit' },
                { label: 'All', value: 'all' },
                { label: 'Selected', value: 'selected' },
                { label: 'None', value: 'none' }
              ]}
              onChange={(value) => setNewProjectDraft((prev) => ({ ...prev, skillMode: value }))}
            />
          </FieldBlock>
          {newProjectDraft.skillMode === 'selected' && (
            <FieldBlock>
              <FieldLabel>{t('settings.skill.manage.active_skills', 'Selected skills')}</FieldLabel>
              <Select
                mode="multiple"
                value={newProjectDraft.selectedSkillIds}
                options={skills.map((skill) => ({ label: skill.name, value: skill.id }))}
                onChange={(value) => setNewProjectDraft((prev) => ({ ...prev, selectedSkillIds: value }))}
              />
            </FieldBlock>
          )}
          <FieldBlock>
            <FieldLabel>{t('settings.skill.matching.strategy', 'Skill strategy')}</FieldLabel>
            <Select
              value={newProjectDraft.skillStrategy}
              allowClear
              options={[
                { label: 'Hybrid', value: 'hybrid' },
                { label: 'Keyword', value: 'keyword' },
                { label: 'Embedding', value: 'embedding' },
                { label: 'Local Embedding', value: 'local-embedding' },
                { label: 'LLM', value: 'llm' },
                { label: 'None', value: 'none' }
              ]}
              onChange={(value) => setNewProjectDraft((prev) => ({ ...prev, skillStrategy: value }))}
            />
          </FieldBlock>
          <FieldBlock>
            <FieldLabel>{t('settings.context_strategy.title', 'Context strategy')}</FieldLabel>
            <Select
              value={newProjectDraft.contextStrategyType}
              options={[
                { label: 'Sliding Window', value: 'sliding_window' },
                { label: 'Summarize', value: 'summarize' },
                { label: 'Hierarchical', value: 'hierarchical' },
                { label: 'Truncate Middle', value: 'truncate_middle' },
                { label: 'None', value: 'none' }
              ]}
              onChange={(value) => setNewProjectDraft((prev) => ({ ...prev, contextStrategyType: value }))}
            />
          </FieldBlock>
          <FieldBlock>
            <FieldLabel>{t('knowledge.title', 'Knowledge')}</FieldLabel>
            <Select
              mode="multiple"
              value={newProjectDraft.knowledgeBaseIds}
              options={knowledgeOptions}
              onChange={(value) => setNewProjectDraft((prev) => ({ ...prev, knowledgeBaseIds: value }))}
            />
          </FieldBlock>
          <FieldBlock>
            <FieldLabel>{t('settings.temperature.label', 'Temperature')}</FieldLabel>
            <InputNumber
              min={0}
              max={2}
              step={0.1}
              value={newProjectDraft.temperature}
              onChange={(value) => setNewProjectDraft((prev) => ({ ...prev, temperature: value ?? undefined }))}
            />
          </FieldBlock>
          <FieldBlock>
            <FieldLabel>{t('settings.top_p.label', 'Top P')}</FieldLabel>
            <InputNumber
              min={0}
              max={1}
              step={0.05}
              value={newProjectDraft.topP}
              onChange={(value) => setNewProjectDraft((prev) => ({ ...prev, topP: value ?? undefined }))}
            />
          </FieldBlock>
          <FieldBlock>
            <FieldLabel>{t('settings.max_tokens.label', 'Max Tokens')}</FieldLabel>
            <InputNumber
              min={1}
              value={newProjectDraft.maxTokens}
              onChange={(value) => setNewProjectDraft((prev) => ({ ...prev, maxTokens: value ?? undefined }))}
            />
          </FieldBlock>
          <FieldBlock>
            <FieldLabel>{t('settings.stream_output.label', 'Stream Output')}</FieldLabel>
            <Switch
              checked={newProjectDraft.streamOutput}
              onChange={(checked) => setNewProjectDraft((prev) => ({ ...prev, streamOutput: checked }))}
            />
          </FieldBlock>
          <FieldBlock>
            <FieldLabel>{t('artifacts.knowledge_bridge', 'Create knowledge bridge from chat history')}</FieldLabel>
            <Switch
              checked={newProjectDraft.autoCreateFromChatHistory}
              onChange={(checked) => setNewProjectDraft((prev) => ({ ...prev, autoCreateFromChatHistory: checked }))}
            />
          </FieldBlock>
        </ModalGrid>
      </Modal>
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

const ToolbarContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background-soft);
`

const SearchContainer = styled.div`
  flex: 1;
  max-width: 300px;

  .ant-input-affix-wrapper {
    border-radius: 8px;
  }
`

const FilterContainer = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
`

const NewButton = styled(Button)`
  margin-left: auto;
`

const ContentContainer = styled.div`
  flex: 1;
  overflow: hidden;
`

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
`

const EmptyContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 160px;
`

const SectionWrap = styled.section`
  padding: 20px;
`

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;

  h3 {
    margin: 0;
    color: var(--color-text);
    font-size: 15px;
  }
`

const ProjectGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
`

const ProjectCard = styled.div`
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-background-soft);
  padding: 14px;
`

const ProjectHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
`

const ProjectTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
`

const SpaceTags = styled.div`
  display: flex;
  gap: 4px;
`

const ProjectMeta = styled.div`
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-text-2);
`

const ProjectActions = styled.div`
  margin-top: 12px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`

const ArtifactGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
`

const ArtifactCard = styled.div`
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--color-primary);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
  }
`

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
`

const TypeIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
`

const CardTitle = styled.div`
  flex: 1;
  font-weight: 500;
  font-size: 14px;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const StarButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--color-text-3);

  &:hover {
    color: #faad14;
  }
`

const ThumbnailContainer = styled.div`
  width: 100%;
  height: 140px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-background-soft);
  margin-bottom: 12px;
`

const Thumbnail = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const PlaceholderThumbnail = styled.div`
  width: 100%;
  height: 140px;
  border-radius: 8px;
  background: var(--color-background-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  color: var(--color-text-3);
`

const CardFooter = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const TypeBadge = styled.span`
  padding: 2px 8px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
`

const VersionBadge = styled.span`
  padding: 2px 8px;
  background: var(--color-background-mute);
  color: var(--color-text-2);
  border-radius: 4px;
  font-size: 11px;
`

const TagsContainer = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 8px;
  flex-wrap: wrap;

  .ant-tag {
    margin: 0;
    font-size: 11px;
  }
`

const ModalGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
`

const FieldBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const FieldLabel = styled.label`
  font-size: 12px;
  color: var(--color-text-2);
`

export default ArtifactLibraryPage
