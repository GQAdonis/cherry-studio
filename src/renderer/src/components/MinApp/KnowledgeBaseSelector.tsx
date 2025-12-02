/**
 * KnowledgeBaseSelector Modal
 *
 * A popup modal for selecting which knowledge base to add content to.
 * Used when sending content from mini-apps to knowledge bases.
 */

import { BookOutlined, PlusOutlined } from '@ant-design/icons'
import TopView from '@renderer/components/TopView'
import { useKnowledgeBases } from '@renderer/hooks/useKnowledge'
import { Button, Empty, Input, Modal, Radio, Space, Spin } from 'antd'
import type { FC} from 'react';
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

export interface KnowledgeBaseSelectorResult {
  knowledgeBaseId?: string
  knowledgeBaseName?: string
  cancelled: boolean
}

interface Props {
  title?: string
  contentPreview?: string
  resolve: (result: KnowledgeBaseSelectorResult) => void
}

const PopupContainer: FC<Props> = ({ title, contentPreview, resolve }) => {
  const { t } = useTranslation()
  const { knowledgeBases, loading } = useKnowledgeBases()
  const [open, setOpen] = useState(true)
  const [selectedKB, setSelectedKB] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const onOk = () => {
    if (!selectedKB) return

    const kb = knowledgeBases.find((kb) => kb.id === selectedKB)
    setOpen(false)
    resolve({
      knowledgeBaseId: selectedKB,
      knowledgeBaseName: kb?.name,
      cancelled: false
    })
  }

  const onCancel = () => {
    setOpen(false)
  }

  const onClose = () => {
    resolve({ cancelled: true })
    TopView.hide(TopViewKey)
  }

  // Filter knowledge bases by search query
  const filteredKBs = knowledgeBases.filter(
    (kb) =>
      kb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kb.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  KnowledgeBaseSelectorPopup.hide = onCancel

  return (
    <Modal
      title={
        <ModalHeader>
          <BookOutlined style={{ marginRight: 8 }} />
          {title || t('minapp.context.selectKnowledgeBase') || 'Select Knowledge Base'}
        </ModalHeader>
      }
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      afterClose={onClose}
      okButtonProps={{ disabled: !selectedKB }}
      okText={t('common.add') || 'Add'}
      cancelText={t('common.cancel') || 'Cancel'}
      transitionName="animation-move-down"
      centered
      width={500}>
      <ModalBody>
        {contentPreview && (
          <ContentPreview>
            <PreviewLabel>{t('minapp.context.contentPreview') || 'Content Preview'}:</PreviewLabel>
            <PreviewText>{contentPreview.substring(0, 200)}...</PreviewText>
          </ContentPreview>
        )}

        <SearchInput
          placeholder={t('common.search') || 'Search...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
        />

        {loading ? (
          <LoadingContainer>
            <Spin />
          </LoadingContainer>
        ) : filteredKBs.length === 0 ? (
          <Empty
            description={
              knowledgeBases.length === 0
                ? t('minapp.context.noKnowledgeBases') || 'No knowledge bases yet'
                : t('common.noResults') || 'No results found'
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}>
            {knowledgeBases.length === 0 && (
              <Button type="primary" icon={<PlusOutlined />} onClick={onCancel}>
                {t('knowledgeBase.create') || 'Create Knowledge Base'}
              </Button>
            )}
          </Empty>
        ) : (
          <KnowledgeBaseList>
            <Radio.Group value={selectedKB} onChange={(e) => setSelectedKB(e.target.value)} style={{ width: '100%' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {filteredKBs.map((kb) => (
                  <KnowledgeBaseItem key={kb.id} $selected={selectedKB === kb.id}>
                    <Radio value={kb.id}>
                      <KBInfo>
                        <KBName>{kb.name}</KBName>
                        {kb.description && <KBDescription>{kb.description}</KBDescription>}
                        <KBMeta>
                          {kb.documentCount || 0} {t('knowledgeBase.documents') || 'documents'}
                        </KBMeta>
                      </KBInfo>
                    </Radio>
                  </KnowledgeBaseItem>
                ))}
              </Space>
            </Radio.Group>
          </KnowledgeBaseList>
        )}
      </ModalBody>
    </Modal>
  )
}

const TopViewKey = 'KnowledgeBaseSelectorPopup'

export default class KnowledgeBaseSelectorPopup {
  static topviewId = 0
  static hide: () => void = () => {}

  static show(params: Omit<Props, 'resolve'>): Promise<KnowledgeBaseSelectorResult> {
    return new Promise((resolve) => {
      TopView.show(
        <PopupContainer {...params} resolve={resolve} />,
        TopViewKey + KnowledgeBaseSelectorPopup.topviewId++
      )
    })
  }
}

// Styled Components
const ModalHeader = styled.div`
  display: flex;
  align-items: center;
`

const ModalBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 60vh;
`

const ContentPreview = styled.div`
  background: var(--color-background-soft);
  border-radius: 8px;
  padding: 12px;
`

const PreviewLabel = styled.div`
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
`

const PreviewText = styled.div`
  font-size: 13px;
  color: var(--color-text);
  line-height: 1.5;
  word-break: break-word;
`

const SearchInput = styled(Input.Search)`
  margin-bottom: 8px;
`

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: 40px;
`

const KnowledgeBaseList = styled.div`
  overflow-y: auto;
  max-height: 300px;
  padding-right: 8px;
`

const KnowledgeBaseItem = styled.div<{ $selected: boolean }>`
  padding: 12px;
  border-radius: 8px;
  background: ${(props) => (props.$selected ? 'var(--color-primary-bg)' : 'var(--color-background-soft)')};
  border: 1px solid ${(props) => (props.$selected ? 'var(--color-primary)' : 'transparent')};
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    background: ${(props) => (props.$selected ? 'var(--color-primary-bg)' : 'var(--color-background-mute)')};
  }

  .ant-radio-wrapper {
    width: 100%;
    display: flex;
    align-items: flex-start;
  }
`

const KBInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const KBName = styled.div`
  font-weight: 500;
  color: var(--color-text);
`

const KBDescription = styled.div`
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.4;
`

const KBMeta = styled.div`
  font-size: 11px;
  color: var(--color-text-tertiary);
  margin-top: 4px;
`

