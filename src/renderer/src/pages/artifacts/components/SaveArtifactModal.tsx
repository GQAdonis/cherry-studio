/**
 * Save Artifact Modal Component
 *
 * Modal for saving artifacts to the library with metadata:
 * - Title (editable)
 * - Description (for search/embeddings)
 * - Tags (categorization)
 */

import type { Artifact } from '@renderer/features/artifacts'
import { useAppDispatch } from '@renderer/store'
import { saveArtifactToLibrary, updateMetadata, updateTags, updateTitle } from '@renderer/store/artifacts'
import { Button, Input, Modal, Tag } from 'antd'
import { Plus, X } from 'lucide-react'
import type { FC, KeyboardEvent } from 'react'
import { memo, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

const { TextArea } = Input

interface SaveArtifactModalProps {
  artifact: Artifact
  open: boolean
  onClose: () => void
  onSaved?: () => void
}

const SaveArtifactModal: FC<SaveArtifactModalProps> = ({ artifact, open, onClose, onSaved }) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  // Form state
  const [title, setTitle] = useState(artifact.title || '')
  const [description, setDescription] = useState(artifact.metadata?.description || '')
  const [tags, setTags] = useState<string[]>(artifact.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Reset form state when modal opens or artifact changes
  useEffect(() => {
    if (open) {
      setTitle(artifact.title || '')
      setDescription(artifact.metadata?.description || '')
      setTags(artifact.tags || [])
      setTagInput('')
      setIsSaving(false)
    }
  }, [open, artifact])

  const handleAddTag = useCallback(() => {
    const trimmedTag = tagInput.trim().toLowerCase()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag])
      setTagInput('')
    }
  }, [tagInput, tags])

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove))
  }, [])

  const handleTagInputKeyPress = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault()
        handleAddTag()
      }
    },
    [handleAddTag]
  )

  const handleSave = useCallback(async () => {
    if (!title.trim()) return

    setIsSaving(true)

    try {
      // Update artifact with new metadata
      dispatch(updateTitle(title.trim()))
      dispatch(updateTags(tags))
      dispatch(
        updateMetadata({
          description: description.trim()
        })
      )

      // Save to library
      const updatedArtifact: Artifact = {
        ...artifact,
        title: title.trim(),
        tags,
        metadata: {
          ...artifact.metadata,
          description: description.trim()
        }
      }

      await dispatch(saveArtifactToLibrary(updatedArtifact)).unwrap()
      onSaved?.()
      onClose()
    } catch (_error) {
      // Error handled by Redux
    } finally {
      setIsSaving(false)
    }
  }, [title, description, tags, artifact, dispatch, onSaved, onClose])

  return (
    <Modal
      title={t('artifacts.save_to_library')}
      open={open}
      onCancel={onClose}
      footer={null}
      width={480}
      destroyOnClose>
      <ModalContent>
        <FormField>
          <Label>{t('common.title')} *</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('artifacts.title_placeholder')}
            maxLength={100}
            showCount
          />
        </FormField>

        <FormField>
          <Label>{t('common.description')}</Label>
          <HelpText>{t('artifacts.description_help')}</HelpText>
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('artifacts.description_placeholder')}
            rows={3}
            maxLength={500}
            showCount
          />
        </FormField>

        <FormField>
          <Label>{t('common.tags')}</Label>
          <TagsContainer>
            {tags.map((tag) => (
              <TagItem key={tag}>
                {tag}
                <TagRemoveButton onClick={() => handleRemoveTag(tag)}>
                  <X size={12} />
                </TagRemoveButton>
              </TagItem>
            ))}
            <TagInputWrapper>
              <TagInputField
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyPress}
                onBlur={handleAddTag}
                placeholder={tags.length === 0 ? t('artifacts.tags_placeholder') : ''}
                maxLength={30}
              />
              {tagInput && (
                <AddTagButton onClick={handleAddTag}>
                  <Plus size={14} />
                </AddTagButton>
              )}
            </TagInputWrapper>
          </TagsContainer>
        </FormField>

        <PreviewSection>
          <Label>{t('artifacts.preview_type')}</Label>
          <TypeBadge>{artifact.type}</TypeBadge>
        </PreviewSection>

        <ButtonRow>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="primary" onClick={handleSave} loading={isSaving} disabled={!title.trim()}>
            {t('artifacts.save_to_library')}
          </Button>
        </ButtonRow>
      </ModalContent>
    </Modal>
  )
}

// Styled components
const ModalContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-top: 8px;
`

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const Label = styled.label`
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
`

const HelpText = styled.p`
  font-size: 12px;
  color: var(--color-text-3);
  margin: 0;
`

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px;
  min-height: 42px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background);
  transition: border-color 0.2s;

  &:focus-within {
    border-color: var(--color-primary);
  }
`

const TagItem = styled(Tag)`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  margin: 0;
  font-size: 12px;
  border-radius: 4px;
  background: var(--color-primary-soft);
  border-color: var(--color-primary);
  color: var(--color-primary);
`

const TagRemoveButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  opacity: 0.7;

  &:hover {
    opacity: 1;
  }
`

const TagInputWrapper = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 80px;
`

const TagInputField = styled.input`
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 13px;
  color: var(--color-text);
  padding: 4px 0;

  &::placeholder {
    color: var(--color-text-3);
  }
`

const AddTagButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: var(--color-primary);
  color: white;
  cursor: pointer;
  transition: opacity 0.15s;

  &:hover {
    opacity: 0.9;
  }
`

const PreviewSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const TypeBadge = styled.span`
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  border-radius: 4px;
  background: var(--color-background-mute);
  color: var(--color-text-2);
`

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
`

export default memo(SaveArtifactModal)
