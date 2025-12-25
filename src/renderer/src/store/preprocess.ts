import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import { getDefaultEnabledMimeTypes } from '@renderer/config/unstructuredMimeTypes'

import type { PreprocessProvider } from '@renderer/types'

export interface PreprocessState {
  providers: PreprocessProvider[]
  defaultProvider: string
}

const initialState: PreprocessState = {
  providers: [
    {
      id: 'mineru',
      name: 'MinerU',
      apiKey: '',
      apiHost: 'https://mineru.net'
    },
    {
      id: 'doc2x',
      name: 'Doc2x',
      apiKey: '',
      apiHost: 'https://v2.doc2x.noedgeai.com'
    },
    {
      id: 'mistral',
      name: 'Mistral',
      model: 'mistral-ocr-latest',
      apiKey: '',
      apiHost: 'https://api.mistral.ai'
    },
    {
      id: 'open-mineru',
      name: 'Open MinerU',
      apiKey: '',
      apiHost: ''
    },
    {
      id: 'unstructured',
      name: 'Unstructured.io',
      apiKey: '',
      apiHost: 'https://api.unstructuredapp.io/general/v0/general',
      options: {
        strategy: 'auto',
        chunkingStrategy: 'by_title',
        splitPdfPage: true,
        splitPdfConcurrencyLevel: 5,
        enableChatTool: false,
        enabledMimeTypes: getDefaultEnabledMimeTypes()
      }

    }
  ],
  defaultProvider: 'mineru'
}

export const defaultPreprocessProviders = initialState.providers

const preprocessSlice = createSlice({
  name: 'preprocess',
  initialState,
  reducers: {
    setDefaultPreprocessProvider(state, action: PayloadAction<string>) {
      state.defaultProvider = action.payload
    },
    setPreprocessProviders(state, action: PayloadAction<PreprocessProvider[]>) {
      state.providers = action.payload
    },
    updatePreprocessProviders(state, action: PayloadAction<PreprocessProvider[]>) {
      state.providers = action.payload
    },
    updatePreprocessProvider(state, action: PayloadAction<Partial<PreprocessProvider>>) {
      const index = state.providers.findIndex((provider) => provider.id === action.payload.id)
      if (index !== -1) {
        Object.assign(state.providers[index], action.payload)
      }
    }
  }
})

export const {
  updatePreprocessProviders,
  updatePreprocessProvider,
  setDefaultPreprocessProvider,
  setPreprocessProviders
} = preprocessSlice.actions

export default preprocessSlice.reducer
