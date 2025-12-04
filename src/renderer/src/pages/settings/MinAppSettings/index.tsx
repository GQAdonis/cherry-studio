import { useTheme } from '@renderer/context/ThemeProvider'
import { useAppDispatch } from '@renderer/store'
import type { SettingsState } from '@renderer/store/settings'
import { setMinappAutomation, setSdkSettings } from '@renderer/store/settings'
import { Input, Switch } from 'antd'
import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

import {
  SettingContainer,
  SettingDescription,
  SettingDivider,
  SettingGroup,
  SettingRow,
  SettingRowTitle,
  SettingTitle
} from '..'

interface RootState {
  settings: SettingsState
}

// Default values for settings that may be undefined in existing persisted stores
const DEFAULT_MINAPP_AUTOMATION = {
  enabled: true,
  enableContextMenu: true,
  injectContentScript: true,
  enableConversationExtraction: true
}

const DEFAULT_SDK_SETTINGS = {
  enableWebSocketServer: false,
  webSocketPort: 23847,
  autoStartServer: false,
  requireApproval: true,
  trustedApps: {} as Record<string, string[]>
}

const MinAppSettings: FC = () => {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const dispatch = useAppDispatch()

  // Use defensive defaults for settings that may be undefined in existing stores
  const minappAutomationRaw = useSelector((state: RootState) => state.settings.minappAutomation)
  const sdkSettingsRaw = useSelector((state: RootState) => state.settings.sdk)

  const minappAutomation = minappAutomationRaw ?? DEFAULT_MINAPP_AUTOMATION
  const sdkSettings = sdkSettingsRaw ?? DEFAULT_SDK_SETTINGS

  const handleAutomationChange = (key: keyof typeof DEFAULT_MINAPP_AUTOMATION, value: boolean) => {
    dispatch(setMinappAutomation({ [key]: value }))
  }

  const handleSdkChange = <K extends keyof typeof DEFAULT_SDK_SETTINGS>(
    key: K,
    value: (typeof DEFAULT_SDK_SETTINGS)[K]
  ) => {
    dispatch(setSdkSettings({ [key]: value }))
  }

  return (
    <SettingContainer theme={theme}>
      {/* Mini-App Automation Settings */}
      <SettingGroup theme={theme}>
        <SettingTitle>{t('minapp.automation.title')}</SettingTitle>
        <SettingDescription>{t('minapp.automation.description')}</SettingDescription>
        <SettingDivider />

        <SettingRow>
          <div>
            <SettingRowTitle>{t('minapp.automation.enabled')}</SettingRowTitle>
            <SettingDescription style={{ marginTop: 4 }}>
              {t('minapp.automation.enabledDescription')}
            </SettingDescription>
          </div>
          <Switch
            checked={minappAutomation.enabled}
            onChange={(checked) => handleAutomationChange('enabled', checked)}
          />
        </SettingRow>

        <SettingDivider />

        <SettingRow>
          <div>
            <SettingRowTitle>{t('minapp.automation.contextMenu')}</SettingRowTitle>
            <SettingDescription style={{ marginTop: 4 }}>
              {t('minapp.automation.contextMenuDescription')}
            </SettingDescription>
          </div>
          <Switch
            checked={minappAutomation.enableContextMenu}
            onChange={(checked) => handleAutomationChange('enableContextMenu', checked)}
            disabled={!minappAutomation.enabled}
          />
        </SettingRow>

        <SettingDivider />

        <SettingRow>
          <div>
            <SettingRowTitle>{t('minapp.automation.contentScript')}</SettingRowTitle>
            <SettingDescription style={{ marginTop: 4 }}>
              {t('minapp.automation.contentScriptDescription')}
            </SettingDescription>
          </div>
          <Switch
            checked={minappAutomation.injectContentScript}
            onChange={(checked) => handleAutomationChange('injectContentScript', checked)}
            disabled={!minappAutomation.enabled}
          />
        </SettingRow>

        <SettingDivider />

        <SettingRow>
          <div>
            <SettingRowTitle>{t('minapp.automation.conversationExtraction')}</SettingRowTitle>
            <SettingDescription style={{ marginTop: 4 }}>
              {t('minapp.automation.conversationExtractionDescription')}
            </SettingDescription>
          </div>
          <Switch
            checked={minappAutomation.enableConversationExtraction}
            onChange={(checked) => handleAutomationChange('enableConversationExtraction', checked)}
            disabled={!minappAutomation.enabled}
          />
        </SettingRow>
      </SettingGroup>

      {/* SDK Settings */}
      <SettingGroup theme={theme}>
        <SettingTitle>{t('minapp.sdk.title')}</SettingTitle>
        <SettingDescription>{t('minapp.sdk.description')}</SettingDescription>
        <SettingDivider />

        <SettingRow>
          <div>
            <SettingRowTitle>{t('minapp.sdk.enableServer')}</SettingRowTitle>
            <SettingDescription style={{ marginTop: 4 }}>{t('minapp.sdk.enableServerDescription')}</SettingDescription>
          </div>
          <Switch
            checked={sdkSettings.enableWebSocketServer}
            onChange={(checked) => handleSdkChange('enableWebSocketServer', checked)}
          />
        </SettingRow>

        <SettingDivider />

        <SettingRow>
          <div>
            <SettingRowTitle>{t('minapp.sdk.port')}</SettingRowTitle>
            <SettingDescription style={{ marginTop: 4 }}>{t('minapp.sdk.portDescription')}</SettingDescription>
          </div>
          <Input
            type="number"
            value={sdkSettings.webSocketPort}
            onChange={(e) => handleSdkChange('webSocketPort', parseInt(e.target.value, 10) || 23847)}
            style={{ width: 100 }}
            disabled={!sdkSettings.enableWebSocketServer}
          />
        </SettingRow>

        <SettingDivider />

        <SettingRow>
          <div>
            <SettingRowTitle>{t('minapp.sdk.autoStart')}</SettingRowTitle>
            <SettingDescription style={{ marginTop: 4 }}>{t('minapp.sdk.autoStartDescription')}</SettingDescription>
          </div>
          <Switch
            checked={sdkSettings.autoStartServer}
            onChange={(checked) => handleSdkChange('autoStartServer', checked)}
            disabled={!sdkSettings.enableWebSocketServer}
          />
        </SettingRow>

        <SettingDivider />

        <SettingRow>
          <div>
            <SettingRowTitle>{t('minapp.sdk.requireApproval')}</SettingRowTitle>
            <SettingDescription style={{ marginTop: 4 }}>
              {t('minapp.sdk.requireApprovalDescription')}
            </SettingDescription>
          </div>
          <Switch
            checked={sdkSettings.requireApproval}
            onChange={(checked) => handleSdkChange('requireApproval', checked)}
            disabled={!sdkSettings.enableWebSocketServer}
          />
        </SettingRow>
      </SettingGroup>

      {/* Trusted Apps Section */}
      <SettingGroup theme={theme}>
        <SettingTitle>{t('minapp.trust.trustedApps')}</SettingTitle>
        <SettingDivider />

        {Object.keys(sdkSettings.trustedApps || {}).length === 0 ? (
          <SettingDescription>{t('minapp.trust.noTrustedApps')}</SettingDescription>
        ) : (
          Object.entries(sdkSettings.trustedApps || {}).map(([appId, capabilities]) => (
            <div key={appId}>
              <SettingRow>
                <div>
                  <SettingRowTitle>{appId}</SettingRowTitle>
                  <SettingDescription style={{ marginTop: 4 }}>
                    {(capabilities as string[]).join(', ')}
                  </SettingDescription>
                </div>
                <Switch
                  checked={true}
                  onChange={() => {
                    const newTrustedApps = { ...sdkSettings.trustedApps }
                    delete newTrustedApps[appId]
                    handleSdkChange('trustedApps', newTrustedApps)
                  }}
                />
              </SettingRow>
              <SettingDivider />
            </div>
          ))
        )}
      </SettingGroup>
    </SettingContainer>
  )
}

export default MinAppSettings
