import type { ContextActionMessageBlock } from '@renderer/types/newMessage'
import { Info } from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

interface Props {
  block: ContextActionMessageBlock
}

const ContextActionBlock: React.FC<Props> = ({ block }) => {
  const { t } = useTranslation()

  // Default summary if none provided
  const summary = block.summary || t('message.context_action.pruned', { count: block.removedCount || 0 })

  return (
    <Container>
      <IconWrapper>
        <Info size={16} />
      </IconWrapper>
      <Content>
        <Title>{t('message.context_action.title', 'Context Management')}</Title>
        <Description>{summary}</Description>
      </Content>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin: 8px 0;
  padding: 12px;
  background-color: var(--color-bg-2);
  border-radius: 8px;
  border: 1px solid var(--color-border-1);
  font-size: 13px;
`

const IconWrapper = styled.div`
  color: var(--color-text-3);
  display: flex;
  align-items: center;
  margin-top: 2px;
`

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const Title = styled.div`
  font-weight: 500;
  color: var(--color-text-2);
`

const Description = styled.div`
  color: var(--color-text-3);
  line-height: 1.5;
`

export default React.memo(ContextActionBlock)
