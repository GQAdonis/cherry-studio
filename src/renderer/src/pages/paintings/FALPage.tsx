import { PlusOutlined, RedoOutlined } from '@ant-design/icons'
import { Navbar, NavbarCenter, NavbarRight } from '@renderer/components/app/Navbar'
import { HStack } from '@renderer/components/Layout'
import Scrollbar from '@renderer/components/Scrollbar'
import TranslateButton from '@renderer/components/TranslateButton'
import { isMac } from '@renderer/config/constant'
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
import Artboard from './components/Artboard'
import { type ConfigItem, createModeConfigs } from '../../config/falConfig'
import { DEFAULT_PAINTING } from './config/constants'
import PaintingsList from './components/PaintingsList'

// Use the configs from falConfig
const modeConfigs = createModeConfigs()

// Helper function to get the model ID for FAL.ai API
const getModelId = (model: string): string => {
  const FLUX_MODEL_ID = 'fal-ai/flux'
  const SDXL_MODEL_ID = 'fal-ai/fast-sdxl'
  const LIGHTNING_SDXL_MODEL_ID = 'fal-ai/fast-lightning-sdxl'

  if (model.includes('sdxl')) {
    return model.includes('lightning') ? LIGHTNING_SDXL_MODEL_ID : SDXL_MODEL_ID
  }
  return FLUX_MODEL_ID
}

