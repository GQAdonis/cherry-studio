import Doc2xLogo from '@renderer/assets/images/ocr/doc2x.png'
import MinerULogo from '@renderer/assets/images/ocr/mineru.jpg'
import MistralLogo from '@renderer/assets/images/providers/mistral.png'
<<<<<<< HEAD
import UnstructuredLogo from '@renderer/assets/images/providers/unstructured_logo.png'
=======
import PaddleocrLogo from '@renderer/assets/images/providers/paddleocr.png'
>>>>>>> upstream/main
import type { PreprocessProviderId } from '@renderer/types'

export function getPreprocessProviderLogo(providerId: PreprocessProviderId) {
  switch (providerId) {
    case 'doc2x':
      return Doc2xLogo
    case 'mistral':
      return MistralLogo
    case 'mineru':
      return MinerULogo
    case 'open-mineru':
      return MinerULogo
<<<<<<< HEAD
    case 'unstructured':
      return UnstructuredLogo

=======
    case 'paddleocr':
      return PaddleocrLogo
>>>>>>> upstream/main
    default:
      return undefined
  }
}

type PreprocessProviderConfig = { websites: { official: string; apiKey: string } }

export const PREPROCESS_PROVIDER_CONFIG: Record<PreprocessProviderId, PreprocessProviderConfig> = {
  doc2x: {
    websites: {
      official: 'https://doc2x.noedgeai.com',
      apiKey: 'https://open.noedgeai.com/apiKeys'
    }
  },
  mistral: {
    websites: {
      official: 'https://mistral.ai',
      apiKey: 'https://mistral.ai/api-keys'
    }
  },
  mineru: {
    websites: {
      official: 'https://mineru.net/',
      apiKey: 'https://mineru.net/apiManage'
    }
  },
  'open-mineru': {
    websites: {
      official: 'https://github.com/opendatalab/MinerU/',
      apiKey: 'https://github.com/opendatalab/MinerU/'
    }
  },
<<<<<<< HEAD
  unstructured: {
    websites: {
      official: 'https://unstructured.io',
      apiKey: 'https://unstructured.io/api-key-hosted'
=======
  paddleocr: {
    websites: {
      official: 'https://aistudio.baidu.com/paddleocr/',
      apiKey: 'https://aistudio.baidu.com/paddleocr/'
>>>>>>> upstream/main
    }
  }
}
