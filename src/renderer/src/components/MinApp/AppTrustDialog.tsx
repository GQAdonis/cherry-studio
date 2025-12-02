import { CheckCircleOutlined, CloseCircleOutlined, SafetyOutlined } from '@ant-design/icons'
import { HStack, VStack } from '@renderer/components/Layout'
import { useAppDispatch } from '@renderer/store'
import { setSdkSettings } from '@renderer/store/settings'
import type { SettingsState } from '@renderer/store/settings'
import { Button, Checkbox, Divider, Modal, Tag, Typography } from 'antd'
import type { FC } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import styled from 'styled-components'

const { Text, Title } = Typography

// SDK Capability types
export type SDKCapability = 'ai' | 'knowledge' | 'memory' | 'mcp' | 'files' | 'settings' | 'clipboard' | 'notifications' | 'tools'

export interface AppTrustRequest {
  appId: string
  appName: string
  appOrigin?: string
  capabilities: SDKCapability[]
}

interface AppTrustDialogProps {
  visible: boolean
  request: AppTrustRequest | null
  onApprove: (remember: boolean) => void
  onDeny: () => void
}

interface RootState {
  settings: SettingsState
}

const CapabilityIcon: FC<{ capability: SDKCapability }> = ({ capability }) => {
  const iconMap: Record<SDKCapability, string> = {
    ai: '🤖',
    knowledge: '📚',
    memory: '💾',
    mcp: '🔧',
    files: '📁',
    settings: '⚙️',
    clipboard: '📋',
    notifications: '🔔',
    tools: '🛠️'
  }
  return <span>{iconMap[capability]}</span>
}

const AppTrustDialog: FC<AppTrustDialogProps> = ({
  visible,
  request,
  onApprove,
  onDeny
}) => {
  const { t } = useTranslation()
  const [rememberChoice, setRememberChoice] = useState(true)
  const dispatch = useAppDispatch()
  const sdkSettings = useSelector((state: RootState) => state.settings.sdk)

  if (!request) return null

  const handleApprove = () => {
    if (rememberChoice) {
      // Store the trusted app in settings
      const newTrustedApps = {
        ...sdkSettings.trustedApps,
        [request.appId]: request.capabilities
      }
      dispatch(setSdkSettings({ trustedApps: newTrustedApps }))
    }
    onApprove(rememberChoice)
  }

  const handleDeny = () => {
    onDeny()
  }

  return (
    <Modal
      open={visible}
      onCancel={handleDeny}
      footer={null}
      centered
      width={480}
      closable={false}
    >
      <Container>
        <VStack gap={16} style={{ width: '100%' }}>
          {/* Header */}
          <HStack alignItems="center" gap={12}>
            <IconContainer>
              <SafetyOutlined style={{ fontSize: 32, color: 'var(--color-primary)' }} />
            </IconContainer>
            <VStack gap={4}>
              <Title level={4} style={{ margin: 0 }}>
                {t('minapp.trust.title')}
              </Title>
              <Text type="secondary">
                {t('minapp.trust.description', { appName: request.appName })}
              </Text>
            </VStack>
          </HStack>

          <Divider style={{ margin: '8px 0' }} />

          {/* App Info */}
          <AppInfoCard>
            <VStack gap={8}>
              <HStack justifyContent="space-between" alignItems="center">
                <Text strong>{request.appName}</Text>
                <Tag color="blue">{request.appId}</Tag>
              </HStack>
              {request.appOrigin && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Origin: {request.appOrigin}
                </Text>
              )}
            </VStack>
          </AppInfoCard>

          {/* Requested Capabilities */}
          <VStack gap={8}>
            <Text strong>{t('minapp.trust.requestedCapabilities')}</Text>
            <CapabilitiesList>
              {request.capabilities.map((capability) => (
                <CapabilityItem key={capability}>
                  <HStack alignItems="center" gap={8}>
                    <CapabilityIcon capability={capability} />
                    <VStack gap={2}>
                      <Text>{t(`minapp.trust.capabilities.${capability}`)}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {t(`minapp.trust.capabilities.${capability}Description`)}
                      </Text>
                    </VStack>
                  </HStack>
                </CapabilityItem>
              ))}
            </CapabilitiesList>
          </VStack>

          {/* Remember Choice */}
          <Checkbox
            checked={rememberChoice}
            onChange={(e) => setRememberChoice(e.target.checked)}
          >
            {t('minapp.trust.remember')}
          </Checkbox>

          <Divider style={{ margin: '8px 0' }} />

          {/* Actions */}
          <HStack justifyContent="flex-end" gap={8}>
            <Button
              icon={<CloseCircleOutlined />}
              onClick={handleDeny}
            >
              {t('minapp.trust.deny')}
            </Button>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleApprove}
            >
              {t('minapp.trust.approve')}
            </Button>
          </HStack>
        </VStack>
      </Container>
    </Modal>
  )
}

const Container = styled.div`
  padding: 8px 0;
`

const IconContainer = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-primary-bg);
  display: flex;
  align-items: center;
  justify-content: center;
`

const AppInfoCard = styled.div`
  background: var(--color-background-soft);
  border-radius: 8px;
  padding: 12px 16px;
  border: 1px solid var(--color-border);
`

const CapabilitiesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
`

const CapabilityItem = styled.div`
  background: var(--color-background-soft);
  border-radius: 6px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
`

export default AppTrustDialog