const FALPage: FC = () => {
  const Options = ['fal']; // Define Options locally since it's not in props
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
  const providerOptions = Options.map((option) => {
    const provider = providers.find((p) => p.id === option)
    return {
      label: t(`provider.${provider?.id}`),
      value: provider?.id || ''
    }
  })
  const dispatch = useAppDispatch()
  const { generating } = useRuntime()
  const navigate = useNavigate()
  const { autoTranslateWithSpace } = useSettings()
  const spaceClickTimer = useRef<NodeJS.Timeout | null>(null)
  const falProvider = providers.find((p) => p.id === 'fal')!

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

    if (!falProvider.enabled) {
      window.modal.error({
        content: t('error.provider_disabled'),
        centered: true
      })
      return
    }

    if (!falProvider.apiKey) {
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
      // Parse image size from aspectRatio or use default
      const imageSize = painting.aspectRatio === 'ASPECT_1_1' ? '512x512' :
                        painting.aspectRatio === 'ASPECT_16_9' ? '1024x576' :
                        painting.aspectRatio === 'ASPECT_9_16' ? '576x1024' : '512x512'

      // Prepare the request parameters
      const params: Record<string, any> = {
        prompt: painting.prompt || '',
        negative_prompt: painting.negativePrompt || '',
        num_images: painting.numImages || 1,
      }

      // Add model-specific parameters
      if (painting.model?.includes('flux')) {
        // FLUX model parameters
        const [width, height] = imageSize.split('x').map(Number)
        params.width = width
        params.height = height
        if (painting.seed) params.seed = parseInt(painting.seed)
      } else {
        // SDXL model parameters
        params.image_size = imageSize
        if (painting.seed) params.seed = parseInt(painting.seed)
        params.guidance_scale = 7.5 // Default value for FAL.ai
        params.num_inference_steps = 30 // Default value for FAL.ai
      }

      // Call the FAL.ai API directly
      const response = await fetch(`${falProvider.apiHost || 'https://api.fal.ai'}/v1/models/${getModelId(painting.model || 'flux')}/text-to-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${falProvider.apiKey}`
        },
        body: JSON.stringify(params),
        signal: controller.signal
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to generate image')
      }

      const data = await response.json()

      // Extract image URLs from the response
      let imageUrls: string[] = []

      if (data.images) {
        // FLUX model response format
        imageUrls = data.images.map((img: any) => img.url)
      } else if (data.image) {
        // Single image response format
        imageUrls = [data.image.url]
      } else if (data.images_urls) {
        // Multiple images response format
        imageUrls = data.images_urls
      } else if (Array.isArray(data)) {
        // Array response format
        imageUrls = data.map((item: any) => item.url || item.image?.url).filter(Boolean)
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
      }, 300) as unknown as NodeJS.Timeout
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
          >
            {painting[item.key!] ? (
              <img
                src={fileMap[painting[item.key!] as string]?.path}
                alt="uploaded"
                style={{ width: '100%' }}
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
    // Clean up the timer when component unmounts
    return () => {
      if (spaceClickTimer.current) {
        clearTimeout(spaceClickTimer.current)
      }
    }
  }, [])

  useEffect(() => {
    // Abort any ongoing requests when component unmounts
    return () => {
      if (abortController) {
        abortController.abort()
      }
    }
  }, [abortController])

  return (
    <Container>
      <Navbar>
        <NavbarCenter>FAL.ai Image Generation</NavbarCenter>
        {isMac && (
          <NavbarRight style={{ justifyContent: 'flex-end' }}>
            <Avatar size="small" src={getProviderLogo('fal')} />
          </NavbarRight>
        )}
      </Navbar>
      <ContentContainer id="content-container">
        <LeftContainer>
          <ProviderTitleContainer>
            <Avatar size="small" src={getProviderLogo('fal')} />
            <ProviderTitle>FAL.ai</ProviderTitle>
            <SettingHelpLink target="_blank" href={falProvider.apiHost}>
              <ProviderLogo
                src={theme === 'dark' ? '/images/fal-logo-dark.png' : '/images/fal-logo-light.png'}
                alt="FAL.ai"
              />
            </SettingHelpLink>
          </ProviderTitleContainer>

          <Select value={providerOptions[0].value} onChange={handleProviderChange} style={{ marginBottom: 15 }}>
            {providerOptions.map((provider) => (
              <Select.Option value={provider.value} key={provider.value}>
                <SelectOptionContainer>
                  <Avatar size="small" src={getProviderLogo(provider.value || '')} />
                  <span style={{ marginLeft: 8 }}>{provider.label}</span>
                </SelectOptionContainer>
              </Select.Option>
            ))}
          </Select>

          <Segmented
            block
            options={modeOptions}
            value={mode}
            onChange={(value) => handleModeChange(value as string)}
            style={{ marginBottom: 15 }}
          />

          <Scrollbar style={{ flex: 1 }}>
            {modeConfigs[mode]?.map(renderConfigItem)}
          </Scrollbar>
        </LeftContainer>

        <MainContainer>
          <ModeTitle>{t(`paintings.mode.${mode}`)}</ModeTitle>
          <Artboard
            painting={painting}
            isLoading={isLoading}
            currentImageIndex={currentImageIndex}
            onPrevImage={() => setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : painting.files.length - 1))}
            onNextImage={() => setCurrentImageIndex((prev) => (prev < painting.files.length - 1 ? prev + 1 : 0))}
            onCancel={() => {
              if (abortController) {
                abortController.abort()
                setIsLoading(false)
                dispatch(setGenerating(false))
                setAbortController(null)
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
            />
            <Toolbar>
              <ToolbarMenu>
                <TranslateButton
                  text={painting.prompt}
                  isLoading={isTranslating}
                  style={{ marginRight: 8 }}
                  onTranslated={(text) => {
                    updatePaintingState({ prompt: text })
                    if (textareaRef.current) {
                      textareaRef.current.resizableTextArea.textArea.value = text
                    }
                  }}
                />
                <SendMessageButton
                  disabled={isLoading || generating}
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
  height: 100vh;
  background-color: var(--color-background);
`

const ContentContainer = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`

const LeftContainer = styled.div`
  width: 280px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--color-border);
`

const MainContainer = styled.div`
  flex: 1;
  padding: 15px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const ProviderTitleContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 15px;
`

const ProviderTitle = styled.h2`
  margin: 0 0 0 8px;
  font-size: 16px;
  flex: 1;
`

const ProviderLogo = styled.img`
  height: 20px;
`

const SelectOptionContainer = styled.div`
  display: flex;
  align-items: center;
`

const ModeTitle = styled.h3`
  margin: 0 0 15px 0;
  font-size: 16px;
`

const InputContainer = styled.div`
  margin-top: 15px;
`

const Textarea = styled(TextArea)`
  width: 100%;
  resize: none;
  border-radius: 8px;
  padding: 10px;
  min-height: 80px;
`

const Toolbar = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
`

const ToolbarMenu = styled.div`
  display: flex;
  align-items: center;
`

const SliderContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 10px;
`

const StyledInputNumber = styled(InputNumber)`
  margin-left: 10px;
  width: 70px;
`

const ImageUploadButton = styled(Upload)`
  .ant-upload {
    width: 100%;
    height: 120px;
  }
`

export default FALPage
