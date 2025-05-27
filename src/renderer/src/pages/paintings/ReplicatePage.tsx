import { PlusOutlined, RedoOutlined } from '@ant-design/icons'
import { Navbar, NavbarCenter, NavbarRight } from '@renderer/components/app/Navbar'
import { HStack } from '@renderer/components/Layout'
import Scrollbar from '@renderer/components/Scrollbar'
import TranslateButton from '@renderer/components/TranslateButton'
import { getProviderLogo } from '@renderer/config/providers'
import { useTheme } from '@renderer/context/ThemeProvider'
import { usePaintings } from '@renderer/hooks/usePaintings'
import { useAllProviders } from '@renderer/hooks/useProvider'
import { useRuntime } from '@renderer/hooks/useRuntime'
import { useSettings } from '@renderer/hooks/useSettings'
import FileManager from '@renderer/services/FileManager'
import { translateText } from '@renderer/services/TranslateService'
import { useAppDispatch } from '@renderer/store'
import { setGenerating } from '@renderer/store/runtime'
import type { FileType } from '@renderer/types'
import type { PaintingAction, PaintingsState } from '@renderer/types'
import { getErrorMessage, uuid } from '@renderer/utils'
import { Avatar, Button, Input, InputNumber, Radio, Segmented, Select, Slider, Switch, Tooltip, Upload } from 'antd'
import TextArea from 'antd/es/input/TextArea'
import { Info } from 'lucide-react'
import type { FC } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import SendMessageButton from '../home/Inputbar/SendMessageButton'
import { SettingHelpLink, SettingTitle } from '../settings'
import { type ConfigItem, createModeConfigs } from '../../config/replicateConfig'
import { DEFAULT_PAINTING } from './config/constants'
import Artboard from './components/Artboard'
import PaintingsList from './components/PaintingsList'

// Helper function to get the model ID for Replicate API
const getModelId = (model: string): string => {
  if (model.includes('sdxl-turbo')) {
    return 'stability-ai/sdxl-turbo'
  } else if (model.includes('sdxl')) {
    return 'stability-ai/sdxl'
  } else if (model.includes('luma-photon')) {
    return 'lumalabs/luma-photon'
  }
  return 'stability-ai/sdxl'
}

// Helper function to get the model version for Replicate API
const getModelVersion = (model: string): string => {
  // Latest model versions - update these as needed
  const MODEL_VERSIONS = {
    'stability-ai/sdxl': 'a00d0b7dcbb9c3fbb34ba87d2d5b46c56969c84a628bf778a7fdaec30b1b99c5',
    'stability-ai/sdxl-turbo': '8beff3369e81422112d93b89ca01426147de542cd4684c244b673b105188fe5f',
    'lumalabs/luma-photon': '1a1a8a71fd165b5151a1594943d36f16c10f0b76c8a2b44f0cbb0ad97042cd85'
  }
  
  const modelId = getModelId(model)
  return MODEL_VERSIONS[modelId] || MODEL_VERSIONS['stability-ai/sdxl']
}

