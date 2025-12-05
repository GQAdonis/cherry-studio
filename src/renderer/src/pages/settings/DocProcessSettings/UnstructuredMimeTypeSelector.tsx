import CustomTag from '@renderer/components/Tags/CustomTag'
import {
  getMimeTypesByCategory,
  MIME_TYPE_CATEGORIES,
  type MimeTypeCategory,
  UNSTRUCTURED_SUPPORTED_MIME_TYPES
} from '@renderer/config/unstructuredMimeTypes'
import { Button, Checkbox, Collapse, Flex, Input, Typography } from 'antd'
import { Search } from 'lucide-react'
import type { FC } from 'react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

const { Panel } = Collapse
const { Text } = Typography

interface UnstructuredMimeTypeSelectorProps {
  enabledMimeTypes: string[]
  onChange: (types: string[]) => void
}

export const UnstructuredMimeTypeSelector: FC<UnstructuredMimeTypeSelectorProps> = ({ enabledMimeTypes, onChange }) => {
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState('')

  // Filter MIME types by search term
  const filteredMimeTypes = useMemo(() => {
    if (!searchTerm) return UNSTRUCTURED_SUPPORTED_MIME_TYPES

    const lowerSearch = searchTerm.toLowerCase()
    return UNSTRUCTURED_SUPPORTED_MIME_TYPES.filter(
      (mimeType) =>
        mimeType.label.toLowerCase().includes(lowerSearch) ||
        mimeType.type.toLowerCase().includes(lowerSearch) ||
        mimeType.extensions.some((ext) => ext.toLowerCase().includes(lowerSearch))
    )
  }, [searchTerm])

  // Group filtered types by category
  const categorizedTypes = useMemo(() => {
    const grouped: Record<MimeTypeCategory, typeof UNSTRUCTURED_SUPPORTED_MIME_TYPES> = {
      document: [],
      spreadsheet: [],
      presentation: [],
      image: [],
      web: [],
      text: [],
      other: []
    }

    for (const mimeType of filteredMimeTypes) {
      grouped[mimeType.category].push(mimeType)
    }

    return grouped
  }, [filteredMimeTypes])

  // Check if a MIME type is enabled
  const isEnabled = (mimeType: string) => enabledMimeTypes.includes(mimeType)

  // Toggle a single MIME type
  const toggleMimeType = (mimeType: string) => {
    if (isEnabled(mimeType)) {
      onChange(enabledMimeTypes.filter((t) => t !== mimeType))
    } else {
      onChange([...enabledMimeTypes, mimeType])
    }
  }

  // Select all in a category
  const selectAllInCategory = (category: MimeTypeCategory) => {
    const categoryTypes = getMimeTypesByCategory(category).map((m) => m.type)
    const newEnabled = new Set([...enabledMimeTypes, ...categoryTypes])
    onChange(Array.from(newEnabled))
  }

  // Deselect all in a category
  const deselectAllInCategory = (category: MimeTypeCategory) => {
    const categoryTypes = new Set(getMimeTypesByCategory(category).map((m) => m.type))
    onChange(enabledMimeTypes.filter((t) => !categoryTypes.has(t)))
  }

  // Check if all in category are selected
  const isAllCategorySelected = (category: MimeTypeCategory) => {
    const categoryTypes = getMimeTypesByCategory(category)
    return categoryTypes.every((m) => enabledMimeTypes.includes(m.type))
  }

  // Check if some in category are selected
  const isSomeCategorySelected = (category: MimeTypeCategory) => {
    const categoryTypes = getMimeTypesByCategory(category)
    return categoryTypes.some((m) => enabledMimeTypes.includes(m.type)) && !isAllCategorySelected(category)
  }

  return (
    <Container>
      <Header>
        <Flex justify="space-between" align="center">
          <Text strong>{t('settings.tool.preprocess.unstructured.options.mime_types.label')}</Text>
          <Text type="secondary">
            {t('settings.tool.preprocess.unstructured.options.mime_types.selected_count', {
              count: enabledMimeTypes.length
            })}
          </Text>
        </Flex>
        <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
          {t('settings.tool.preprocess.unstructured.options.mime_types.description')}
        </Text>
      </Header>

      <SearchBox>
        <Input
          prefix={<Search size={14} />}
          placeholder={t('settings.tool.preprocess.unstructured.options.mime_types.search_placeholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
        />
      </SearchBox>

      <StyledCollapse defaultActiveKey={Object.keys(MIME_TYPE_CATEGORIES)} ghost>
        {Object.entries(MIME_TYPE_CATEGORIES).map(([categoryKey]) => {
          const category = categoryKey as MimeTypeCategory
          const types = categorizedTypes[category]

          if (types.length === 0) return null

          return (
            <Panel
              key={category}
              header={
                <Flex justify="space-between" align="center">
                  <Flex align="center" gap={8}>
                    <Checkbox
                      checked={isAllCategorySelected(category)}
                      indeterminate={isSomeCategorySelected(category)}
                      onChange={(e) => {
                        e.stopPropagation()
                        if (isAllCategorySelected(category)) {
                          deselectAllInCategory(category)
                        } else {
                          selectAllInCategory(category)
                        }
                      }}
                    />
                    <Text strong>
                      {t(`settings.tool.preprocess.unstructured.options.mime_types.categories.${category}`)}
                    </Text>
                    <CategoryCount>
                      {types.filter((m) => enabledMimeTypes.includes(m.type)).length}/{types.length}
                    </CategoryCount>
                  </Flex>
                  <Flex gap={4} onClick={(e) => e.stopPropagation()}>
                    <Button type="link" size="small" onClick={() => selectAllInCategory(category)}>
                      {t('settings.tool.preprocess.unstructured.options.mime_types.select_all')}
                    </Button>
                    <Button type="link" size="small" onClick={() => deselectAllInCategory(category)}>
                      {t('settings.tool.preprocess.unstructured.options.mime_types.deselect_all')}
                    </Button>
                  </Flex>
                </Flex>
              }>
              <TypesList>
                {types.map((mimeType) => (
                  <TypeItem key={mimeType.type}>
                    <Checkbox checked={isEnabled(mimeType.type)} onChange={() => toggleMimeType(mimeType.type)}>
                      <Flex gap={8} align="center">
                        <TypeLabel>{mimeType.label}</TypeLabel>
                        <TypeExtensions>
                          {mimeType.extensions.map((ext) => (
                            <CustomTag key={ext} color="var(--color-border)">
                              {ext}
                            </CustomTag>
                          ))}
                        </TypeExtensions>
                      </Flex>
                    </Checkbox>
                  </TypeItem>
                ))}
              </TypesList>
            </Panel>
          )
        })}
      </StyledCollapse>
    </Container>
  )
}

const Container = styled.div`
  margin-top: 16px;
`

const Header = styled.div`
  margin-bottom: 12px;
`

const SearchBox = styled.div`
  margin-bottom: 12px;
`

const StyledCollapse = styled(Collapse)`
  .ant-collapse-header {
    padding: 8px 12px !important;
  }

  .ant-collapse-content-box {
    padding: 8px 12px !important;
  }
`

const TypesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const TypeItem = styled.div`
  padding: 4px 0;
`

const TypeLabel = styled.span`
  font-weight: 500;
  min-width: 120px;
  display: inline-block;
`

const TypeExtensions = styled.span`
  display: inline-flex;
  gap: 4px;
  flex-wrap: wrap;
`

const CategoryCount = styled(Text)`
  font-size: 12px;
  color: var(--color-text-secondary);
`
