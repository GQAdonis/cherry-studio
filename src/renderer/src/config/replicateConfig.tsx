import type { PaintingAction, PaintingsState } from '@renderer/types'

// Replicate model options
export const REPLICATE_MODELS = [
  { label: 'paintings.models.sdxl', value: 'stability-ai/sdxl' },
  { label: 'paintings.models.sdxl_turbo', value: 'stability-ai/sdxl-turbo' },
  { label: 'paintings.models.luma_photon', value: 'lumalabs/luma-photon' }
]

// Image size options
export const IMAGE_SIZES = [
  { label: '512x512', value: '512x512' },
  { label: '768x768', value: '768x768' },
  { label: '1024x1024', value: '1024x1024' },
  { label: '512x768', value: '512x768' },
  { label: '768x512', value: '768x512' },
  { label: '1024x768', value: '1024x768' },
  { label: '768x1024', value: '768x1024' }
]

// Default values for Replicate image generation
export const DEFAULT_REPLICATE_PAINTING = {
  id: 'replicate_1',
  files: [],
  urls: [],
  model: 'stability-ai/sdxl',
  prompt: '',
  negativePrompt: '',
  aspectRatio: '1024x1024',
  seed: '',
  numImages: 1
} as PaintingAction

// Custom properties for Replicate that are not in PaintingAction
export interface ReplicateCustomProperties {
  guidanceScale: number;
  numInferenceSteps: number;
}

// Configuration item type definition
export type ConfigItem = {
  type:
    | 'select'
    | 'radio'
    | 'slider'
    | 'input'
    | 'switch'
    | 'inputNumber'
    | 'textarea'
    | 'title'
    | 'description'
    | 'image'
  key?: keyof PaintingAction | 'commonModel'
  title?: string
  tooltip?: string
  options?:
    | Array<{ label: string; value: string | number; icon?: string }>
    | ((
        config: ConfigItem,
        painting: Partial<PaintingAction>
      ) => Array<{ label: string; value: string | number; icon?: string }>)
  min?: number
  max?: number
  step?: number
  suffix?: React.ReactNode
  content?: string
  disabled?: boolean | ((config: ConfigItem, painting: Partial<PaintingAction>) => boolean)
  initialValue?: string | number
  required?: boolean
}

export type ReplicateMode = keyof PaintingsState

// Create configuration items for different modes
export const createModeConfigs = (): Record<ReplicateMode, ConfigItem[]> => {
  return {
    paintings: [],
    generate: [
      { type: 'title', title: 'paintings.model', tooltip: 'paintings.generate.model_tip' },
      {
        type: 'select',
        key: 'model',
        options: REPLICATE_MODELS
      },
      { type: 'title', title: 'paintings.image_size', tooltip: 'paintings.generate.image_size_tip' },
      {
        type: 'select',
        key: 'aspectRatio',
        options: IMAGE_SIZES,
        initialValue: '1024x1024'
      },
      {
        type: 'title',
        title: 'paintings.number_images',
        tooltip: 'paintings.generate.number_images_tip'
      },
      {
        type: 'slider',
        key: 'numImages',
        min: 1,
        max: 4
      },
      {
        type: 'title',
        title: 'paintings.guidance_scale',
        tooltip: 'paintings.generate.guidance_scale_tip'
      },
      {
        type: 'slider',
        key: 'guidanceScale' as any,
        min: 1,
        max: 20,
        step: 0.1,
        initialValue: 7.5
      },
      {
        type: 'title',
        title: 'paintings.inference_steps',
        tooltip: 'paintings.generate.inference_steps_tip'
      },
      {
        type: 'slider',
        key: 'numInferenceSteps' as any,
        min: 10,
        max: 50,
        step: 1,
        initialValue: 30
      },
      {
        type: 'title',
        title: 'paintings.seed',
        tooltip: 'paintings.generate.seed_tip'
      },
      {
        type: 'input',
        key: 'seed'
      },
      {
        type: 'title',
        title: 'paintings.negative_prompt',
        tooltip: 'paintings.generate.negative_prompt_tip'
      },
      {
        type: 'textarea',
        key: 'negativePrompt'
      }
    ],
    remix: [
      { type: 'title', title: 'paintings.remix.image_file' },
      {
        type: 'image',
        key: 'imageFile'
      },
      { type: 'title', title: 'paintings.model', tooltip: 'paintings.remix.model_tip' },
      {
        type: 'select',
        key: 'model',
        options: REPLICATE_MODELS
      },
      { type: 'title', title: 'paintings.image_size', tooltip: 'paintings.remix.image_size_tip' },
      {
        type: 'select',
        key: 'aspectRatio',
        options: IMAGE_SIZES,
        initialValue: '1024x1024'
      },
      {
        type: 'title',
        title: 'paintings.number_images',
        tooltip: 'paintings.remix.number_images_tip'
      },
      {
        type: 'slider',
        key: 'numImages',
        min: 1,
        max: 4
      },
      {
        type: 'title',
        title: 'paintings.guidance_scale',
        tooltip: 'paintings.remix.guidance_scale_tip'
      },
      {
        type: 'slider',
        key: 'guidanceScale' as any,
        min: 1,
        max: 20,
        step: 0.1,
        initialValue: 7.5
      },
      {
        type: 'title',
        title: 'paintings.inference_steps',
        tooltip: 'paintings.remix.inference_steps_tip'
      },
      {
        type: 'slider',
        key: 'numInferenceSteps' as any,
        min: 10,
        max: 50,
        step: 1,
        initialValue: 30
      },
      {
        type: 'title',
        title: 'paintings.seed',
        tooltip: 'paintings.remix.seed_tip'
      },
      {
        type: 'input',
        key: 'seed'
      },
      {
        type: 'title',
        title: 'paintings.negative_prompt',
        tooltip: 'paintings.remix.negative_prompt_tip'
      },
      {
        type: 'textarea',
        key: 'negativePrompt'
      }
    ],
    edit: [],
    upscale: [],
    DMXAPIPaintings: []
  }
}