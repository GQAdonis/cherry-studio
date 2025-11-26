/**
 * Artifact Library Page
 *
 * Lists saved artifacts with search and filter capabilities.
 * Accessible from sidebar/launchpad.
 */

import { PlusOutlined, StarFilled, StarOutlined } from '@ant-design/icons'
import { Navbar, NavbarCenter } from '@renderer/components/app/Navbar'
import Scrollbar from '@renderer/components/Scrollbar'
import { useAppDispatch, useAppSelector } from '@renderer/store'
import { loadSavedArtifacts, selectSavedArtifacts } from '@renderer/store/artifacts'
import { Button, Empty, Input, Spin, Tag } from 'antd'
import { Code, FileText, Layers, Search, Sparkles } from 'lucide-react'
import type { FC } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

const ArtifactLibraryPage: FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const savedArtifacts = useAppSelector(selectSavedArtifacts)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string | null>(null)

  // Load saved artifacts on mount
  useEffect(() => {
    const loadArtifacts = async () => {
      setIsLoading(true)
      await dispatch(loadSavedArtifacts())
      setIsLoading(false)
    }
    loadArtifacts()
  }, [dispatch])

  // Filter artifacts by search query and type
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

  const handleOpenArtifact = useCallback(
    (artifactId: string) => {
      navigate(`/artifacts/${artifactId}`)
    },
    [navigate]
  )

  const handleNewArtifact = useCallback(() => {
    // Navigate to chat to create a new artifact
    navigate('/')
  }, [navigate])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'html':
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

  const typeOptions = ['html', 'htmx', 'react', 'svg', 'mermaid', 'markdown', 'code']

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
        </Scrollbar>
      </ContentContainer>
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
  height: 100%;
`

const ArtifactGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  padding: 20px;
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

export default ArtifactLibraryPage