const ReplicatePage: FC<{ Options?: string[] }> = ({ Options = [] }) => {
  const [mode, setMode] = useState<keyof PaintingsState>('generate')
  const { addPainting, removePainting, updatePainting, persistentData } = usePaintings()
  const filteredPaintings = useMemo(() => persistentData[mode] || [], [persistentData, mode])
  const [painting, setPainting] = useState<PaintingAction>(filteredPaintings[0] || DEFAULT_PAINTING)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [spaceClickCount, setSpaceClickCount] = useState(0)
  const [isTranslating, setIsTranslating] = useState(false)
  const [fileMap, setFileMap] = useState<{ [key: string]: FileType }>({})

  const { t } = useTranslation()
  const { theme } = useTheme()
  const providers = useAllProviders()
  const providerOptions = useMemo(() => {
    return Options.map((option) => {
      const provider = providers.find((p) => p.id === option)
      return {
        label: t(`provider.${provider?.id}`),
        value: provider?.id || ''
      }
    })
  }, [Options, providers, t])
  
  const dispatch = useAppDispatch()
  useRuntime()
  const navigate = useNavigate()
  const { autoTranslateWithSpace } = useSettings()
  const spaceClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const replicateProvider = providers.find((p) => p.id === 'replicate') || {
    id: 'replicate',
    enabled: false,
    apiKey: '',
    apiHost: 'https://api.replicate.com',
    basePath: ''
  }

  // Use the configs from replicateConfig
  const modeConfigs = useMemo(() => createModeConfigs(), [])

  const modeOptions = [
    { label: t('paintings.mode.generate'), value: 'generate' },
    { label: t('paintings.mode.remix'), value: 'remix' }
  ]

  const getNewPainting = () => {
    return {
      ...DEFAULT_PAINTING,
      id: uuid()
    }
  }

  const textareaRef = useRef<any>(null)

  const updatePaintingState = (updates: Partial<PaintingAction>) => {
    const updatedPainting = { ...painting, ...updates }
    setPainting(updatedPainting)
    updatePainting(mode, updatedPainting)
  }

  const onGenerate = async () => {
    if (painting.files.length > 0) {
      const confirmed = await window.modal.confirm({
        content: t('paintings.regenerate.confirm'),
        centered: true
      })

      if (!confirmed) return
      await FileManager.deleteFiles(painting.files)
    }

    const prompt = textareaRef.current?.resizableTextArea?.textArea?.value || ''
    updatePaintingState({ prompt })

    if (!replicateProvider.enabled) {
      window.modal.error({
        content: t('error.provider_disabled'),
        centered: true
      })
      return
    }

    if (!replicateProvider.apiKey) {
      window.modal.error({
        content: t('error.no_api_key'),
        centered: true
      })
      return
    }

    if (!painting.model || !painting.prompt) {
      return
    }

    const controller = new AbortController()
    setAbortController(controller)
    setIsLoading(true)
    dispatch(setGenerating(true))

    try {
      // Parse image size from aspectRatio
      const [width, height] = (painting.aspectRatio || '1024x1024').split('x').map(Number)

      // Get the model ID and version
      const modelId = getModelId(painting.model || '')
      const modelVersion = getModelVersion(painting.model || '')

      // Prepare the request parameters
      const params: any = {
        version: modelVersion,
        input: {
          prompt: painting.prompt || '',
          negative_prompt: painting.negativePrompt || '',
          num_outputs: painting.numImages || 1,
          width: width || 1024,
          height: height || 1024
        }
      }

      // Add model-specific parameters
      if (modelId.includes('stability-ai')) {
        // SDXL model parameters
        if (painting.seed) params.input.seed = parseInt(painting.seed)
        params.input.guidance_scale = 7.5 // Default value
        params.input.num_inference_steps = 30 // Default value
      } else if (modelId.includes('lumalabs')) {
        // Luma Photon model parameters
        if (painting.seed) params.input.seed = parseInt(painting.seed)
        params.input.apply_watermark = false
      }

      // Call the Replicate API
      const createResponse = await fetch(`${replicateProvider.apiHost || 'https://api.replicate.com'}/v1/predictions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${replicateProvider.apiKey}`
        },
        body: JSON.stringify(params),
        signal: controller.signal
      })

      if (!createResponse.ok) {
        const errorData = await createResponse.json()
        throw new Error(errorData.error || 'Failed to create prediction')
      }

      const createData = await createResponse.json()
      const predictionId = createData.id

      // Poll for the prediction result
      let imageUrls: string[] = []
      let status = 'starting'
      
      while (status !== 'succeeded' && status !== 'failed' && status !== 'canceled') {
        // Check if the request has been aborted
        if (controller.signal.aborted) {
          // Cancel the prediction
          await fetch(`${replicateProvider.apiHost || 'https://api.replicate.com'}/v1/predictions/${predictionId}/cancel`, {
            method: 'POST',
            headers: {
              'Authorization': `Token ${replicateProvider.apiKey}`
            }
          })
          throw new Error('Request aborted')
        }

        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Get the prediction status
        const statusResponse = await fetch(`${replicateProvider.apiHost || 'https://api.replicate.com'}/v1/predictions/${predictionId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Token ${replicateProvider.apiKey}`
          },
          signal: controller.signal
        })

        if (!statusResponse.ok) {
          const errorData = await statusResponse.json()
          throw new Error(errorData.error || 'Failed to get prediction status')
        }

        const statusData = await statusResponse.json()
        status = statusData.status

        // If the prediction has completed, get the output
        if (status === 'succeeded') {
          // Extract image URLs from the output
          if (Array.isArray(statusData.output)) {
            imageUrls = statusData.output
          } else if (typeof statusData.output === 'string') {
            imageUrls = [statusData.output]
          }
        } else if (status === 'failed') {
          throw new Error(statusData.error || 'Prediction failed')
        }
      }

      if (!imageUrls || imageUrls.length === 0) {
        throw new Error(t('paintings.no_images_generated'))
      }

      // Download the generated images
      const downloadedFiles = await Promise.all(
        imageUrls.map(async (url) => {
          try {
            return await window.api.file.download(url)
          } catch (error) {
            console.error('Failed to download image:', error)
            return null
          }
        })
      )

      const validFiles = downloadedFiles.filter(Boolean)
      await FileManager.addFiles(validFiles)
      updatePaintingState({ files: validFiles, urls: imageUrls })
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        window.modal.error({
          content: getErrorMessage(error),
          centered: true
        })
      }
    } finally {
      setIsLoading(false)
      dispatch(setGenerating(false))
      setAbortController(null)
    }
  }

  const handleRetry = async (painting: PaintingAction) => {
    try {
      // Re-download the images if they exist
      if (painting.urls && painting.urls.length > 0) {
        const downloadedFiles = await Promise.all(
          painting.urls.map(async (url) => {
            try {
              return await window.api.file.download(url)
            } catch (error) {
              console.error('Failed to download image:', error)
              return null
            }
          })
        )

        const validFiles = downloadedFiles.filter(Boolean)
        await FileManager.addFiles(validFiles)
        updatePaintingState({ files: validFiles })
      }
    } catch (error) {
      window.modal.error({
        content: getErrorMessage(error),
        centered: true
      })
    }
  }

  const handleAddPainting = () => {
    const newPainting = getNewPainting()
    addPainting(mode, newPainting)
    setPainting(newPainting)
    setCurrentImageIndex(0)
  }

  const onDeletePainting = (paintingToDelete: PaintingAction) => {
    removePainting(mode, paintingToDelete)
    
    // If the deleted painting is the current one, select another one
    if (painting.id === paintingToDelete.id) {
      const remainingPaintings = filteredPaintings.filter((p) => p.id !== paintingToDelete.id)
      if (remainingPaintings.length > 0) {
        setPainting(remainingPaintings[0])
      } else {
        const newPainting = getNewPainting()
        addPainting(mode, newPainting)
        setPainting(newPainting)
      }
      setCurrentImageIndex(0)
    }
  }

  const translate = async () => {
    if (isTranslating || !painting.prompt) return
    
    setIsTranslating(true)
    try {
      const translatedText = await translateText(painting.prompt || '', 'en')
      updatePaintingState({ prompt: translatedText })
      if (textareaRef.current) {
        textareaRef.current.resizableTextArea.textArea.value = translatedText
      }
    } catch (error) {
      console.error('Translation error:', error)
    } finally {
      setIsTranslating(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === ' ' && autoTranslateWithSpace) {
      setSpaceClickCount((prev) => prev + 1)
      
      if (spaceClickTimer.current) {
        clearTimeout(spaceClickTimer.current)
      }
      
      spaceClickTimer.current = setTimeout(() => {
        if (spaceClickCount === 1) {
          translate()
        }
        setSpaceClickCount(0)
      }, 300)
    }
  }

  const handleProviderChange = (providerId: string) => {
    navigate(`/paintings/${providerId}`)
  }

  // Handle mode change (generate, remix)
  const handleModeChange = (value: string) => {
    const newMode = value as keyof PaintingsState
    setMode(newMode)
    
    // Select the first painting of the new mode or create a new one
    const paintings = persistentData[newMode] || []
    if (paintings.length > 0) {
      setPainting(paintings[0])
    } else {
      const newPainting = getNewPainting()
      addPainting(newMode, newPainting)
      setPainting(newPainting)
    }
    setCurrentImageIndex(0)
  }

  const handleRandomSeed = () => {
    const randomSeed = Math.floor(Math.random() * 1000000).toString()
    updatePaintingState({ seed: randomSeed })
  }

  const handlePrevImage = () => {
    setCurrentImageIndex((prevIndex) => 
      prevIndex > 0 ? prevIndex - 1 : painting.files.length - 1
    )
  }

  const handleNextImage = () => {
    setCurrentImageIndex((prevIndex) => 
      prevIndex < painting.files.length - 1 ? prevIndex + 1 : 0
    )
  }

  // Render configuration items based on the mode
  const renderConfigItem = (item: ConfigItem, index: number) => {
    switch (item.type) {
      case 'title': {
        return (
          <SettingTitle key={index} style={{ marginBottom: 5, marginTop: 15 }}>
            {t(item.title!)}
            {item.tooltip && (
              <Tooltip title={t(item.tooltip)}>
                <Info size={14} style={{ marginLeft: 5 }} />
              </Tooltip>
            )}
          </SettingTitle>
        )
      }
      case 'select': {
        const selectOptions = typeof item.options === 'function'
          ? item.options(item, painting).map((option) => ({
              ...option,
              label: t(option.label)
            }))
          : item.options?.map((option) => ({
              ...option,
              label: t(option.label)
            }))
        
        return (
          <Select
            key={index}
            style={{ width: '100%', marginBottom: 10 }}
            value={item.key ? painting[item.key] : undefined}
            onChange={(value) => item.key && updatePaintingState({ [item.key]: value })}
            options={selectOptions}
            disabled={typeof item.disabled === 'function' ? item.disabled(item, painting) : item.disabled}
          />
        )
      }
      case 'radio': {
        const radioOptions = typeof item.options === 'function'
          ? item.options(item, painting).map((option) => ({
              ...option,
              label: t(option.label)
            }))
          : item.options?.map((option) => ({
              ...option,
              label: t(option.label)
            }))
        
        return (
          <Radio.Group
            key={index}
            style={{ width: '100%', marginBottom: 10 }}
            value={item.key ? painting[item.key] : undefined}
            onChange={(e) => item.key && updatePaintingState({ [item.key]: e.target.value })}
            disabled={typeof item.disabled === 'function' ? item.disabled(item, painting) : item.disabled}
          >
            {radioOptions!.map((option) => (
              <Radio key={option.value} value={option.value}>
                {option.label}
              </Radio>
            ))}
          </Radio.Group>
        )
      }
      case 'slider': {
        return (
          <SliderContainer key={index}>
            <Slider
              min={item.min}
              max={item.max}
              step={item.step}
              value={item.key ? (painting[item.key] as number) : undefined}
              onChange={(value) => item.key && updatePaintingState({ [item.key]: value })}
              disabled={typeof item.disabled === 'function' ? item.disabled(item, painting) : item.disabled}
            />
            <StyledInputNumber
              min={item.min}
              max={item.max}
              step={item.step}
              value={item.key ? (painting[item.key] as number) : undefined}
              onChange={(value) => item.key && updatePaintingState({ [item.key]: value })}
              disabled={typeof item.disabled === 'function' ? item.disabled(item, painting) : item.disabled}
            />
          </SliderContainer>
        )
      }
      case 'input': {
        if (item.key === 'seed') {
          return (
            <Input
              key={index}
              style={{ width: '100%', marginBottom: 10 }}
              value={painting.seed}
              onChange={(e) => updatePaintingState({ seed: e.target.value })}
              disabled={typeof item.disabled === 'function' ? item.disabled(item, painting) : item.disabled}
              suffix={
                <Button type="text" icon={<RedoOutlined />} onClick={handleRandomSeed} />
              }
            />
          )
        }
        
        return (
          <Input
            key={index}
            style={{ width: '100%', marginBottom: 10 }}
            value={item.key ? (painting[item.key] as string) : ''}
            onChange={(e) => item.key && updatePaintingState({ [item.key]: e.target.value })}
            disabled={typeof item.disabled === 'function' ? item.disabled(item, painting) : item.disabled}
          />
        )
      }
      case 'inputNumber': {
        return (
          <InputNumber
            key={index}
            style={{ width: '100%', marginBottom: 10 }}
            min={item.min}
            max={item.max}
            step={item.step}
            value={item.key ? (painting[item.key] as number) : undefined}
            onChange={(value) => item.key && updatePaintingState({ [item.key]: value })}
            disabled={typeof item.disabled === 'function' ? item.disabled(item, painting) : item.disabled}
          />
        )
      }
      case 'textarea': {
        return (
          <TextArea
            key={index}
            style={{ width: '100%', marginBottom: 10 }}
            value={item.key ? (painting[item.key] as string) : ''}
            onChange={(e) => item.key && updatePaintingState({ [item.key]: e.target.value })}
            disabled={typeof item.disabled === 'function' ? item.disabled(item, painting) : item.disabled}
          />
        )
      }
      case 'switch': {
        return (
          <HStack key={index}>
            <Switch
              checked={item.key ? Boolean(painting[item.key]) : false}
              onChange={(checked) => item.key && updatePaintingState({ [item.key]: checked })}
              disabled={typeof item.disabled === 'function' ? item.disabled(item, painting) : item.disabled}
            />
            <span style={{ marginLeft: 8 }}>{t(item.title!)}</span>
          </HStack>
        )
      }
      case 'image': {
        return (
          <ImageUploadButton
            key={index}
            listType="picture-card"
            showUploadList={false}
            beforeUpload={() => false}
            onChange={async ({ file }) => {
              if (file) {
                const uploadedFile = await window.api.file.upload(file as any)
                setFileMap((prev) => ({ ...prev, [uploadedFile.id]: uploadedFile }))
                updatePaintingState({ [item.key!]: uploadedFile.id })
              }
            }}
            disabled={typeof item.disabled === 'function' ? item.disabled(item, painting) : item.disabled}
          >
            {painting[item.key!] ? (
              <img
                src={fileMap[painting[item.key!] as string]?.path}
                alt="uploaded"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>{t('paintings.upload')}</div>
              </div>
            )}
          </ImageUploadButton>
        )
      }
      default:
        return null
    }
  }

  const onSelectPainting = (newPainting: PaintingAction) => {
    setPainting(newPainting)
    setCurrentImageIndex(0)
  }

  useEffect(() => {
    return () => {
      if (spaceClickTimer.current) {
        clearTimeout(spaceClickTimer.current)
      }
    }
  }, [])

  useEffect(() => {
    const controller = abortController;
    return () => {
      if (controller) {
        controller.abort()
      }
    }
  }, [abortController])

  return (
    <Container>
      <Navbar>
        <NavbarCenter>
          <ProviderTitleContainer>
            <ProviderTitle>{t('provider.replicate')}</ProviderTitle>
            <SettingHelpLink target="_blank" href={replicateProvider.apiHost}>
              <ProviderLogo
                src={getProviderLogo('replicate')}
                alt="Replicate"
                style={{ filter: theme === 'dark' ? 'invert(1)' : 'none' }}
              />
            </SettingHelpLink>
          </ProviderTitleContainer>
        </NavbarCenter>
        <NavbarRight />
      </Navbar>
      <ContentContainer id="content-container">
        <LeftContainer>
          <ProviderTitleContainer>
            <ProviderTitle>{t('provider.replicate')}</ProviderTitle>
            <SettingHelpLink target="_blank" href={replicateProvider.apiHost}>
              <ProviderLogo
                src={getProviderLogo('replicate')}
                alt="Replicate"
                style={{ filter: theme === 'dark' ? 'invert(1)' : 'none' }}
              />
            </SettingHelpLink>
          </ProviderTitleContainer>

          <Select 
            value={providerOptions.length > 0 ? providerOptions[0].value : undefined} 
            onChange={handleProviderChange} 
            style={{ marginBottom: 15 }}
          >
            {providerOptions.map((provider) => (
              <Select.Option value={provider.value} key={provider.value}>
                <SelectOptionContainer>
                  <Avatar size="small" src={getProviderLogo(provider.value)} />
                  <span style={{ marginLeft: 8 }}>{provider.label}</span>
                </SelectOptionContainer>
              </Select.Option>
            ))}
          </Select>

          <Segmented
            block
            options={modeOptions}
            value={mode}
            onChange={handleModeChange}
            style={{ marginBottom: 15 }}
          />

          <Scrollbar style={{ flex: 1, width: '100%' }}>
            {modeConfigs[mode].map(renderConfigItem)}
          </Scrollbar>
        </LeftContainer>

        <MainContainer>
          <Artboard
            painting={painting}
            isLoading={isLoading}
            currentImageIndex={currentImageIndex}
            onPrevImage={handlePrevImage}
            onNextImage={handleNextImage}
            onCancel={() => {
              if (abortController) {
                abortController.abort()
                setAbortController(null)
                setIsLoading(false)
                dispatch(setGenerating(false))
              }
            }}
            retry={handleRetry}
          />

          <InputContainer>
            <Textarea
              ref={textareaRef}
              placeholder={t('paintings.prompt_placeholder')}
              defaultValue={painting.prompt}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <Toolbar>
              <ToolbarMenu>
                <TranslateButton
                  text={painting.prompt}
                  onTranslated={(translatedText) => {
                    updatePaintingState({ prompt: translatedText })
                    if (textareaRef.current) {
                      textareaRef.current.resizableTextArea.textArea.value = translatedText
                    }
                  }}
                  disabled={isLoading}
                  isLoading={isTranslating}
                />
                <SendMessageButton
                  disabled={!replicateProvider.enabled || !replicateProvider.apiKey || isLoading}
                  sendMessage={onGenerate}
                />
              </ToolbarMenu>
            </Toolbar>
          </InputContainer>
        </MainContainer>

        <PaintingsList
          paintings={filteredPaintings}
          selectedPainting={painting}
          onSelectPainting={onSelectPainting}
          onDeletePainting={onDeletePainting}
          onNewPainting={handleAddPainting}
          namespace={mode}
        />
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
  overflow: hidden;
`

const ContentContainer = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`

const LeftContainer = styled.div`
  width: 280px;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 15px;
  border-right: 1px solid var(--color-border);
  overflow: hidden;
`

const MainContainer = styled.div`
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const InputContainer = styled.div`
  padding: 15px;
  border-top: 1px solid var(--color-border);
`

const Textarea = styled(TextArea)`
  resize: none;
  border-radius: 8px;
  margin-bottom: 10px;
  height: 80px !important;
`

const Toolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const ToolbarMenu = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
`

const ProviderTitleContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 15px;
`

const ProviderTitle = styled.h2`
  margin: 0;
  margin-right: 8px;
  font-size: 18px;
`

const ProviderLogo = styled.img`
  width: 24px;
  height: 24px;
`

const SelectOptionContainer = styled.div`
  display: flex;
  align-items: center;
`

const SliderContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  width: 100%;
`

const StyledInputNumber = styled(InputNumber)`
  margin-left: 16px;
  width: 70px !important;
`

const ImageUploadButton = styled(Upload)`
  .ant-upload {
    width: 100%;
    height: 120px;
    margin-bottom: 10px;
  }
`

export default ReplicatePage
